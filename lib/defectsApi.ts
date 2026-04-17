import { supabase, supabaseAdmin } from './supabase';
import { Defect } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { cachedFetch } from './offlineCache';

/**
 * Преобразование данных из Supabase в формат Defect
 */
const mapStatusFromDb = (status?: string | null): Defect['status'] => {
  const s = (status || '').trim();
  if (!s) return 'open';
  if (s === 'active') return 'open';
  if (s === 'fixed') return 'resolved';
  if (s === 'in_progress') return 'in-progress';
  if (s === 'in-progress') return 'in-progress';
  return s as any;
};

const mapStatusToDb = (status?: Defect['status'] | string | null): string | undefined => {
  const s = (status || '').trim();
  if (!s) return undefined;
  if (s === 'open') return 'active';
  if (s === 'resolved') return 'fixed';
  if (s === 'in-progress') return 'in_progress';
  return s;
};

const mapToDefect = (data: any): Defect => {
  // Просто используем photo_url как есть, если это валидный URL
  let photoUrl: string | undefined = undefined;
  if (data.photo_url) {
    const url = data.photo_url.trim();
    
    // Исправляем только дубликаты пути
    if (url.includes('defect-photos/defect-photos/')) {
      photoUrl = url.replace(/\/defect-photos\/defect-photos\//g, '/defect-photos/');
    } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      photoUrl = url;
    }
  }
  
  const defect: Defect = {
    id: data.id,
    projectId: data.project_id || '',
    title: data.title || data.name || '',
    description: data.description || '',
    location: data.location || data.apartment_id || '',
    severity: data.severity || 'medium',
    status: mapStatusFromDb(data.status),
    reportedBy: data.reported_by || data.created_by || '',
    reportedDate: data.created_at || data.reported_date || new Date().toISOString(),
    createdById: data.created_by || data.user_id || undefined,
    createdByName: data.created_by_name || undefined,
    assignedToId: data.assigned_to_id || undefined,
    assignedToName: data.assigned_to_name || data.assigned_to || undefined,
    assignedTo: data.assigned_to || data.assignee || data.assigned || undefined,
    dueDate: data.due_date || undefined,
    photoUrl: photoUrl,
    x_coord: data.x_coord !== undefined && data.x_coord !== null ? Number(data.x_coord) : undefined,
    y_coord: data.y_coord !== undefined && data.y_coord !== null ? Number(data.y_coord) : undefined,
  };
  
  // Логируем для отладки
  if (data.photo_url) {
    console.log('📸 Дефект с фото:', { 
      id: defect.id, 
      originalPhotoUrl: data.photo_url,
      normalizedPhotoUrl: defect.photoUrl 
    });
  }
  
  return defect;
};

/**
 * Получить все дефекты
 * Используем supabaseAdmin для доступа ко всем дефектам (общий раздел)
 */
export const getAllDefects = async (limit?: number): Promise<Defect[]> => {
  const effectiveLimit = limit || 100;
  return cachedFetch<Defect[]>(
    `defects:all:${effectiveLimit}`,
    async () => {
      const { data, error } = await supabaseAdmin
        .from('defects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(effectiveLimit);
      if (error) {
        console.error('Ошибка получения дефектов:', error);
        throw error;
      }
      console.log('✅ getAllDefects: загружено дефектов:', data?.length || 0);
      return (data || []).map(mapToDefect);
    },
    { fallback: [] }
  );
};

/**
 * Получить дефект по ID
 */
export const getDefectById = async (id: string): Promise<Defect | null> => {
  return cachedFetch<Defect | null>(
    `defects:byId:${id}`,
    async () => {
      const { data, error } = await supabase
        .from('defects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (!data) return null;
      return mapToDefect(data);
    },
    { fallback: null }
  );
};

/**
 * Получить список публичных URL всех фото дефекта из Storage.
 * Храним дополнительные фото в папке: defect-photos/{defectId}/
 */
export const listDefectPhotoUrls = async (defectId: string): Promise<string[]> => {
  try {
    const prefix = String(defectId).replace(/^\/+|\/+$/g, '');
    const { data: files, error } = await supabaseAdmin.storage
      .from('defect-photos')
      .list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.warn('⚠️ listDefectPhotoUrls: ошибка list:', error.message);
      return [];
    }

    const result: string[] = [];
    for (const f of files || []) {
      if (!f?.name || f.name.endsWith('/')) continue;
      const path = `${prefix}/${f.name}`;
      const { data: urlData } = supabase.storage.from('defect-photos').getPublicUrl(path);
      if (urlData?.publicUrl) result.push(urlData.publicUrl);
    }

    return result;
  } catch (e: any) {
    console.warn('⚠️ listDefectPhotoUrls: ошибка:', e?.message || e);
    return [];
  }
};

/**
 * Получить дефекты по проекту
 */
export const getDefectsByProject = async (projectId: string): Promise<Defect[]> => {
  return cachedFetch<Defect[]>(
    `defects:byProject:${projectId}`,
    async () => {
      const { data, error } = await supabase
        .from('defects')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapToDefect);
    },
    { fallback: [] }
  );
};

