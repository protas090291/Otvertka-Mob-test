import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole, Defect } from '../types';
import { loadApartmentPlan, ApartmentPlan } from '../lib/plansApi';
import { getDefectById, listDefectPhotoUrls, updateDefect, updateDefectAsAdmin, verifyAndFixDefectPhotoUrl } from '../lib/defectsApi';
import DefectsOverlay from '../components/DefectsOverlay';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

interface DefectDetailScreenProps {
  navigation: any;
  route: any;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

const DefectDetailScreen: React.FC<DefectDetailScreenProps> = ({ navigation, route }) => {
  const defectParam: Defect = route.params?.defect;
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const currentUser = route.params?.currentUser;
  const currentUserId = currentUser?.id;
  
  const [defect, setDefect] = useState<Defect>(defectParam);
  const [loading, setLoading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [plan, setPlan] = useState<ApartmentPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [imageLayout, setImageLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [isFixingPhotoUrl, setIsFixingPhotoUrl] = useState(false);

  const isAssignee = !!currentUserId && !!defect?.assignedToId && String(defect.assignedToId) === String(currentUserId);
  
  // Анимационные значения для зума и пана плана
  const scale = useSharedValue(2.0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastScale = useSharedValue(2.0);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  
  const pinchRef = React.useRef(null);
  const panRef = React.useRef(null);

  useEffect(() => {
    // Перезагружаем дефект из базы данных при открытии экрана, чтобы получить актуальные данные (включая фото)
    const loadDefect = async () => {
      if (defectParam?.id) {
        // Сбрасываем состояние ошибки фото при загрузке нового дефекта
        setPhotoError(false);
        setIsFixingPhotoUrl(false);
        
        try {
          const freshDefect = await getDefectById(defectParam.id);
          if (freshDefect) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                hypothesisId: 'C',
                message: 'Defect loaded in DefectDetailScreen',
                data: {defectId: freshDefect.id, hasPhotoUrl: !!freshDefect.photoUrl, photoUrl: freshDefect.photoUrl},
                timestamp: Date.now(),
                sessionId: 'debug-session',
                location: 'DefectDetailScreen.tsx:55'
              })
            }).catch(() => {});
            // #endregion
            
            console.log('✅ Дефект перезагружен:', freshDefect);
            console.log('📸 photoUrl в перезагруженном дефекте:', freshDefect.photoUrl);

            try {
              const urlsFromFolder = await listDefectPhotoUrls(freshDefect.id);
              const merged = [freshDefect.photoUrl, ...urlsFromFolder]
                .filter((u): u is string => !!u && u.trim() !== '')
                .filter((u, idx, arr) => arr.indexOf(u) === idx);
              setPhotoUrls(merged);
            } catch {
              setPhotoUrls(freshDefect.photoUrl ? [freshDefect.photoUrl] : []);
            }
            
            // Проверяем и исправляем URL фото для существующих дефектов
            if (freshDefect.photoUrl) {
              // Пытаемся исправить URL сразу при загрузке дефекта
              setIsFixingPhotoUrl(true);
              try {
                const fixedUrl = await verifyAndFixDefectPhotoUrl(freshDefect.id, freshDefect.photoUrl);
                if (fixedUrl && fixedUrl !== freshDefect.photoUrl) {
                  console.log('🔧 URL фото исправлен:', { old: freshDefect.photoUrl, new: fixedUrl });
                  // Обновляем дефект с исправленным URL в базе данных
                  const updatedDefect = await updateDefectAsAdmin(freshDefect.id, { photo_url: fixedUrl });
                  if (updatedDefect) {
                    setDefect(updatedDefect);
                    setPhotoError(false);
                    console.log('✅ Дефект обновлен с исправленным URL фото');
                  } else {
                    // Если обновление не удалось, используем исправленный URL локально
                    setDefect({ ...freshDefect, photoUrl: fixedUrl });
                    setPhotoError(false);
                  }
                } else if (!fixedUrl) {
                  // Если не удалось исправить URL, помечаем фото как недоступное
                  console.warn('⚠️ Не удалось исправить URL фото');
                  setDefect(freshDefect);
                  setPhotoError(true);
                } else {
                  // URL не изменился, значит он правильный
                  setDefect(freshDefect);
                  setPhotoError(false);
                }
              } catch (error) {
                console.error('❌ Ошибка исправления URL фото:', error);
                setDefect(freshDefect);
                setPhotoError(true);
              } finally {
                setIsFixingPhotoUrl(false);
              }
            } else {
              setDefect(freshDefect);
            }
            
            // Загружаем план после обновления дефекта
            if (freshDefect.location) {
              loadPlanForDefect(freshDefect.location);
            }
          } else {
            // Если не удалось перезагрузить, используем исходные данные
            if (defectParam.location) {
              loadPlanForDefect(defectParam.location);
            }
          }
        } catch (error) {
          console.error('❌ Ошибка перезагрузки дефекта:', error);
          // В случае ошибки используем исходные данные
          if (defectParam.location) {
            loadPlanForDefect(defectParam.location);
          }
        }
      } else if (defectParam && defectParam.location) {
        loadPlanForDefect(defectParam.location);
      }
    };
    
    loadDefect();
  }, [defectParam?.id]);

  const loadPlanForDefect = async (apartmentId: string) => {
    try {
      setLoadingPlan(true);
      const apartmentPlan = await loadApartmentPlan(apartmentId);
      if (apartmentPlan) {
        setPlan(apartmentPlan);
        // Сбрасываем трансформации
        scale.value = 2.0;
        translateX.value = 0;
        translateY.value = 0;
        lastScale.value = 2.0;
        lastTranslateX.value = 0;
        lastTranslateY.value = 0;
      }
    } catch (error) {
      console.error('Ошибка загрузки плана:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  // Обработчики жестов для плана
  const onPinchGestureEvent = (event: any) => {
    const newScale = Math.max(1.0, Math.min(5.0, lastScale.value * event.nativeEvent.scale));
    scale.value = newScale;
  };

  const onPinchHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastScale.value = scale.value;
    }
  };

  const onPanGestureEvent = (event: any) => {
    translateX.value = lastTranslateX.value + event.nativeEvent.translationX;
    translateY.value = lastTranslateY.value + event.nativeEvent.translationY;
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      lastTranslateX.value = translateX.value;
      lastTranslateY.value = translateY.value;
    }
  };

  const handleImageLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setImageLayout({ x, y, width, height });
  };

  const handleImageLoad = (event: any) => {
    let width: number | undefined;
    let height: number | undefined;

    if (event?.source) {
      width = event.source.width || event.source.naturalWidth;
      height = event.source.height || event.source.naturalHeight;
    }

    if (!width || !height) {
      return;
    }

    setImageSize({ width, height });
  };

  const animatedImageStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const getImageUrl = (pdfUrl: string) => {
    return pdfUrl;
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#eab308';
      case 'low':
        return '#10b981';
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'Критичный';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return 'Не указано';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'open':
      case 'active':
        return '#ef4444';
      case 'in-progress':
        return '#3b82f6';
      case 'resolved':
      case 'fixed':
        return '#10b981';
      case 'closed':
        return '#6b7280';
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'open':
      case 'active':
        return 'Открыт';
      case 'in-progress':
        return 'В работе';
      case 'resolved':
      case 'fixed':
        return 'Исправлен';
      case 'closed':
        return 'Закрыт';
      default:
        return 'Не указано';
    }
  };

  if (!defect) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Дефект"
          userRole={userRole}
          onMenuPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Дефект не найден</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Проверяем наличие координат для отображения на плане
  const hasCoordinates = defect.x_coord !== undefined && defect.y_coord !== undefined && 
                         defect.x_coord !== null && defect.y_coord !== null &&
                         typeof defect.x_coord === 'number' && typeof defect.y_coord === 'number';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Детали дефекта"
        userRole={userRole}
        currentUserId={currentUserId}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onMenuPress={() => navigation.goBack()}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Основная информация */}
        <Card variant="gradient" style={styles.mainCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{defect.title}</Text>
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: getSeverityColor(defect.severity) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getSeverityColor(defect.severity) }]}>
                    {getSeverityLabel(defect.severity)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(defect.status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(defect.status) }]}>
                    {getStatusLabel(defect.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {defect.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Описание</Text>
              <Text style={styles.description}>{defect.description}</Text>
            </View>
          )}

          {/* Детали */}
          <View style={styles.detailsSection}>
            {defect.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.detailLabel}>Квартира:</Text>
                <Text style={styles.detailValue}>{defect.location}</Text>
              </View>
            )}
                        {defect.createdByName && (
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.detailLabel}>Создал:</Text>
                <Text style={styles.detailValue}>{defect.createdByName}</Text>
              </View>
            )}

            {defect.reportedDate && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.detailLabel}>Дата создания:</Text>
                <Text style={styles.detailValue}>
                  {new Date(defect.reportedDate).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}

            {defect.assignedTo && (
              <View style={styles.detailRow}>
                <Ionicons name="person-circle-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.detailLabel}>Назначен:</Text>
                <Text style={styles.detailValue}>{defect.assignedToName || defect.assignedTo}</Text>
              </View>
            )}

            {defect.dueDate && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={Theme.colors.primary} />
                <Text style={styles.detailLabel}>Срок исправления:</Text>
                <Text style={styles.detailValue}>
                  {new Date(defect.dueDate).toLocaleDateString('ru-RU')}
                </Text>
              </View>
            )}
          </View>

          {isAssignee ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Изменить статус</Text>
              <View style={styles.statusButtons}>
                {[
                  { label: 'Открыт', value: 'open' },
                  { label: 'В работе', value: 'in-progress' },
                  { label: 'Исправлен', value: 'resolved' },
                  { label: 'Закрыт', value: 'closed' },
                ].map((opt) => {
                  const selected = String(defect.status) === String(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.statusButton, selected ? styles.statusButtonSelected : undefined]}
                      onPress={async () => {
                        try {
                          setLoading(true);
                          const updated = await updateDefect(defect.id, { status: opt.value as any });
                          if (updated) {
                            setDefect(updated);
                          }
                        } catch {
                          Alert.alert('Ошибка', 'Не удалось обновить статус');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.statusButtonText, selected ? styles.statusButtonTextSelected : undefined]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.statusHint}>Вы можете менять только статус этого дефекта.</Text>
            </View>
          ) : null}
        </Card>

        {/* Фото дефекта */}
        {(() => {
          console.log('🔍 Проверка фото дефекта:', {
            hasPhotoUrl: !!defect.photoUrl,
            photoUrl: defect.photoUrl,
            isValidUrl: defect.photoUrl ? (defect.photoUrl.startsWith('http://') || defect.photoUrl.startsWith('https://')) : false
          });
          return null;
        })()}
        {photoUrls.length > 0 && !photoError && (
          <Card variant="gradient" style={styles.photoCard}>
            <Text style={styles.sectionTitle}>Фото дефекта</Text>
            {isFixingPhotoUrl && (
              <View style={{ padding: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Theme.colors.primary} />
                <Text style={{ marginTop: 5, color: Theme.colors.textSecondary, fontSize: 12 }}>
                  Проверка фото...
                </Text>
              </View>
            )}
            <View style={styles.photoContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {photoUrls.map((url) => (
                  <View key={url} style={{ marginRight: 10 }}>
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={styles.defectPhoto}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      transition={200}
                      onError={(error: any) => {
                  console.error('❌ Ошибка загрузки фото в детальном экране:', {
                    error: error?.error || error,
                    url,
                    defectId: defect.id
                  });
                  // Помечаем фото как недоступное и пытаемся исправить URL
                  setPhotoError(true);
                  
                  // Пытаемся исправить URL только если фото не загрузилось
                  if (defect.photoUrl && !isFixingPhotoUrl) {
                    setIsFixingPhotoUrl(true);
                    verifyAndFixDefectPhotoUrl(defect.id, defect.photoUrl)
                      .then((fixedUrl) => {
                        if (fixedUrl && fixedUrl !== defect.photoUrl) {
                          console.log('🔧 URL фото исправлен после ошибки загрузки:', { old: defect.photoUrl, new: fixedUrl });
                          // Обновляем дефект с исправленным URL
                          updateDefectAsAdmin(defect.id, { photo_url: fixedUrl })
                            .then((updatedDefect) => {
                              if (updatedDefect) {
                                // Обновляем дефект с исправленным URL
                                setDefect(updatedDefect);
                                setPhotoError(false);
                                console.log('✅ Дефект обновлен с исправленным URL фото');
                                // Принудительно обновляем компонент Image, чтобы он перезагрузил изображение
                                // Это делается через изменение key или перезагрузку дефекта
                              }
                            })
                            .catch((updateError) => {
                              console.error('❌ Ошибка обновления дефекта:', updateError);
                            })
                            .finally(() => {
                              setIsFixingPhotoUrl(false);
                            });
                        } else {
                          setIsFixingPhotoUrl(false);
                        }
                      })
                      .catch((fixError) => {
                        console.error('❌ Ошибка исправления URL:', fixError);
                        setIsFixingPhotoUrl(false);
                      });
                  }
                }}
                      onLoad={() => {
                        console.log('✅ Фото загружено в детальном экране:', url);
                        setPhotoError(false);
                      }}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </Card>
        )}
        {photoError && defect.photoUrl && (
          <Card variant="gradient" style={styles.photoCard}>
            <Text style={styles.sectionTitle}>Фото дефекта</Text>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="image-outline" size={48} color={Theme.colors.textSecondary} />
              <Text style={{ marginTop: 10, color: Theme.colors.textSecondary, textAlign: 'center' }}>
                Фото недоступно
              </Text>
              <Text style={{ marginTop: 5, color: Theme.colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                Файл не найден в хранилище
              </Text>
            </View>
          </Card>
        )}

        {/* Архитектурный план с отметкой дефекта */}
        {hasCoordinates && defect.location && (
          <Card variant="gradient" style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.sectionTitle}>Расположение на плане</Text>
              {loadingPlan && (
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              )}
            </View>
            
            {plan ? (
              <View style={styles.planContainer}>
                {!plan.previewUrl && plan.documentUrl && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="document-outline" size={18} color={Theme.colors.textSecondary} />
                    <Text style={{ marginLeft: 8, color: Theme.colors.textSecondary, flex: 1 }}>
                      План доступен только в PDF. Отображение на плане отключено.
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(plan.documentUrl!)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                    >
                      <Ionicons name="open-outline" size={18} color={Theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}

                {!!plan.previewUrl && (
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <PanGestureHandler
                      ref={panRef}
                      onGestureEvent={onPanGestureEvent}
                      onHandlerStateChange={onPanHandlerStateChange}
                    >
                      <Animated.View style={{ flex: 1 }}>
                        <PinchGestureHandler
                          ref={pinchRef}
                          onGestureEvent={onPinchGestureEvent}
                          onHandlerStateChange={onPinchHandlerStateChange}
                        >
                          <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                            <View style={styles.imageTouchable} onLayout={handleImageLayout}>
                              <AnimatedImage
                                source={{ uri: getImageUrl(plan.previewUrl) }}
                                style={styles.planImage}
                                contentFit="contain"
                                onLoad={handleImageLoad}
                                cachePolicy="memory-disk"
                              />
                            </View>

                            {imageLayout && imageSize && (
                              <DefectsOverlay
                                defects={[defect]}
                                imageLayout={imageLayout}
                                imageSize={imageSize}
                                animatedStyle={{}}
                                onDefectPress={() => {}}
                                userRole={userRole}
                              />
                            )}
                          </Animated.View>
                        </PinchGestureHandler>
                      </Animated.View>
                    </PanGestureHandler>
                  </GestureHandlerRootView>
                )}
                
                <View style={styles.planInstructions}>
                  <Ionicons name="information-circle-outline" size={16} color={Theme.colors.textSecondary} />
                  <Text style={styles.planInstructionsText}>
                    Используйте жесты для масштабирования и перемещения плана
                  </Text>
                </View>
              </View>
            ) : !loadingPlan ? (
              <View style={styles.noPlanContainer}>
                <Ionicons name="document-outline" size={48} color={Theme.colors.textSecondary} />
                <Text style={styles.noPlanText}>План квартиры не найден</Text>
              </View>
            ) : null}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
  },
  mainCard: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
  },
  headerRow: {
    marginBottom: Theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.sm,
  },
  description: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  detailsSection: {
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: Theme.colors.text,
    flex: 1,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  statusButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statusButtonSelected: {
    borderColor: Theme.colors.primary,
  },
  statusButtonText: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  statusButtonTextSelected: {
    color: Theme.colors.primary,
  },
  statusHint: {
    marginTop: Theme.spacing.sm,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  photoCard: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
  },
  photoContainer: {
    width: '100%',
    height: 300,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: Theme.colors.cardBackgroundLight,
    marginTop: Theme.spacing.sm,
  },
  defectPhoto: {
    width: 260,
    height: 260,
    borderRadius: Theme.borderRadius.md,
  },
  planCard: {
    margin: Theme.spacing.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  planContainer: {
    width: '100%',
    height: 400,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: Theme.colors.cardBackgroundLight,
    marginTop: Theme.spacing.sm,
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
  planInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
    padding: Theme.spacing.sm,
    backgroundColor: Theme.colors.cardBackgroundLight,
    borderRadius: Theme.borderRadius.sm,
  },
  planInstructionsText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  noPlanContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
    minHeight: 200,
  },
  noPlanText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
  },
});

export default DefectDetailScreen;
