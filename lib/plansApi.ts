import { supabaseAdmin, supabase } from './supabase';

// Кэш для списка файлов (обновляется каждые 5 минут)
let filesCache: { files: any[], timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export interface ApartmentPlan {
  apartmentNumber: string;
  planUrl: string;
  fileName: string;
  planSourceApartment: string;
  isTypical: boolean;
  typicalGroup?: string;
}

/**
 * Определяет тип квартиры и соответствующий план (как в веб-версии)
 */
const getApartmentTypeAndPlan = (apartmentNumber: string) => {
  // Проверяем, является ли квартира из корпуса У
  if (apartmentNumber.startsWith('У')) {
    // Для корпуса У используем номер квартиры без префикса "У"
    // В Storage файлы имеют префикс "U" (латинская буква)
    const apartmentNum = apartmentNumber.substring(1); // Убираем префикс "У"
    return {
      type: 'buildingU',
      planApartment: apartmentNum, // Используем номер без префикса для поиска файла
      isTypical: false,
      buildingId: 'U'
    };
  }
  
  // Полный список всех квартир корпуса Т
  const allApartments = [
    // Этаж 1
    '101',
    // Этаж 2
    '201', '202', '203',
    // Этаж 3
    '301', '302', '303',
    // Этаж 4
    '401', '402', '403', '404',
    // Этаж 5
    '501', '502', '503', '504',
    // Этаж 6
    '601', '602', '603', '604',
    // Этаж 7
    '701', '702', '703', '704',
    // Этаж 8
    '801', '802', '803', '804',
    // Этаж 9
    '901', '902', '903', '904',
    // Этаж 10
    '1001', '1002', '1003', '1004',
    // Этаж 11
    '1101', '1102', '1103', '1104',
    // Этаж 12
    '1201', '1202', '1203', '1204',
    // Этаж 13
    '1301', '1302',
    // Этаж 14
    '1401'
  ];
  
  if (!allApartments.includes(apartmentNumber)) {
    return {
      type: 'unknown',
      planApartment: apartmentNumber,
      isTypical: false,
      buildingId: 'T'
    };
  }
  
  // ИСКЛЮЧЕНИЯ: Для этих квартир нет планов, сразу используем типовой
  const apartmentsWithoutPlans = ['302', '303'];
  
  if (apartmentsWithoutPlans.includes(apartmentNumber)) {
    const typicalPlanMap: { [key: string]: string } = {
      '2': '402', // Т302 использует план 402
      '3': '603', // Т303 использует план 603
    };
    const lastDigit = apartmentNumber.slice(-1);
    const planApartment = typicalPlanMap[lastDigit];
    
    return {
      type: 'typical',
      planApartment,
      isTypical: true,
      typicalGroup: lastDigit,
      buildingId: 'T'
    };
  }
  
  // Для всех остальных квартир сначала пытаемся использовать план конкретной квартиры
  // Если его нет в Storage, fallback на типовой будет в loadApartmentPlan
  return {
    type: 'individual',
    planApartment: apartmentNumber, // Используем номер самой квартиры
    isTypical: false,
    buildingId: 'T'
  };
};

/**
 * Загружает план квартиры из Supabase Storage
 */
export const loadApartmentPlan = async (apartmentNumber: string): Promise<ApartmentPlan | null> => {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`🏠 Загружаем план для квартиры: ${apartmentNumber} (попытка ${retryCount + 1}/${maxRetries})`);
      
      // Определяем тип квартиры ДО загрузки файлов
      const { type, planApartment, isTypical, typicalGroup, buildingId } = getApartmentTypeAndPlan(apartmentNumber);
      console.log(`📋 Квартира ${apartmentNumber}:`, { type, planApartment, isTypical, typicalGroup, buildingId });
      
      // Используем кэш, если он актуален
      let allFilesData: any[] | null = null;
      const now = Date.now();
      
      if (filesCache && (now - filesCache.timestamp) < CACHE_DURATION) {
        console.log('📦 Используем кэшированный список файлов');
        allFilesData = filesCache.files;
      } else {
        // Загружаем файлы из Storage
        const { data, error: allFilesError } = await supabaseAdmin.storage
          .from('architectural-plans')
          .list('', { 
            limit: 150, // Оптимальный баланс между скоростью и покрытием
            sortBy: { column: 'name', order: 'asc' }
          });

        if (allFilesError) {
          console.error(`❌ Ошибка получения файлов из Storage (попытка ${retryCount + 1}):`, {
            error: allFilesError,
            message: allFilesError.message || 'Unknown error',
            name: allFilesError.name || 'Unknown',
            statusCode: (allFilesError as any).statusCode
          });
          
          // Если это ошибка сети или таймаут, пробуем еще раз
          if (retryCount < maxRetries - 1 && (
            allFilesError.message?.includes('Network') ||
            allFilesError.message?.includes('Aborted') ||
            allFilesError.message?.includes('Timeout') ||
            allFilesError.name === 'StorageUnknownError'
          )) {
            retryCount++;
            const delay = 1000 * retryCount; // Экспоненциальная задержка
            console.log(`⏳ Повтор через ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return null;
        }
        
        if (!data || data.length === 0) {
          console.warn('⚠️ Storage пуст или файлы не найдены');
          return null;
        }
        
        // Обновляем кэш
        filesCache = { files: data, timestamp: now };
        allFilesData = data;
      }

      console.log('🔍 Файлы для поиска:', allFilesData.length, 'файлов');
      
      let planFiles: any[] = [];
      const prefix = buildingId === 'U' ? 'U' : 'T';
      const searchPattern = `${prefix}${planApartment}`;
      
      // Оптимизированный поиск: сначала проверяем начало имени файла перед regex
      if (isTypical) {
        console.log(`🔍 Ищем типовой план для ${apartmentNumber}: ${searchPattern}`);
        planFiles = allFilesData.filter(file => {
          const fileName = file.name;
          // Быстрая проверка начала имени перед regex
          if (!fileName.startsWith(prefix)) return false;
          const planMatch = fileName.match(new RegExp(`^${prefix}(\\d+)`));
          if (planMatch) {
            return planMatch[1] === planApartment;
          }
          return false;
        });
      } else {
        // Сначала ищем план для конкретной квартиры
        console.log(`🔍 Ищем план для конкретной квартиры ${apartmentNumber}: ${searchPattern}`);
        planFiles = allFilesData.filter(file => {
          const fileName = file.name;
          // Быстрая проверка начала имени перед regex
          if (!fileName.startsWith(prefix)) return false;
          const planMatch = fileName.match(new RegExp(`^${prefix}(\\d+)`));
          if (planMatch) {
            return planMatch[1] === planApartment;
          }
          return false;
        });
        
        // Если план для конкретной квартиры не найден, используем типовой как fallback
        if (planFiles.length === 0 && buildingId === 'T') {
          console.log(`⚠️ План для квартиры ${apartmentNumber} не найден, используем типовой как fallback`);
          
          const typicalPlanMap: { [key: string]: string } = {
            '1': '403',
            '2': '402',
            '3': '603',
            '4': '804'
          };
          const lastDigit = apartmentNumber.slice(-1);
          const fallbackPlanApartment = typicalPlanMap[lastDigit];
          
          if (fallbackPlanApartment) {
            const fallbackPattern = `T${fallbackPlanApartment}`;
            planFiles = allFilesData.filter(file => {
              const fileName = file.name;
              if (!fileName.startsWith('T')) return false;
              const planMatch = fileName.match(/^T(\d+)/);
              if (planMatch) {
                return planMatch[1] === fallbackPlanApartment;
              }
              return false;
            });
            
            console.log(`🔍 Поиск типового плана T${fallbackPlanApartment}:`, planFiles.length, 'файлов');
          }
        }
      }
      
      console.log(`📋 Файлы для плана квартиры ${apartmentNumber}:`, planFiles.length, 'файлов');
      if (planFiles.length > 0) {
        console.log('📋 Найденные файлы:', planFiles.map(f => f.name));
      }
      
      // Берем первый найденный файл (PDF или любой другой формат)
      const pdfFile = planFiles.find(file => 
        file.name.toLowerCase().endsWith('.pdf') || 
        !file.name.match(/\.(pdf|jpg|jpeg|png|gif)$/i)
      ) || planFiles[0];
      
      if (pdfFile) {
        // Используем обычный клиент для получения публичного URL (как в веб-версии)
        const { data: urlData } = supabase.storage
          .from('architectural-plans')
          .getPublicUrl(pdfFile.name);
        
        console.log(`✅ Найден план: ${pdfFile.name}`);
        console.log(`✅ Публичный URL: ${urlData.publicUrl}`);
        
        return {
          apartmentNumber,
          planUrl: urlData.publicUrl,
          fileName: pdfFile.name,
          planSourceApartment: planApartment,
          isTypical: isTypical || false,
          typicalGroup: typicalGroup
        };
      }

      console.log(`❌ PDF план не найден для квартиры ${apartmentNumber} (источник: ${planApartment})`);
      console.log(`🔍 Всего файлов в Storage: ${allFilesData.length}`);
      console.log(`🔍 Файлы с T${planApartment}:`, planFiles.map(f => f.name));
      console.log(`🔍 Первые 10 файлов в Storage:`, allFilesData.slice(0, 10).map(f => f.name));
      return null;
    } catch (error: any) {
      console.error(`❌ Ошибка загрузки плана квартиры (попытка ${retryCount + 1}):`, {
        error,
        message: error?.message || 'Unknown error',
        name: error?.name || 'Unknown',
        stack: error?.stack
      });
      
      if (retryCount < maxRetries - 1) {
        retryCount++;
        const delay = 1000 * retryCount;
        console.log(`⏳ Повтор через ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return null;
    }
  }
  
  return null;
};

/**
 * Получает список всех доступных квартир корпуса Т
 */
export const getAllApartments = (): string[] => {
  return [
    // Этаж 1
    '101',
    // Этаж 2
    '201', '202', '203',
    // Этаж 3
    '301', '302', '303',
    // Этаж 4
    '401', '402', '403', '404',
    // Этаж 5
    '501', '502', '503', '504',
    // Этаж 6
    '601', '602', '603', '604',
    // Этаж 7
    '701', '702', '703', '704',
    // Этаж 8
    '801', '802', '803', '804',
    // Этаж 9
    '901', '902', '903', '904',
    // Этаж 10
    '1001', '1002', '1003', '1004',
    // Этаж 11
    '1101', '1102', '1103', '1104',
    // Этаж 12
    '1201', '1202', '1203', '1204',
    // Этаж 13
    '1301', '1302',
    // Этаж 14
    '1401'
  ];
};

/**
 * Загружает список квартир корпуса У из Supabase Storage
 * Анализирует файлы с префиксом U и возвращает список с префиксом У (кириллица)
 */
export const loadBuildingUApartments = async (): Promise<string[]> => {
  try {
    console.log('🔍 Загрузка квартир корпуса У из Storage...');
    
    // Получаем все файлы из Storage
    const { data: allFilesData, error: allFilesError } = await supabaseAdmin.storage
      .from('architectural-plans')
      .list('', {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (allFilesError) {
      console.error('❌ Ошибка получения файлов из Storage:', allFilesError);
      return [];
    }

    if (!allFilesData || allFilesData.length === 0) {
      console.warn('⚠️ Storage пуст или файлы не найдены');
      return [];
    }

    console.log('🔍 Все файлы из Storage:', allFilesData.length, 'файлов');

    // Фильтруем файлы корпуса У (с префиксом U)
    const buildingUFiles = allFilesData.filter(file => {
      const fileName = file.name;
      // Ищем файлы с префиксом U и цифрами (например, U501, U502)
      return /^U\d+/.test(fileName);
    });

    console.log('🏢 Найдено файлов корпуса У:', buildingUFiles.length);
    console.log('🏢 Файлы корпуса У:', buildingUFiles.map(f => f.name));

    // Извлекаем номера квартир из имен файлов
    const apartments: string[] = [];
    buildingUFiles.forEach(file => {
      const match = file.name.match(/U(\d+)/);
      if (match) {
        const apartmentNum = match[1];
        // Добавляем префикс "У" (кириллица) к номеру квартиры
        apartments.push(`У${apartmentNum}`);
      }
    });

    // Убираем дубликаты и сортируем
    const uniqueApartments = [...new Set(apartments)].sort();
    
    console.log('✅ Загружены квартиры корпуса У:', uniqueApartments);
    
    return uniqueApartments;
  } catch (error) {
    console.error('❌ Ошибка загрузки квартир корпуса У:', error);
    return [];
  }
};

/**
 * Очищает кэш списка файлов (можно вызвать при необходимости)
 */
export const clearPlansCache = () => {
  filesCache = null;
  console.log('🗑️ Кэш списка файлов очищен');
};

/**
 * Получает список всех доступных квартир корпуса У
 * @deprecated Используйте loadBuildingUApartments() для загрузки из базы данных
 */
export const getBuildingUApartments = (): string[] => {
  // Возвращаем пустой массив, так как теперь загружаем из базы
  return [];
};