/**
 * Получить дефекты по квартире (apartment_id)
 * Используем supabaseAdmin для доступа ко всем дефектам
 */
export const getDefectsByApartment = async (apartmentId: string): Promise<Defect[]> => {
  return cachedFetch<Defect[]>(
    `defects:byApartment:${apartmentId}`,
    () => getDefectsByApartmentImpl(apartmentId),
    { fallback: [] }
  );
};

const getDefectsByApartmentImpl = async (apartmentId: string): Promise<Defect[]> => {
  try {
    console.log('🔍 Поиск дефектов по apartment_id:', apartmentId);
    
    // Извлекаем номер без префикса для поиска
    let numberPart = apartmentId;
    let prefix = '';
    
    if (apartmentId.startsWith('Т') || apartmentId.startsWith('T')) {
      prefix = apartmentId.substring(0, 1);
      numberPart = apartmentId.substring(1);
    } else if (apartmentId.startsWith('У') || apartmentId.startsWith('U')) {
      prefix = apartmentId.substring(0, 1);
      numberPart = apartmentId.substring(1);
    }
    
    console.log('🔍 Разбор apartment_id:', { apartmentId, prefix, numberPart });
    
    // Список вариантов для поиска
    const searchVariants = [
      apartmentId, // Оригинальный формат
    ];
    
    // Добавляем варианты с разными префиксами
    if (prefix) {
      if (prefix === 'Т' || prefix === 'T') {
        searchVariants.push('T' + numberPart);
        searchVariants.push('Т' + numberPart);
        searchVariants.push(numberPart); // Без префикса
      } else if (prefix === 'У' || prefix === 'U') {
        searchVariants.push('U' + numberPart);
        searchVariants.push('У' + numberPart);
        searchVariants.push(numberPart); // Без префикса
      }
    } else {
      // Если нет префикса, пробуем добавить
      searchVariants.push('T' + numberPart);
      searchVariants.push('Т' + numberPart);
      searchVariants.push('U' + numberPart);
      searchVariants.push('У' + numberPart);
    }
    
    // Убираем дубликаты
    const uniqueVariants = [...new Set(searchVariants)];
    console.log('🔍 Варианты для поиска:', uniqueVariants);
    
    // Пробуем найти дефекты по каждому варианту
    let allDefects: any[] = [];
    let lastError = null;
    
    for (const variant of uniqueVariants) {
      // Поддержка нескольких дефектов в одной квартире:
      // apartment_id может быть:
      // - "802" (старый формат)
      // - "802|<timestamp>" (новый формат)
      // - "802-<timestamp>" (мог быть создан в прошлых версиях)
      const orFilter = [
        `apartment_id.eq.${variant}`,
        `apartment_id.like.${variant}|%`,
        `apartment_id.like.${variant}-%`,
      ].join(',');

      const { data, error } = await supabaseAdmin
        .from('defects')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false });

      console.log(`📊 Поиск "${variant}":`, {
        found: data?.length || 0,
        error: error?.message || null,
      });

      if (data && data.length > 0) {
        allDefects = [...allDefects, ...data];
        console.log(`✅ Найдено ${data.length} дефектов для "${variant}"`);
      }

      if (error) {
        lastError = error;
      }
    }
    
    // Убираем дубликаты по id
    const uniqueDefects = allDefects.filter((defect, index, self) => 
      index === self.findIndex(d => d.id === defect.id)
    );
    
    console.log(`✅ Всего найдено уникальных дефектов: ${uniqueDefects.length}`);
    
    if (uniqueDefects.length === 0 && lastError) {
      console.error('❌ Ошибка получения дефектов по квартире:', lastError);
    }
    
    const defects = uniqueDefects.map(mapToDefect);
    
    // Логируем примеры apartment_id для отладки
    if (uniqueDefects.length > 0) {
      console.log('📋 Примеры apartment_id из найденных дефектов:', 
        uniqueDefects.slice(0, 5).map(d => d.apartment_id)
      );
    } else {
      // Если ничего не нашли, проверим какие apartment_id вообще есть в базе
      const { data: sampleData } = await supabaseAdmin
        .from('defects')
        .select('apartment_id')
        .limit(10);
      
      if (sampleData && sampleData.length > 0) {
        console.log('📋 Примеры apartment_id в базе данных:', 
          sampleData.map(d => d.apartment_id)
        );
      }
    }
    
    return defects;
  } catch (error) {
    console.error('❌ Ошибка в getDefectsByApartment:', error);
    return [];
  }
};

