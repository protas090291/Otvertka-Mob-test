import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import DefectForm from '../components/DefectForm';
import { Theme } from '../constants/Theme';
import { UserRole, Defect } from '../types';
import { getAllDefects, getActiveDefects, getDefectsByApartment, createDefect, updateDefect, deleteDefect, uploadDefectPhoto, DefectInput, DefectUpdate } from '../lib/defectsApi';

interface DefectsScreenProps {
  navigation: any;
  route: any;
}

const DefectsScreen: React.FC<DefectsScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const [apartmentFilter, setApartmentFilter] = useState<string | undefined>(route.params?.apartmentFilter);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [editingDefect, setEditingDefect] = useState<Defect | null>(null);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  
  const handleOpenPlan = () => {
    navigation.navigate('BuildingSelection', { userRole });
  };

  const loadDefects = async () => {
    try {
      setLoading(true);
      // Очищаем список неудачных URL при обновлении
      setFailedImageUrls(new Set());
      
      // Проверяем фильтр из route.params (на случай если state не обновился)
      const currentFilter = apartmentFilter || route.params?.apartmentFilter;
      console.log('🔄 Загрузка дефектов...', { 
        apartmentFilter, 
        routeFilter: route.params?.apartmentFilter,
        currentFilter 
      });
      
      let data: Defect[] = [];
      
      // Если есть фильтр по квартире, загружаем дефекты конкретной квартиры
      if (currentFilter) {
        console.log(`🔍 Поиск дефектов для квартиры: ${currentFilter}`);
        // Функция getDefectsByApartment сама обрабатывает оба формата (латиница/кириллица)
        data = await getDefectsByApartment(currentFilter);
        console.log(`✅ Загружено дефектов для квартиры ${currentFilter}:`, data.length);
        
        // Обновляем state если он не совпадает
        if (currentFilter !== apartmentFilter) {
          setApartmentFilter(currentFilter);
        }
      } else {
        // Если фильтра нет, загружаем все дефекты
        data = await getAllDefects();
        console.log('✅ Дефекты загружены (без фильтра):', data.length);
      }
      
      // Проверяем, какие дефекты имеют фото и валидные URL
      const defectsWithPhotos = data.filter(d => {
        const hasPhoto = d.photoUrl && d.photoUrl.trim() !== '';
        if (hasPhoto) {
          const isValidUrl = d.photoUrl.startsWith('http://') || d.photoUrl.startsWith('https://');
          if (!isValidUrl) {
            console.warn('⚠️ Невалидный URL фото для дефекта:', d.id, 'URL:', d.photoUrl);
          }
          return isValidUrl;
        }
        return false;
      });
      console.log('📸 Дефекты с валидными фото URL:', defectsWithPhotos.length);
      
      setDefects(data);
    } catch (error) {
      console.error('❌ Ошибка загрузки дефектов:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновляем фильтр при изменении параметров маршрута
  useEffect(() => {
    const newFilter = route.params?.apartmentFilter;
    console.log('🔄 Обновление фильтра:', { 
      old: apartmentFilter, 
      new: newFilter,
      routeParams: route.params 
    });
    if (newFilter !== apartmentFilter) {
      setApartmentFilter(newFilter);
    }
  }, [route.params?.apartmentFilter, route.params]);

  // Загружаем дефекты при изменении фильтра или при фокусе на экране
  useFocusEffect(
    React.useCallback(() => {
      // Обновляем фильтр из route.params при фокусе
      const currentFilter = route.params?.apartmentFilter;
      if (currentFilter !== apartmentFilter) {
        console.log('🎯 Обновление фильтра при фокусе:', currentFilter);
        setApartmentFilter(currentFilter);
      }
      loadDefects();
    }, [apartmentFilter, route.params?.apartmentFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDefects();
    setRefreshing(false);
  };

  const handleCreateDefect = async (defectData: DefectInput) => {
    try {
      console.log('📝 Создание дефекта с данными:', defectData);
      const result = await createDefect(defectData);
      
      if (result) {
        console.log('✅ Дефект создан:', result);
        
        // Если в defectData есть photoUri, загружаем фото
        if ((defectData as any).photoUri) {
          console.log('📸 Начало загрузки фото для нового дефекта:', {
            defectId: result.id,
            photoUri: (defectData as any).photoUri
          });
          try {
            const photoUrl = await uploadDefectPhoto((defectData as any).photoUri, result.id);
            console.log('📸 URL фото получен:', photoUrl);
            
            if (photoUrl) {
              // Обновляем дефект с URL фото
              console.log('🔄 Обновление дефекта с URL фото:', photoUrl);
              const updated = await updateDefect(result.id, { photo_url: photoUrl } as any);
              console.log('✅ Дефект обновлен с фото:', updated);
              console.log('📸 photoUrl в обновленном дефекте:', {
                photoUrl: updated?.photoUrl,
                expectedUrl: photoUrl,
                match: updated?.photoUrl === photoUrl
              });
              
              if (updated?.photoUrl !== photoUrl) {
                console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: URL не совпадает!');
                console.error('Ожидалось:', photoUrl);
                console.error('Получено:', updated?.photoUrl);
              }
              
              // Небольшая задержка перед перезагрузкой, чтобы Supabase успел обработать обновление
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.error('❌ Не удалось получить URL фото');
              Alert.alert('Предупреждение', 'Дефект создан, но фото не удалось загрузить');
            }
          } catch (error) {
            console.error('❌ Ошибка загрузки фото:', error);
            Alert.alert('Предупреждение', 'Дефект создан, но фото не удалось загрузить');
          }
        }
        
        // Перезагружаем дефекты чтобы увидеть фото
        console.log('🔄 Перезагрузка списка дефектов после создания...');
        await loadDefects();
        console.log('✅ Список дефектов перезагружен');
        Alert.alert('Успех', 'Дефект успешно создан');
      } else {
        console.error('❌ createDefect вернул null');
        Alert.alert('Ошибка', 'Не удалось создать дефект');
      }
    } catch (error) {
      console.error('❌ Ошибка создания дефекта:', error);
      Alert.alert('Ошибка', 'Не удалось создать дефект');
    }
  };

  const handleUpdateDefect = async (defectData: DefectUpdate) => {
    if (!editingDefect) return;
    try {
      console.log('🔄 Обновление дефекта:', editingDefect.id, defectData);
      
      // Если есть новое фото, загружаем его
      if ((defectData as any).photoUri) {
        console.log('📸 Загрузка нового фото для дефекта:', editingDefect.id);
        const photoUrl = await uploadDefectPhoto((defectData as any).photoUri, editingDefect.id);
        console.log('📸 URL фото получен:', photoUrl);
        
        if (photoUrl) {
          defectData.photo_url = photoUrl;
          console.log('✅ URL фото добавлен в данные обновления');
        } else {
          console.error('❌ Не удалось получить URL фото');
        }
        // Удаляем photoUri из данных перед обновлением
        delete (defectData as any).photoUri;
      }
      
      console.log('📝 Данные для обновления:', defectData);
      const result = await updateDefect(editingDefect.id, defectData);
      
      if (result) {
        console.log('✅ Дефект обновлен:', result);
        console.log('📸 photoUrl в результате:', result.photoUrl);
        await loadDefects();
        setEditingDefect(null);
        Alert.alert('Успех', 'Дефект успешно обновлен');
      } else {
        console.error('❌ updateDefect вернул null');
        Alert.alert('Ошибка', 'Не удалось обновить дефект');
      }
    } catch (error) {
      console.error('❌ Ошибка обновления дефекта:', error);
      Alert.alert('Ошибка', 'Не удалось обновить дефект');
    }
  };

  const handleDeleteDefect = async (defectId: string) => {
    Alert.alert(
      'Удаление дефекта',
      'Вы уверены, что хотите удалить этот дефект?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDefect(defectId);
            if (result) {
              await loadDefects();
              Alert.alert('Успех', 'Дефект удален');
            } else {
              Alert.alert('Ошибка', 'Не удалось удалить дефект');
            }
          },
        },
      ]
    );
  };

  const openEditForm = (defect: Defect) => {
    setEditingDefect(defect);
    setShowDefectForm(true);
  };

  const closeForm = () => {
    setShowDefectForm(false);
    setEditingDefect(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return Theme.colors.error;
      case 'high':
        return '#f59e0b';
      case 'medium':
        return Theme.colors.warning;
      default:
        return Theme.colors.success;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Theme.colors.error;
      case 'in-progress':
        return Theme.colors.warning;
      case 'resolved':
      case 'closed':
        return Theme.colors.success;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Открыт';
      case 'in-progress':
        return 'В работе';
      case 'resolved':
        return 'Исправлен';
      case 'closed':
        return 'Закрыт';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, Theme.colors.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {(() => {
          // Нормализуем номер квартиры для отображения (кириллица)
          let displayApartment = apartmentFilter || '';
          if (apartmentFilter) {
            if (apartmentFilter.startsWith('T')) {
              displayApartment = 'Т' + apartmentFilter.substring(1);
            } else if (apartmentFilter.startsWith('U')) {
              displayApartment = 'У' + apartmentFilter.substring(1);
            }
          }
          return (
            <>
              <Header userRole={userRole} title={apartmentFilter ? `Дефекты: ${displayApartment}` : "Дефекты"} />
              {apartmentFilter && (
                <View style={styles.filterBanner}>
                  <Ionicons name="home" size={16} color={Theme.colors.primary} />
                  <Text style={styles.filterText}>Фильтр: Квартира {displayApartment}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      // Убираем фильтр, перезагружая экран без параметра
                      navigation.setParams({ apartmentFilter: undefined });
                    }}
                    style={styles.clearFilterButton}
                  >
                    <Ionicons name="close-circle" size={20} color={Theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          );
        })()}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.planButton}
            onPress={handleOpenPlan}
          >
            <Ionicons name="map-outline" size={20} color={Theme.colors.primary} />
            <Text style={styles.planButtonText}>План квартиры</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colors.primary} />
              <Text style={styles.loadingText}>Загрузка дефектов...</Text>
            </View>
          ) : defects.length === 0 ? (
            <Card variant="gradient">
              <Text style={styles.sectionTitle}>Дефекты и замечания</Text>
              <Text style={styles.emptyText}>Нет дефектов</Text>
            </Card>
          ) : (
            <>
              <Card variant="gradient">
                <Text style={styles.sectionTitle}>Дефекты и замечания ({defects.length})</Text>
              </Card>
              {defects.map((defect) => {
                const severityColor = getSeverityColor(defect.severity);
                const statusColor = getStatusColor(defect.status);
                return (
                  <Card key={defect.id} variant="gradient" style={styles.defectCard}>
                    <View style={styles.defectHeader}>
                      <TouchableOpacity
                        style={styles.defectTitleContainer}
                        onPress={() => {
                          navigation.navigate('DefectDetail', { defect, userRole });
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.defectTitle}>{defect.title}</Text>
                        <Ionicons name="chevron-forward-outline" size={20} color={Theme.colors.textSecondary} />
                      </TouchableOpacity>
                      <View style={styles.defectHeaderActions}>
                        <View style={[styles.severityBadge, { backgroundColor: `${severityColor}20` }]}>
                          <Text style={[styles.severityText, { color: severityColor }]}>
                            {defect.severity === 'critical' ? 'Критично' :
                             defect.severity === 'high' ? 'Высокий' :
                             defect.severity === 'medium' ? 'Средний' : 'Низкий'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openEditForm(defect)}
                        >
                          <Ionicons name="create-outline" size={20} color={Theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteDefect(defect.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {defect.description ? (
                      <Text style={styles.defectDescription}>{defect.description}</Text>
                    ) : null}
                    {defect.photoUrl && 
                     defect.photoUrl.trim() !== '' && 
                     (defect.photoUrl.startsWith('http://') || defect.photoUrl.startsWith('https://')) &&
                     !failedImageUrls.has(defect.photoUrl) ? (
                      <TouchableOpacity
                        style={styles.photoContainer}
                        onPress={() => {
                          console.log('📸 Открытие фото:', defect.photoUrl);
                          // Можно добавить полноэкранный просмотр фото
                        }}
                        activeOpacity={0.9}
                      >
                        <Image 
                          key={defect.photoUrl} // Добавляем key для принудительной перезагрузки при изменении URL
                          source={{ 
                            uri: defect.photoUrl
                          }} 
                          style={styles.defectPhoto}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                          recyclingKey={defect.id}
                          onError={() => {
                            // Добавляем URL в список неудачных, чтобы не пытаться загружать снова
                            setFailedImageUrls(prev => new Set(prev).add(defect.photoUrl!));
                          }}
                          onLoad={() => {
                            console.log('✅ Изображение загружено успешно:', defect.photoUrl);
                          }}
                        />
                        <View style={styles.photoOverlay}>
                          <Ionicons name="expand-outline" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ) : null}
                    <View style={styles.defectDetails}>
                      {defect.location ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={16} color={Theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{defect.location}</Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Ionicons name="time-outline" size={16} color={Theme.colors.textSecondary} />
                        <Text style={styles.detailText}>
                          {new Date(defect.reportedDate).toLocaleDateString('ru')}
                        </Text>
                      </View>
                      {defect.reportedBy ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="person-outline" size={16} color={Theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{defect.reportedBy}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {getStatusLabel(defect.status)}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <DefectForm
        visible={showDefectForm}
        defect={editingDefect}
        onClose={closeForm}
        onSubmit={editingDefect ? handleUpdateDefect : handleCreateDefect}
      />
    </View>
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
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.md,
  },
  loadingContainer: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
  defectCard: {
    marginTop: Theme.spacing.md,
  },
  defectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  defectTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.sm,
  },
  defectTitle: {
    ...Theme.typography.h3,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  severityText: {
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  defectDescription: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  defectDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  detailText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
  },
  statusContainer: {
    marginTop: Theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    gap: Theme.spacing.sm,
  },
  planButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.primary,
    letterSpacing: 0.3,
  },
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  filterText: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  clearFilterButton: {
    padding: Theme.spacing.xs,
  },
  defectHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  editButton: {
    padding: Theme.spacing.xs,
  },
  deleteButton: {
    padding: Theme.spacing.xs,
  },
  photoContainer: {
    marginTop: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  defectPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: Theme.spacing.xs,
    right: Theme.spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: Theme.borderRadius.full,
    padding: Theme.spacing.xs,
  },
});

export default DefectsScreen;
