import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import CachedImage from '../components/CachedImage';
import { prefetchImages } from '../lib/imageCache';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import Header from '../components/Header';
import Card from '../components/Card';
import DefectForm from '../components/DefectForm';
import DefectsOverlay from '../components/DefectsOverlay';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { DefectInput, DefectUpdate } from '../lib/defectsApi';
import { loadApartmentPlan, getAllApartments, ApartmentPlan } from '../lib/plansApi';
import { createDefect, uploadDefectPhoto, updateDefect, getDefectsByApartment } from '../lib/defectsApi';
import { supabaseAdmin } from '../lib/supabase';

interface ApartmentPlanScreenProps {
  navigation: any;
  route: any;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const ApartmentPlanScreen: React.FC<ApartmentPlanScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  
  // Получаем параметры напрямую из route.params при каждом рендере
  const currentBuildingId = route.params?.buildingId || 'T';
  const currentApartments = route.params?.apartments;
  
  // Используем useState для хранения, но обновляем при каждом изменении route.params
  const [buildingId, setBuildingId] = useState<string>(currentBuildingId);
  const [apartments, setApartments] = useState<string[]>(
    currentApartments || getAllApartments()
  );
  
  // Принудительное обновление при изменении route.params
  useEffect(() => {
    console.log('🔄 useEffect: Обновление параметров', {
      routeBuildingId: route.params?.buildingId,
      routeApartmentsCount: route.params?.apartments?.length,
      routeApartments: route.params?.apartments,
      currentBuildingId,
      currentApartments
    });
    
    if (route.params?.buildingId) {
      setBuildingId(route.params.buildingId);
    }
    
    if (route.params?.apartments && Array.isArray(route.params.apartments)) {
      console.log('✅ Обновляем список квартир:', route.params.apartments);
      setApartments(route.params.apartments);
      setSelectedApartment('');
      setPlan(null);
    } else if (!route.params?.apartments && route.params?.buildingId === 'T') {
      // Если параметры не переданы, но это корпус Т, используем дефолтный список
      setApartments(getAllApartments());
    }
  }, [route.params?.buildingId, route.params?.apartments, route.params?.key]);
  