/**
 * Получить дефекты по статусу
 * Используем supabaseAdmin для доступа ко всем дефектам
 */
export const getDefectsByStatus = async (status: string): Promise<Defect[]> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('defects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения дефектов по статусу:', error);
      throw error;
    }

    return (data || []).map(mapToDefect);
  } catch (error) {
    console.error('Ошибка в getDefectsByStatus:', error);
    return [];
  }
};

/**
 * Получить активные дефекты
 * Используем supabaseAdmin для доступа ко всем дефектам
 */
export const getActiveDefects = async (): Promise<Defect[]> => {
  return cachedFetch<Defect[]>(
    'defects:active',
    async () => {
      const { data, error } = await supabaseAdmin
        .from('defects')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapToDefect);
    },
    { fallback: [] }
  );
};

export interface DefectInput {
  projectId?: string;
  title: string;
  description?: string;
  location?: string;
  severity: Defect['severity'];
  status?: Defect['status'];
  assignedToId?: string;
  assignedToName?: string;
  assignedTo?: string;
  dueDate?: string;
  x_coord?: number; // Координата X на плане в процентах (0-100)
  y_coord?: number; // Координата Y на плане в процентах (0-100)
}

export interface DefectUpdate {
  projectId?: string;
  title?: string;
  description?: string;
  location?: string;
  severity?: Defect['severity'];
  status?: Defect['status'];
  assignedToId?: string;
  assignedToName?: string;
  assignedTo?: string;
  dueDate?: string;
  photo_url?: string;
}

export const updateDefectAsAdmin = async (id: string, updates: DefectUpdate): Promise<Defect | null> => {
  try {
    const updateData: any = {};

    if (updates.projectId !== undefined) updateData.project_id = updates.projectId;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.severity !== undefined) updateData.severity = updates.severity;
    if (updates.status !== undefined) {
      updateData.status = mapStatusToDb(updates.status);
    }
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.assignedToId !== undefined) updateData.assigned_to_id = updates.assignedToId;
    if (updates.assignedToName !== undefined) updateData.assigned_to_name = updates.assignedToName;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.photo_url !== undefined) updateData.photo_url = updates.photo_url;
    if ((updates as any).x_coord !== undefined) updateData.x_coord = (updates as any).x_coord;
    if ((updates as any).y_coord !== undefined) updateData.y_coord = (updates as any).y_coord;
    if ((updates as any).apartment_id !== undefined) updateData.apartment_id = (updates as any).apartment_id;

    const tryUpdate = async (payload: any) => {
      return supabaseAdmin.from('defects').update(payload).eq('id', id).select().single();
    };

    let { data, error } = await tryUpdate(updateData);

    if (
      error &&
      updateData.assigned_to !== undefined &&
      ((error as any).code === '42703' || /could not find the 'assigned_to' column/i.test(error.message) || /column .*assigned_to.* does not exist/i.test(error.message))
    ) {
      const retryUpdateData = { ...updateData };
      delete retryUpdateData.assigned_to;
      const retry = await tryUpdate(retryUpdateData);
      data = retry.data;
      error = retry.error;
    }

    if (
      error &&
      (updateData.assigned_to_id !== undefined || updateData.assigned_to_name !== undefined) &&
      (
        (error as any).code === '42703' ||
        /could not find the 'assigned_to_id' column/i.test(error.message) ||
        /column .*assigned_to_id.* does not exist/i.test(error.message) ||
        /could not find the 'assigned_to_name' column/i.test(error.message) ||
        /column .*assigned_to_name.* does not exist/i.test(error.message)
      )
    ) {
      const retryUpdateData = { ...updateData };
      delete retryUpdateData.assigned_to_id;
      delete retryUpdateData.assigned_to_name;
      const retry = await tryUpdate(retryUpdateData);
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return data ? mapToDefect(data) : null;
  } catch (error) {
    console.error('❌ Ошибка updateDefectAsAdmin:', error);
    return null;
  }
};

/**
 * Создать новый дефект
 */
export const createDefect = async (defect: DefectInput): Promise<Defect | null> => {
  try {
    // Валидация обязательных полей
    if (!defect.title || !defect.title.trim()) {
      throw new Error('Название дефекта обязательно');
    }

    // Определяем номер квартиры/локацию
    const locationValue = defect.location?.trim() || defect.projectId || 'mobile-default';
    // apartment_id должен быть строкой и не может быть пустым
    const apartmentId = locationValue;
    
    // Подготавливаем данные в формате SupabaseDefect (точно как в веб-версии)
    // Координаты берутся из defect.x_coord и defect.y_coord, если они переданы
    // photo_url включается сразу, если передан в defect.photo_url
    const insertData: any = {
      apartment_id: String(apartmentId), // Может быть уникальным в БД
      title: defect.title.trim(), // Обязательное поле
      status: mapStatusToDb(defect.status || 'open') || 'active', // Обязательное поле
      x_coord: defect.x_coord !== undefined && defect.x_coord !== null ? Number(defect.x_coord) : 50.0, // Координата X в процентах (0-100)
      y_coord: defect.y_coord !== undefined && defect.y_coord !== null ? Number(defect.y_coord) : 50.0, // Координата Y в процентах (0-100)
      description: defect.description?.trim() || null, // Опциональное поле
      assigned_to_id: defect.assignedToId ? String(defect.assignedToId) : null,
      assigned_to_name: defect.assignedToName && defect.assignedToName.trim() ? defect.assignedToName.trim() : null,
      assigned_to: defect.assignedTo && defect.assignedTo.trim() ? defect.assignedTo.trim() : (defect.assignedToName && defect.assignedToName.trim() ? defect.assignedToName.trim() : null),
      photo_url: (defect as any).photo_url || null, // Включаем photo_url если передан
    };

    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData.session?.user?.id;
    if (authUserId) {
      insertData.created_by = authUserId;
      insertData.user_id = authUserId;
    }

    // Примечание: в текущей схеме БД нет колонки `location` (см. ошибку PostgREST schema cache),
    // поэтому не отправляем её вообще.
    if (defect.projectId && defect.projectId.trim()) {
      insertData.project_id = defect.projectId.trim();
    }
    
    console.log('📸 photo_url в insertData:', insertData.photo_url);
    
    console.log('📍 Сохранение координат при создании дефекта:', {
      x_coord: insertData.x_coord,
      y_coord: insertData.y_coord,
      apartment_id: insertData.apartment_id
    });

    console.log('📝 Создание дефекта с данными:', JSON.stringify(insertData, null, 2));
    console.log('📝 Типы данных:', {
      apartment_id: typeof insertData.apartment_id,
      title: typeof insertData.title,
      status: typeof insertData.status,
      x_coord: typeof insertData.x_coord,
      y_coord: typeof insertData.y_coord,
    });

    const tryInsert = async (payload: any) => {
      return supabaseAdmin
        .from('defects')
        .insert([payload])
        .select()
        .single();
    };

    // Используем admin клиент для создания дефектов (как в веб-версии для задач)
    let { data, error } = await tryInsert(insertData);

    // Если в БД нет колонки project_id — делаем retry без неё.
    if (error && ((error as any).code === '42703' || /column .*project_id.* does not exist/i.test(error.message))) {
      const retryInsertData = { ...insertData };
      delete retryInsertData.project_id;
      console.warn('⚠️ Column "project_id" does not exist, retrying insert without it...');
      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    if (
      error &&
      (
        (error as any).code === '42703' ||
        /column .*created_by.* does not exist/i.test(error.message) ||
        /could not find the 'created_by' column/i.test(error.message)
      )
    ) {
      const retryInsertData = { ...insertData };
      delete retryInsertData.created_by;
      console.warn('⚠️ Column "created_by" does not exist, retrying insert without it...');
      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    if (
      error &&
      (
        (error as any).code === '42703' ||
        /column .*user_id.* does not exist/i.test(error.message) ||
        /could not find the 'user_id' column/i.test(error.message)
      )
    ) {
      const retryInsertData = { ...insertData };
      delete retryInsertData.user_id;
      console.warn('⚠️ Column "user_id" does not exist, retrying insert without it...');
      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    // Если в БД нет колонки assigned_to — делаем retry без неё.
    if (error && ((error as any).code === '42703' || /could not find the 'assigned_to' column/i.test(error.message) || /column .*assigned_to.* does not exist/i.test(error.message))) {
      const retryInsertData = { ...insertData };
      delete retryInsertData.assigned_to;
      console.warn('⚠️ Column "assigned_to" does not exist, retrying insert without it...');
      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    // Если в БД нет новых колонок assigned_to_id/assigned_to_name — делаем retry без них.
    if (
      error &&
      (
        (error as any).code === '42703' ||
        /could not find the 'assigned_to_id' column/i.test(error.message) ||
        /column .*assigned_to_id.* does not exist/i.test(error.message) ||
        /could not find the 'assigned_to_name' column/i.test(error.message) ||
        /column .*assigned_to_name.* does not exist/i.test(error.message)
      )
    ) {
      const retryInsertData = { ...insertData };
      delete retryInsertData.assigned_to_id;
      delete retryInsertData.assigned_to_name;
      console.warn('⚠️ Column "assigned_to_id/assigned_to_name" does not exist, retrying insert without them...');
      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    // Если в БД apartment_id уникальный, второй дефект в ту же квартиру упадёт с 23505.
    // В этом случае делаем retry: apartment_id делаем уникальным.
    if (error && (error as any).code === '23505') {
      const retryInsertData = {
        ...insertData,
        apartment_id: `${String(apartmentId)}|${Date.now()}`,
      };

      console.warn('⚠️ apartment_id unique violation, retrying insert with unique apartment_id...', {
        originalApartmentId: insertData.apartment_id,
        retryApartmentId: retryInsertData.apartment_id,
      });

      const retry = await tryInsert(retryInsertData);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('Ошибка создания дефекта:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('Данные, которые пытались вставить:', insertData);
      throw error;
    }

    console.log('✅ Дефект успешно создан:', data);
    console.log('📸 photo_url в созданном дефекте:', data?.photo_url);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'B',
        message: 'createDefect completed',
        data: {defectId: data?.id, photo_url: data?.photo_url, insertDataPhotoUrl: insertData.photo_url},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:286'
      })
    }).catch(() => {});
    // #endregion
    
    const mappedDefect = data ? mapToDefect(data) : null;
    console.log('📸 photoUrl в маппированном дефекте:', mappedDefect?.photoUrl);
    return mappedDefect;
  } catch (error: any) {
    console.error('Ошибка в createDefect:', error);
    if (error?.message) {
      console.error('Сообщение об ошибке:', error.message);
    }
    if (error?.details || error?.hint || error?.code) {
      console.error('Детали ошибки:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
    }
    throw error;
  }
};

/**
 * Обновить дефект
 */
export const updateDefect = async (id: string, updates: DefectUpdate): Promise<Defect | null> => {
  try {
    const updateData: any = {};

    if (updates.projectId !== undefined) {
      updateData.project_id = updates.projectId;
    }
    if (updates.title !== undefined) {
      updateData.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.location !== undefined) {
      updateData.location = updates.location;
    }
    if (updates.severity !== undefined) {
      updateData.severity = updates.severity;
    }
    if (updates.status !== undefined) {
      updateData.status = mapStatusToDb(updates.status);
    }
    if (updates.assignedTo !== undefined) {
      updateData.assigned_to = updates.assignedTo;
    }
    if (updates.assignedToId !== undefined) {
      updateData.assigned_to_id = updates.assignedToId;
    }
    if (updates.assignedToName !== undefined) {
      updateData.assigned_to_name = updates.assignedToName;
    }
    if (updates.dueDate !== undefined) {
      updateData.due_date = updates.dueDate;
    }
    if (updates.photo_url !== undefined) {
      updateData.photo_url = updates.photo_url;
      console.log('📸 Обновление photo_url:', updates.photo_url);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          hypothesisId: 'B',
          message: 'updateDefect called with photo_url',
          data: {defectId: id, photo_url: updates.photo_url},
          timestamp: Date.now(),
          sessionId: 'debug-session',
          location: 'defectsApi.ts:331'
        })
      }).catch(() => {});
      // #endregion
    }
    // Поддержка координат и apartment_id для дефектов на плане
    if ((updates as any).x_coord !== undefined) {
      updateData.x_coord = (updates as any).x_coord;
      console.log('📍 Обновление x_coord:', (updates as any).x_coord);
    }
    if ((updates as any).y_coord !== undefined) {
      updateData.y_coord = (updates as any).y_coord;
      console.log('📍 Обновление y_coord:', (updates as any).y_coord);
    }
    if ((updates as any).apartment_id !== undefined) {
      updateData.apartment_id = (updates as any).apartment_id;
      console.log('🏠 Обновление apartment_id:', (updates as any).apartment_id);
    }

    console.log('🔄 Обновление дефекта:', { id, updateData });

    // Используем admin клиент для обновления (как в веб-версии для задач)
    const tryUpdate = async (payload: any) => {
      return supabase
        .from('defects')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
    };

    let { data, error } = await tryUpdate(updateData);

    if (
      error &&
      updateData.assigned_to !== undefined &&
      ((error as any).code === '42703' || /could not find the 'assigned_to' column/i.test(error.message) || /column .*assigned_to.* does not exist/i.test(error.message))
    ) {
      const retryUpdateData = { ...updateData };
      delete retryUpdateData.assigned_to;
      console.warn('⚠️ Column "assigned_to" does not exist, retrying update without it...');
      const retry = await tryUpdate(retryUpdateData);
      data = retry.data;
      error = retry.error;
    }

    if (
      error &&
      (updateData.assigned_to_id !== undefined || updateData.assigned_to_name !== undefined) &&
      (
        (error as any).code === '42703' ||
        /could not find the 'assigned_to_id' column/i.test(error.message) ||
        /column .*assigned_to_id.* does not exist/i.test(error.message) ||
        /could not find the 'assigned_to_name' column/i.test(error.message) ||
        /column .*assigned_to_name.* does not exist/i.test(error.message)
      )
    ) {
      const retryUpdateData = { ...updateData };
      delete retryUpdateData.assigned_to_id;
      delete retryUpdateData.assigned_to_name;
      console.warn('⚠️ Column "assigned_to_id/assigned_to_name" does not exist, retrying update without them...');
      const retry = await tryUpdate(retryUpdateData);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('❌ Ошибка обновления дефекта:', error);
      console.error('Детали ошибки:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Дефект обновлен:', data);
    console.log('📸 photo_url в ответе:', data?.photo_url);
    console.log('📸 Проверка обновления photo_url:', {
      requestedUrl: updates.photo_url,
      savedUrl: data?.photo_url,
      match: updates.photo_url === data?.photo_url
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'B',
        message: 'updateDefect completed',
        data: {
          defectId: id,
          requestedPhotoUrl: updates.photo_url,
          savedPhotoUrl: data?.photo_url,
          match: updates.photo_url === data?.photo_url
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:370'
      })
    }).catch(() => {});
    // #endregion
    
    const mappedDefect = data ? mapToDefect(data) : null;
    console.log('📸 photoUrl в маппированном дефекте:', mappedDefect?.photoUrl);
    
    return mappedDefect;
  } catch (error) {
    console.error('Ошибка в updateDefect:', error);
    return null;
  }
};