  // useFocusEffect для обновления при фокусе экрана
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 useFocusEffect: Экран получил фокус', {
        buildingId: route.params?.buildingId,
        apartmentsCount: route.params?.apartments?.length,
        apartments: route.params?.apartments
      });
      
      if (route.params?.buildingId) {
        setBuildingId(route.params.buildingId);
      }
      
      if (route.params?.apartments && Array.isArray(route.params.apartments)) {
        console.log('✅ useFocusEffect: Обновляем список квартир:', route.params.apartments);
        setApartments(route.params.apartments);
        setSelectedApartment('');
        setPlan(null);
      }
    }, [route.params])
  );
  
  const [selectedApartment, setSelectedApartment] = useState<string>('');
  const [plan, setPlan] = useState<ApartmentPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [defectCoordinates, setDefectCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [defects, setDefects] = useState<any[]>([]);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [imageLayout, setImageLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Анимационные значения для зума и пана
  const scale = useSharedValue(2.0); // Начальный зум 2x
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastScale = useSharedValue(2.0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  
  // Обычные значения для отображения дефектов (синхронизируются с анимированными)
  const [currentScale, setCurrentScale] = useState(2.0);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  
  const pinchRef = useRef(null);
  const panRef = useRef(null);

  // Загружаем дефекты для квартиры
  const loadDefectsForApartment = async (apartmentNumber: string) => {
    try {
      // Получаем полные данные из базы для доступа к x_coord и y_coord
      const { data, error } = await supabaseAdmin
        .from('defects')
        .select('*')
        .eq('apartment_id', apartmentNumber)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Ошибка загрузки дефектов:', error);
        setDefects([]);
        return;
      }
      
      console.log(`📋 Загружено ${data?.length || 0} дефектов для квартиры ${apartmentNumber}`);
      if (data && data.length > 0) {
        console.log('📋 Дефекты с координатами:', data.map((d: any) => ({ 
          id: d.id, 
          x_coord: d.x_coord, 
          y_coord: d.y_coord,
          apartment_id: d.apartment_id
        })));
      }
      setDefects(data || []);
      console.log('📋 Состояние defects обновлено, количество:', data?.length || 0);

      // Префетч всех фото дефектов, чтобы они открывались и в оффлайне.
      try {
        const photoUrls = (data || [])
          .map((d: any) => d?.photo_url)
          .filter((u: any): u is string => !!u && typeof u === 'string');
        if (photoUrls.length) {
          void prefetchImages(photoUrls);
        }
      } catch {
        // ignore
      }
    } catch (error) {
      console.error('Ошибка загрузки дефектов:', error);
      setDefects([]);
    }
  };

  const handleSelectApartment = async (apartmentNumber: string) => {
    setSelectedApartment(apartmentNumber);
    setLoading(true);
    setPlan(null);
    
    try {
      const apartmentPlan = await loadApartmentPlan(apartmentNumber);
      if (apartmentPlan) {
        setPlan(apartmentPlan);
        // Префетч превью плана, чтобы он открывался в оффлайне.
        if (apartmentPlan.previewUrl) {
          void prefetchImages([apartmentPlan.previewUrl]);
        }
        setIsSelectingLocation(!!apartmentPlan.previewUrl);
        if (!apartmentPlan.previewUrl && apartmentPlan.documentUrl) {
          Alert.alert('План доступен только в PDF', 'Для отметки дефектов требуется превью (PNG/JPG). Сейчас можно открыть PDF.');
        }
        // Загружаем дефекты для этой квартиры
        await loadDefectsForApartment(apartmentNumber);
        // Сбрасываем трансформации
        scale.value = 2.0;
        translateX.value = 0;
        translateY.value = 0;
        lastScale.value = 2.0;
        lastTranslateX.value = 0;
        lastTranslateY.value = 0;
        setCurrentScale(2.0);
        setCurrentTranslateX(0);
        setCurrentTranslateY(0);
      } else {
        Alert.alert('Ошибка', `План для квартиры ${apartmentNumber} не найден в базе данных`);
      }
    } catch (error) {
      console.error('Ошибка загрузки плана:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить план квартиры');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик pinch жеста
  const onPinchGestureEvent = (event: any) => {
    const newScale = Math.max(0.5, Math.min(5, lastScale.value * event.nativeEvent.scale));
    scale.value = newScale;
    setCurrentScale(newScale); // Синхронизируем для дефектов
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.value = scale.value;
      setCurrentScale(scale.value);
    }
  };

  // Обработчик pan жеста
  const onPanGestureEvent = (event: any) => {
    const newTranslateX = lastTranslateX.value + event.nativeEvent.translationX;
    const newTranslateY = lastTranslateY.value + event.nativeEvent.translationY;
    translateX.value = newTranslateX;
    translateY.value = newTranslateY;
    setCurrentTranslateX(newTranslateX); // Синхронизируем для дефектов
    setCurrentTranslateY(newTranslateY);
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
      setCurrentTranslateX(translateX.value);
      setCurrentTranslateY(translateY.value);
    }
  };

  // Обработчик клика на изображение
  const handleImagePress = (event: any) => {
    if (plan && !plan.previewUrl) {
      return;
    }
    if (!isSelectingLocation || !imageLayout || !imageSize) {
      console.warn('⚠️ Не могу обработать клик:', { 
        isSelectingLocation, 
        hasImageLayout: !!imageLayout,
        hasImageSize: !!imageSize 
      });
      return;
    }

    const { locationX, locationY } = event.nativeEvent;

    // Получаем размеры контейнера и изображения
    const containerWidth = imageLayout.width;
    const containerHeight = imageLayout.height;
    const imageWidth = imageSize.width;
    const imageHeight = imageSize.height;

    // Вычисляем соотношение сторон для contentFit="contain"
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imageWidth / imageHeight;

    let actualImageWidth: number;
    let actualImageHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    // Вычисляем реальный размер изображения внутри контейнера с учетом contentFit="contain"
    if (imageAspect > containerAspect) {
      // Изображение шире контейнера - заполняет по ширине
      actualImageWidth = containerWidth;
      actualImageHeight = containerWidth / imageAspect;
      offsetY = (containerHeight - actualImageHeight) / 2;
    } else {
      // Изображение выше контейнера - заполняет по высоте
      actualImageHeight = containerHeight;
      actualImageWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - actualImageWidth) / 2;
    }

    // Проверяем, что клик был внутри изображения (не в пустых областях)
    // Используем небольшую погрешность (0.5 пикселя) для учета ошибок округления
    const EPSILON = 0.5;
    const relativeX = locationX - offsetX;
    const relativeY = locationY - offsetY;

    if (relativeX < -EPSILON || relativeX > actualImageWidth + EPSILON || 
        relativeY < -EPSILON || relativeY > actualImageHeight + EPSILON) {
      console.warn('⚠️ Клик вне области изображения:', {
        locationX,
        locationY,
        offsetX,
        offsetY,
        actualImageWidth,
        actualImageHeight,
        relativeX,
        relativeY,
        containerWidth,
        containerHeight,
        imageWidth,
        imageHeight
      });
      return;
    }

    // Ограничиваем координаты границами изображения (на случай небольших погрешностей)
    const clampedRelativeX = Math.max(0, Math.min(actualImageWidth, relativeX));
    const clampedRelativeY = Math.max(0, Math.min(actualImageHeight, relativeY));

    // Вычисляем проценты относительно реального размера изображения
    const x = (clampedRelativeX / actualImageWidth) * 100;
    const y = (clampedRelativeY / actualImageHeight) * 100;

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    console.log('📍 Координаты клика (с учетом contentFit="contain"):', {
      touchCoords: { x: locationX, y: locationY },
      containerSize: { width: containerWidth, height: containerHeight },
      imageSize: { width: imageWidth, height: imageHeight },
      actualImageSize: { width: actualImageWidth, height: actualImageHeight },
      offset: { x: offsetX, y: offsetY },
      relativeCoords: { x: relativeX, y: relativeY },
      clampedRelativeCoords: { x: clampedRelativeX, y: clampedRelativeY },
      percent: { x: clampedX.toFixed(2), y: clampedY.toFixed(2) },
      aspectRatios: { 
        container: (containerWidth / containerHeight).toFixed(4), 
        image: (imageWidth / imageHeight).toFixed(4)
      }
    });

    setDefectCoordinates({
      x: clampedX,
      y: clampedY,
    });
    setIsSelectingLocation(false);
    setShowDefectForm(true);
  };

  // Обработчик загрузки изображения
  const handleImageLoad = (event: any) => {
    // expo-image возвращает размер в event.source или event.source.width/height
    let width: number | undefined;
    let height: number | undefined;
    
    if (event.source) {
      width = event.source.width || event.source.naturalWidth;
      height = event.source.height || event.source.naturalHeight;
    }
    
    // ВАЖНО: НЕ используем imageLayout как fallback, так как это размер контейнера, а не изображения!
    // Если размер не получен, лучше подождать или не устанавливать imageSize
    if (!width || !height) {
      console.warn('⚠️ Не удалось получить размер изображения из onLoad:', event);
      return;
    }
    
    setImageSize({ width, height });
    console.log('📐 Размер изображения загружен:', { width, height, source: event.source });
  };

  // Обработчик layout контейнера изображения
  const handleImageLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // onLayout на TouchableOpacity возвращает размер контейнера
    // Это стабильные размеры, независимо от трансформаций Animated.View
    setImageLayout({ x, y, width, height });
    console.log('📐 Layout контейнера изображения (TouchableOpacity):', { x, y, width, height });
  };

  const handleCreateDefect = async (defectData: DefectInput | DefectUpdate) => {
    if (!selectedApartment || !defectCoordinates) return;
    
    try {
      console.log('📝 Создание дефекта на плане:', {
        apartment: selectedApartment,
        coordinates: defectCoordinates,
        defectData
      });
      
      // Проверяем, что это DefectInput (для создания нового дефекта)
      if (!('title' in defectData) || !defectData.title) {
        Alert.alert('Ошибка', 'Название дефекта обязательно');
        return;
      }
      
      // Добавляем координаты и apartment_id к данным дефекта (БЕЗ фото - как в веб-версии)
      const defectWithLocation: DefectInput & { x_coord?: number; y_coord?: number } = {
        ...defectData as DefectInput,
        location: selectedApartment,
        projectId: defectData.projectId || '',
        x_coord: defectCoordinates.x,
        y_coord: defectCoordinates.y,
      };
      
      console.log('📝 Создание дефекта с данными:', {
        x_coord: defectCoordinates.x,
        y_coord: defectCoordinates.y,
        apartment: selectedApartment
      });
      
      // Создаем дефект БЕЗ фото (как в веб-версии)
      const result = await createDefect(defectWithLocation);
      
      if (result) {
        console.log('✅ Дефект создан:', result);
        console.log('📍 Координаты в созданном дефекте:', {
          x_coord: result.x_coord,
          y_coord: result.y_coord
        });
        
        const photoUrisFromForm: string[] = (defectData as any).photoUris || ((defectData as any).photoUri ? [(defectData as any).photoUri] : []);
        console.log('📸 Проверка photoUris из формы:', {
          count: photoUrisFromForm.length,
          defectId: result.id,
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            hypothesisId: 'A',
            message: 'ApartmentPlanScreen: checking photoUris after defect creation',
            data: {defectId: result.id, photoCount: photoUrisFromForm.length},
            timestamp: Date.now(),
            sessionId: 'debug-session',
            location: 'ApartmentPlanScreen.tsx:245'
          })
        }).catch(() => {});
        // #endregion
        
        if (photoUrisFromForm.length > 0 && result.id) {
          console.log('📸 Загрузка фото ПОСЛЕ создания дефекта...');
          console.log('📸 Defect ID:', result.id);
          console.log('📸 Photo count:', photoUrisFromForm.length);
          
          try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                hypothesisId: 'A',
                message: 'Starting photo upload after defect creation',
                data: {defectId: result.id, hasPhotoUri: !!(defectData as any).photoUri},
                timestamp: Date.now(),
                sessionId: 'debug-session',
                location: 'ApartmentPlanScreen.tsx:251'
              })
            }).catch(() => {});
            // #endregion
            
            const uploadedUrls: string[] = [];
            for (const uri of photoUrisFromForm) {
              const url = await uploadDefectPhoto(uri, result.id, { folderPrefix: result.id });
              if (url) uploadedUrls.push(url);
            }
            const photoUrl = uploadedUrls[0] || null;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                hypothesisId: 'A',
                message: 'Photo upload result',
                data: {defectId: result.id, photoUrl: photoUrl, uploadSuccess: !!photoUrl},
                timestamp: Date.now(),
                sessionId: 'debug-session',
                location: 'ApartmentPlanScreen.tsx:256'
              })
            }).catch(() => {});
            // #endregion
            
            console.log('📸 URL фото получен:', photoUrl);
            
            if (photoUrl) {
              // Обновляем дефект с URL фото (как в веб-версии)
              console.log('🔄 Обновление дефекта с URL фото:', photoUrl);
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  hypothesisId: 'B',
                  message: 'Updating defect with photo_url',
                  data: {defectId: result.id, photoUrl: photoUrl},
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  location: 'ApartmentPlanScreen.tsx:262'
                })
              }).catch(() => {});
              // #endregion
              
              const updatedDefect = await updateDefect(result.id, { photo_url: photoUrl });
              
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  hypothesisId: 'B',
                  message: 'Defect update result',
                  data: {
                    defectId: result.id,
                    requestedPhotoUrl: photoUrl,
                    savedPhotoUrl: updatedDefect?.photoUrl,
                    match: photoUrl === updatedDefect?.photoUrl
                  },
                  timestamp: Date.now(),
                  sessionId: 'debug-session',
                  location: 'ApartmentPlanScreen.tsx:270'
                })
              }).catch(() => {});
              // #endregion
              
              console.log('✅ Дефект обновлен с фото:', updatedDefect);
              console.log('📸 Проверка photo_url после обновления:', {
                updatedDefectPhotoUrl: updatedDefect?.photoUrl,
                photoUrl: photoUrl,
                match: updatedDefect?.photoUrl === photoUrl
              });
            } else {
              console.warn('⚠️ uploadDefectPhoto вернул null, фото не загружено');
              Alert.alert('Предупреждение', 'Дефект создан, но фото не удалось загрузить');
            }
          } catch (error: any) {
            console.error('❌ Ошибка загрузки фото:', error);
            Alert.alert('Предупреждение', 'Дефект создан, но фото не удалось загрузить');
          }
        }
        
        // Небольшая задержка перед перезагрузкой, чтобы Supabase успел обработать обновление
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Перезагружаем дефекты
        await loadDefectsForApartment(selectedApartment);
        
        Alert.alert('Успех', 'Дефект успешно создан на плане');
        setShowDefectForm(false);
        setDefectCoordinates(null);
        setIsSelectingLocation(true);
        // Обновляем список дефектов
        console.log('🔄 Перезагрузка дефектов после создания...');
        await loadDefectsForApartment(selectedApartment);
        console.log('✅ Дефекты перезагружены');
      } else {
        Alert.alert('Ошибка', 'Не удалось создать дефект');
      }
    } catch (error: any) {
      console.error('❌ Ошибка создания дефекта:', error);
      const message = error?.message ? String(error.message) : 'Не удалось создать дефект';
      Alert.alert('Ошибка', message);
    }
  };

  const handleClosePlan = () => {
    setPlan(null);
    setSelectedApartment('');
    setDefectCoordinates(null);
    setIsSelectingLocation(false);
    setShowDefectForm(false);
    setImageSize(null);
    setImageLayout(null);
  };

  // Стили для анимированного изображения
  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Получаем URL изображения из PDF (конвертируем первую страницу PDF в изображение)
  const getImageUrl = (pdfUrl: string) => {
    // Используем сервис для конвертации PDF в изображение
    // Можно использовать Google Docs Viewer или другой сервис
    // Для начала используем прямой URL PDF, expo-image может его обработать
    return pdfUrl;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <LinearGradient
          colors={[Theme.colors.background, Theme.colors.backgroundDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Header userRole={userRole} title="План квартиры" />
          
          {!plan ? (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
              <Card variant="gradient">
                <Text style={styles.sectionTitle}>Выберите квартиру</Text>
                <Text style={styles.subtitle}>Нажмите на квартиру, чтобы открыть её план и создать дефект</Text>
                
                <View style={styles.apartmentsGrid}>
                  {apartments.length > 0 ? (
                    apartments.map((apartment) => (
                      <TouchableOpacity
                        key={apartment}
                        style={styles.apartmentButton}
                        onPress={() => handleSelectApartment(apartment)}
                      >
                        <Text style={styles.apartmentText}>{apartment}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>Квартиры не найдены</Text>
                  )}
                </View>
                <Text style={styles.debugText}>
                  Отображается: {apartments.length} квартир (корпус {buildingId})
                  {'\n'}route.params.buildingId: {route.params?.buildingId || 'undefined'}
                  {'\n'}route.params.apartments.length: {route.params?.apartments?.length || 'undefined'}
                  {'\n'}Первые 3 квартиры: {apartments.slice(0, 3).join(', ')}
                  {'\n'}Все квартиры: {apartments.join(', ')}
                </Text>
              </Card>
            </ScrollView>
          ) : (
            <View style={styles.planContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Theme.colors.primary} />
                  <Text style={styles.loadingText}>Загрузка плана...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>
                      Квартира {selectedApartment}
                      {plan.isTypical && plan.typicalGroup && (
                        <Text style={styles.planSubtitle}> (Типовая, план из {plan.planSourceApartment})</Text>
                      )}
                    </Text>
                    <TouchableOpacity onPress={handleClosePlan} style={styles.closeButton}>
                      <Ionicons name="close" size={24} color={Theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  {isSelectingLocation && (
                    <View style={styles.instructionBanner}>
                      <Ionicons name="location" size={20} color={Theme.colors.primary} />
                      <Text style={styles.instructionText}>
                        Нажмите на план в месте, где нужно создать дефект. Используйте жесты для масштабирования и перемещения.
                      </Text>
                    </View>
                  )}

                  {!plan.previewUrl && plan.documentUrl && (
                    <View style={styles.instructionBanner}>
                      <Ionicons name="document" size={20} color={Theme.colors.primary} />
                      <Text style={styles.instructionText}>План доступен только в PDF. Отметка дефектов отключена.</Text>
                      <TouchableOpacity
                        onPress={() => Linking.openURL(plan.documentUrl!)}
                        style={[styles.zoomButton, { marginLeft: 12 }]}
                      >
                        <Ionicons name="open-outline" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <View style={styles.planWrapper}>
                    <PanGestureHandler
                      ref={panRef}
                      onGestureEvent={onPanGestureEvent}
                      onHandlerStateChange={onPanHandlerStateChange}
                      minPointers={1}
                      maxPointers={1}
                      avgTouches
                    >
                      <Animated.View style={{ flex: 1 }}>
                        <PinchGestureHandler
                          ref={pinchRef}
                          onGestureEvent={onPinchGestureEvent}
                          onHandlerStateChange={onPinchHandlerStateChange}
                        >
                          <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                            <TouchableOpacity
                              activeOpacity={1}
                              onPress={handleImagePress}
                              onLayout={handleImageLayout}
                              style={styles.imageTouchable}
                            >
                              <CachedImage
                                source={{ uri: getImageUrl(plan.previewUrl || '') }}
                                style={styles.planImage}
                                contentFit="contain"
                                onLoad={handleImageLoad}
                                cachePolicy="memory-disk"
                              />
                            </TouchableOpacity>
                            
                            {/* SVG Overlay с дефектами на плане - внутри того же Animated.View для синхронизации трансформаций */}
                            {(() => {
                              console.log('🔍 Проверка условий отображения DefectsOverlay:', {
                                defectsCount: defects.length,
                                hasImageLayout: !!imageLayout,
                                imageLayout: imageLayout,
                                defects: defects.map((d: any) => ({
                                  id: d.id,
                                  x_coord: d.x_coord,
                                  y_coord: d.y_coord,
                                  title: d.title || d.name
                                }))
                              });
                              return null;
                            })()}
                            {defects.length > 0 && imageLayout && imageSize && (
                              <DefectsOverlay
                                defects={defects}
                                imageLayout={imageLayout}
                                imageSize={imageSize}
                                animatedStyle={{}} // Не применяем трансформации дважды, они уже применены к родителю
                                onDefectPress={(defect) => {
                                  console.log('📍 Клик на дефект:', defect);
                                  const xCoord = defect.x_coord !== undefined && defect.x_coord !== null ? defect.x_coord.toFixed(1) : 'N/A';
                                  const yCoord = defect.y_coord !== undefined && defect.y_coord !== null ? defect.y_coord.toFixed(1) : 'N/A';
                                  Alert.alert(
                                    defect.title || defect.name || 'Дефект',
                                    defect.description || `Координаты: ${xCoord}%, ${yCoord}%`,
                                    [{ text: 'OK' }]
                                  );
                                }}
                                userRole={userRole}
                              />
                            )}
                          </Animated.View>
                        </PinchGestureHandler>
                      </Animated.View>
                    </PanGestureHandler>
                    
                    {/* Кнопки управления зумом */}
                    <View style={styles.zoomControls}>
                      <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => {
                          const newScale = Math.min(5, scale.value * 1.3);
                          scale.value = withSpring(newScale);
                          lastScale.value = newScale;
                          setCurrentScale(newScale);
                        }}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => {
                          const newScale = Math.max(0.5, scale.value / 1.3);
                          scale.value = withSpring(newScale);
                          lastScale.value = newScale;
                          setCurrentScale(newScale);
                        }}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => {
                          scale.value = withSpring(2.0);
                          translateX.value = withSpring(0);
                          translateY.value = withSpring(0);
                          lastScale.value = 2.0;
                          lastTranslateX.value = 0;
                          lastTranslateY.value = 0;
                          setCurrentScale(2.0);
                          setCurrentTranslateX(0);
                          setCurrentTranslateY(0);
                        }}
                      >
                        <Ionicons name="refresh" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
          
          {/* Форма создания дефекта */}
          {defectCoordinates && (
            <DefectForm
              visible={showDefectForm}
              initialData={{
                location: selectedApartment,
                projectId: '',
                x_coord: defectCoordinates.x,
                y_coord: defectCoordinates.y,
              }}
              onSubmit={handleCreateDefect}
              onCancel={() => {
                setShowDefectForm(false);
                setDefectCoordinates(null);
                setIsSelectingLocation(true);
              }}
              onClose={() => {
                setShowDefectForm(false);
                setDefectCoordinates(null);
                setIsSelectingLocation(true);
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
  },
  apartmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  apartmentButton: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  apartmentText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  planContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
    flex: 1,
  },
  planSubtitle: {
    fontSize: 14,
    fontWeight: 'normal',
    color: Theme.colors.textSecondary,
  },
  closeButton: {
    padding: Theme.spacing.xs,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary + '20',
    padding: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  instructionText: {
    fontSize: 14,
    color: Theme.colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  planWrapper: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
    position: 'relative',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
  },
  planImage: {
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    right: Theme.spacing.md,
    bottom: Theme.spacing.md,
    flexDirection: 'column',
    gap: Theme.spacing.xs,
    zIndex: 10,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
  debugText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    padding: Theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  coordinatesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background + '80',
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.xs,
  },
  coordinatesText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  formScrollView: {
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  defectsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  defectMarker: {
    position: 'absolute',
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  defectMarkerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});

export default ApartmentPlanScreen;