/**
 * Удалить дефект
 */
export const deleteDefect = async (id: string): Promise<boolean> => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const authUserId = sessionData.session?.user?.id;
    if (!authUserId) {
      console.error('Ошибка удаления дефекта: пользователь не авторизован');
      return false;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', authUserId)
      .single();

    if (profileError) {
      console.error('Ошибка чтения профиля перед удалением:', profileError);
      return false;
    }

    const role = (profile as any)?.role as string | undefined;
    const isPrivileged = role === 'admin';

    const readDefect = async (columns: string) => {
      return supabase.from('defects').select(columns).eq('id', id).single();
    };

    let row: any = null;
    let readError: any = null;

    ({ data: row, error: readError } = await readDefect('created_by, user_id'));

    if (
      readError &&
      /could not find the 'created_by' column/i.test(readError.message)
    ) {
      ({ data: row, error: readError } = await readDefect('user_id'));
    }

    if (
      readError &&
      /could not find the 'user_id' column/i.test(readError.message)
    ) {
      ({ data: row, error: readError } = await readDefect('created_by'));
    }

    if (
      readError &&
      /could not find the 'created_by' column/i.test(readError.message) &&
      /could not find the 'user_id' column/i.test(readError.message)
    ) {
      row = null;
      readError = null;
    }

    if (readError) {
      console.error('Ошибка чтения дефекта перед удалением:', readError);
      return false;
    }

    const creatorId = row?.created_by || row?.user_id || null;
    if (isPrivileged) {
      // admin/management могут удалять любые дефекты
    } else {
      if (!creatorId) {
        console.error('Ошибка удаления дефекта: недостаточно прав');
        return false;
      }
      if (String(creatorId) !== String(authUserId)) {
        console.error('Ошибка удаления дефекта: недостаточно прав');
        return false;
      }
    }

    const { error } = await supabase.from('defects').delete().eq('id', id);

    if (error) {
      console.error('Ошибка удаления дефекта:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Ошибка в deleteDefect:', error);
    return false;
  }
};

/**
 * Загрузить фото дефекта в Supabase Storage
 * ПРАВИЛЬНАЯ РЕАЛИЗАЦИЯ: base64 -> Uint8Array -> Supabase Storage
 * 
 * Логика работы:
 * 1. Получаем URI файла из expo-image-picker
 * 2. Читаем файл как base64 через expo-file-system
 * 3. Убираем префикс data: если есть
 * 4. Конвертируем base64 в Uint8Array через Buffer
 * 5. Загружаем Uint8Array в Supabase Storage (путь БЕЗ defect-photos/)
 * 6. Получаем публичный URL через getPublicUrl() (не истекает)
 * 7. Возвращаем публичный URL для сохранения в базу данных
 */
export const uploadDefectPhoto = async (
  uri: string,
  defectId: string,
  options?: { folderPrefix?: string }
): Promise<string | null> => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'ALL',
        message: 'uploadDefectPhoto ENTRY',
        data: {defectId, uri: uri.substring(0, 100)},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:496',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    console.log('📸 ========== ЗАГРУЗКА ФОТО ==========');
    console.log('📸 Defect ID:', defectId);
    console.log('📸 File URI:', uri);
    
    // Проверяем, что URI валидный
    if (!uri || uri.trim() === '') {
      throw new Error('URI файла пустой');
    }
    
    // Шаг 1: Читаем файл как base64
    console.log('📸 Шаг 1: Чтение файла как base64...');
    let base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'A',
        message: 'Base64 read result',
        data: {base64Length: base64?.length || 0, hasDataPrefix: base64?.startsWith('data:') || false},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:520',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    // Убираем префикс data:image/...;base64, если есть
    if (base64.startsWith('data:')) {
      base64 = base64.split(';base64,').pop() || base64;
    }
    
    if (!base64 || base64.length === 0) {
      throw new Error('Файл пустой или не удалось прочитать');
    }
    
    console.log('✅ Base64 прочитан, длина:', base64.length, 'символов');
    
    // Шаг 2: Конвертируем base64 в Uint8Array (лучше для Supabase в RN)
    console.log('📸 Шаг 2: Конвертация base64 в Uint8Array...');
    const uint8Array = new Uint8Array(Buffer.from(base64, 'base64'));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'B',
        message: 'Uint8Array created',
        data: {uint8ArrayLength: uint8Array.length, byteLength: uint8Array.byteLength},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:535',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    console.log('✅ Uint8Array создан, размер:', uint8Array.length, 'байт');
    
    if (uint8Array.length === 0) {
      throw new Error('Uint8Array пустой после конвертации');
    }
    
    // Определяем расширение файла из URI
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${defectId}-${Date.now()}.${fileExt}`;
    const prefix = options?.folderPrefix ? String(options.folderPrefix).replace(/^\/+|\/+$/g, '') : '';
    // ВАЖНО: Путь БЕЗ 'defect-photos/' так как bucket уже указан в .from('defect-photos')
    const path = prefix ? `${prefix}/${fileName}` : fileName;
    
    // Определяем MIME type по расширению
    let contentType = 'image/jpeg';
    if (fileExt === 'png') {
      contentType = 'image/png';
    } else if (fileExt === 'gif') {
      contentType = 'image/gif';
    } else if (fileExt === 'webp') {
      contentType = 'image/webp';
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'C',
        message: 'Before upload',
        data: {path, fileName, fileExt, contentType, fileSize: uint8Array.length},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:560',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    console.log('📸 Параметры загрузки:', {
      path,
      fileName,
      fileExt,
      contentType,
      fileSize: uint8Array.length,
      fileSizeKB: Math.round(uint8Array.length / 1024)
    });
    
    // Шаг 3: Загружаем Uint8Array в Supabase Storage
    console.log('📸 Шаг 3: Загрузка Uint8Array в Supabase Storage...');
    const { data, error } = await supabase.storage
      .from('defect-photos')
      .upload(path, uint8Array, {
        contentType: contentType,
        upsert: true, // ВАЖНО: upsert: true чтобы избежать 400 "Asset Already Exists"
      });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'D',
        message: 'Upload result',
        data: {
          hasError: !!error,
          errorMessage: error?.message,
          errorStatus: (error as any)?.statusCode,
          dataPath: data?.path,
          uploadSuccess: !error && !!data
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:580',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    if (error) {
      console.error('❌ Ошибка загрузки в Storage:', error);
      console.error('❌ Детали ошибки:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        name: (error as any).name,
        error: error,
      });
      throw error;
    }
    
    console.log('✅ Файл успешно загружен в Storage!');
    console.log('📸 Путь в Storage:', data?.path);
    
    // Шаг 4: Получаем публичный URL (не истекает, работает для публичных bucket)
    console.log('📸 Шаг 4: Получение публичного URL...');
    const { data: urlData } = supabase.storage
      .from('defect-photos')
      .getPublicUrl(path);
    
    const publicUrl = urlData.publicUrl;
    console.log('✅ Публичный URL получен:', publicUrl);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        hypothesisId: 'ALL',
        message: 'uploadDefectPhoto SUCCESS (public URL)',
        data: {defectId, publicUrl: publicUrl.substring(0, 100)},
        timestamp: Date.now(),
        sessionId: 'debug-session',
        location: 'defectsApi.ts:680',
        runId: 'run1'
      })
    }).catch(() => {});
    // #endregion
    
    return publicUrl;
  } catch (error: any) {
    console.error('❌ ========== ОШИБКА В uploadDefectPhoto ==========');
    console.error('❌ Ошибка:', error);
    if (error?.message) {
      console.error('❌ Сообщение об ошибке:', error.message);
    }
    if (error?.stack) {
      console.error('❌ Stack trace:', error.stack);
    }
    console.error('❌ ================================================');
    return null;
  }
};

/**
 * Проверить и исправить URL фото дефекта
 * Используется для исправления старых дефектов с неправильными URL
 */
export const verifyAndFixDefectPhotoUrl = async (defectId: string, currentPhotoUrl: string): Promise<string | null> => {
  try {
    console.log('🔍 ========== ПРОВЕРКА URL ФОТО ДЕФЕКТА ==========');
    console.log('🔍 Defect ID:', defectId);
    console.log('🔍 Current Photo URL:', currentPhotoUrl);
    
    // Сначала проверяем доступность текущего URL
    console.log('🔍 Проверка доступности текущего URL...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const checkResponse = await fetch(currentPhotoUrl, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log('🔍 Результат проверки URL:', {
        status: checkResponse.status,
        statusText: checkResponse.statusText,
        ok: checkResponse.ok,
        headers: Object.fromEntries(checkResponse.headers.entries())
      });
      
      if (checkResponse.ok) {
        console.log('✅ URL доступен, исправление не требуется');
        return currentPhotoUrl;
      }
      console.warn('⚠️ URL недоступен:', {
        status: checkResponse.status,
        statusText: checkResponse.statusText,
        url: currentPhotoUrl
      });
    } catch (fetchError: any) {
      if (fetchError.name !== 'AbortError') {
        console.warn('⚠️ Ошибка проверки URL:', {
          name: fetchError.name,
          message: fetchError.message,
          url: currentPhotoUrl
        });
      } else {
        console.warn('⚠️ Проверка URL прервана по таймауту');
      }
    }
    
    // Ищем файл в Storage по ID дефекта
    console.log('🔍 Ищем файлы для дефекта в Storage...');
    try {
      // Получаем список ВСЕХ файлов из bucket (без указания папки)
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('defect-photos')
        .list('', {
          limit: 10000,
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (!listError && files && files.length > 0) {
        console.log(`✅ Найдено ${files.length} файлов в Storage`);
        
        // Ищем файл, который содержит ID дефекта в имени (может быть в начале или в середине)
        const defectFiles = files.filter(f => {
          const fileName = f.name.toLowerCase();
          const fileId = (f as any).id?.toLowerCase() || '';
          const searchId = defectId.toLowerCase();
          
          return fileName.includes(searchId) || 
                 fileId.includes(searchId) ||
                 fileName.startsWith(searchId) ||
                 fileName.match(new RegExp(`${searchId}-\\d+`)); // Формат: defectId-timestamp
        });
        
        if (defectFiles.length > 0) {
          console.log(`✅ Найдено ${defectFiles.length} файлов для дефекта:`, defectFiles.map(f => f.name));
          
          // Пробуем каждый найденный файл
          for (const defectFile of defectFiles) {
            // Формируем пути для проверки
            const pathsToTry = [
              defectFile.name, // Просто имя файла
              `defect-photos/${defectFile.name}`, // С префиксом папки
            ];
            
            for (const filePath of pathsToTry) {
              try {
                // Пробуем публичный URL (основной метод, не истекает)
                const { data: urlData } = supabase.storage
                  .from('defect-photos')
                  .getPublicUrl(filePath);
                
                let testUrl = urlData.publicUrl;
                // Исправляем дубликаты пути
                if (testUrl.includes('defect-photos/defect-photos/')) {
                  testUrl = testUrl.replace(/\/defect-photos\/defect-photos\//g, '/defect-photos/');
                }
                
                console.log('🔄 Проверяем файл через getPublicUrl:', { filePath, url: testUrl });
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const testResponse = await fetch(testUrl, { method: 'HEAD', signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (testResponse.ok) {
                  console.log('✅ Найден рабочий URL:', testUrl);
                  return testUrl;
                } else {
                  console.warn('⚠️ URL недоступен:', testResponse.status);
                }
              } catch (testError: any) {
                if (testError.name !== 'AbortError') {
                  console.warn('⚠️ Ошибка проверки файла:', testError.message);
                }
              }
            }
          }
        } else {
          console.warn(`⚠️ Файл для дефекта ${defectId} не найден в Storage`);
          console.log('📋 Примеры файлов в Storage:', files.slice(0, 10).map(f => ({
            name: f.name,
            id: (f as any).id
          })));
        }
      } else {
        console.warn('⚠️ Файлы не найдены в Storage:', listError);
      }
    } catch (storageError: any) {
      console.warn('⚠️ Ошибка поиска файлов в Storage:', storageError.message);
    }
    
    // Пробуем исправить URL из текущего, убрав дубликаты пути
    if (currentPhotoUrl.includes('defect-photos/defect-photos/')) {
      const fixedUrl = currentPhotoUrl.replace(/\/defect-photos\/defect-photos\//g, '/defect-photos/');
      console.log('🔄 Пробуем исправленный URL (без дубликата):', fixedUrl);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const testResponse = await fetch(fixedUrl, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        if (testResponse.ok) {
          console.log('✅ Исправленный URL работает!');
          return fixedUrl;
        }
      } catch (error) {
        // Игнорируем ошибку
      }
    }
    
    console.error('❌ Не удалось найти рабочий URL для фото');
    return null;
  } catch (error: any) {
    console.error('❌ Ошибка проверки URL фото:', error.message || error);
    return null;
  }
};
