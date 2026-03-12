import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { getAllDefects } from '../lib/defectsApi';
import { getAllApartments } from '../lib/plansApi';
import { supabaseAdmin } from '../lib/supabase';

interface ProjectApartmentsScreenProps {
  navigation: any;
  route: any;
}

interface ApartmentDefectStats {
  apartmentNumber: string;
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

const ProjectApartmentsScreen: React.FC<ProjectApartmentsScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const projectId = route.params?.projectId;
  const projectName = route.params?.projectName || 'Проект';
  
  const [apartmentsStats, setApartmentsStats] = useState<ApartmentDefectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadApartmentsStats = async () => {
    try {
      setLoading(true);
      
      // Загружаем все дефекты
      const allDefects = await getAllDefects();
      
      // Получаем все квартиры (корпус Т и корпус У)
      const allTApartments = getAllApartments();
      
      // Загружаем квартиры корпуса У из базы
      let allUApartments: string[] = [];
      try {
        const { data: uDefects } = await supabaseAdmin
          .from('defects')
          .select('apartment_id')
          .not('apartment_id', 'is', null);
        
        if (uDefects) {
          const uAptNumbers = new Set<string>();
          uDefects.forEach((d: any) => {
            if (d.apartment_id && (d.apartment_id.startsWith('У') || d.apartment_id.startsWith('U'))) {
              // Нормализуем: если начинается с U, заменяем на У
              const normalized = d.apartment_id.startsWith('U') 
                ? 'У' + d.apartment_id.substring(1)
                : d.apartment_id;
              uAptNumbers.add(normalized);
            }
          });
          allUApartments = Array.from(uAptNumbers);
        }
      } catch (error) {
        console.error('Ошибка загрузки квартир корпуса У:', error);
      }
      
      // Объединяем все квартиры
      const allApartments = [
        ...allTApartments.map(apt => `Т${apt}`),
        ...allUApartments
      ];
      
      // Группируем дефекты по квартирам
      const defectsByApartment: { [key: string]: any[] } = {};
      
      allDefects.forEach(defect => {
        // Используем location (который содержит apartment_id) для получения номера квартиры
        // В mapToDefect location = data.location || data.apartment_id
        const apartmentId = defect.location || '';
        if (apartmentId) {
          // Нормализуем номер квартиры для отображения (всегда кириллица)
          let normalizedApt = apartmentId;
          if (apartmentId.startsWith('U')) {
            normalizedApt = 'У' + apartmentId.substring(1);
          } else if (apartmentId.startsWith('T')) {
            normalizedApt = 'Т' + apartmentId.substring(1);
          } else if (!apartmentId.startsWith('Т') && !apartmentId.startsWith('У')) {
            // Если номер без префикса, добавляем Т
            normalizedApt = 'Т' + apartmentId;
          }
          
          if (!defectsByApartment[normalizedApt]) {
            defectsByApartment[normalizedApt] = [];
          }
          defectsByApartment[normalizedApt].push(defect);
        }
      });
      
      // Создаем статистику для каждой квартиры
      const stats: ApartmentDefectStats[] = allApartments
        .map(apartment => {
          const defects = defectsByApartment[apartment] || [];
          
          return {
            apartmentNumber: apartment,
            total: defects.length,
            open: defects.filter(d => d.status === 'open' || d.status === 'active').length,
            inProgress: defects.filter(d => d.status === 'in-progress' || d.status === 'in_progress').length,
            resolved: defects.filter(d => d.status === 'resolved' || d.status === 'fixed').length,
            closed: defects.filter(d => d.status === 'closed').length,
          };
        })
        .filter(stat => stat.total > 0) // Показываем только квартиры с дефектами
        .sort((a, b) => {
          // Сортируем: сначала корпус Т, потом корпус У
          const aIsT = a.apartmentNumber.startsWith('Т');
          const bIsT = b.apartmentNumber.startsWith('Т');
          if (aIsT !== bIsT) {
            return aIsT ? -1 : 1;
          }
          // Внутри корпуса сортируем по номеру
          const aNum = parseInt(a.apartmentNumber.replace(/[^0-9]/g, '')) || 0;
          const bNum = parseInt(b.apartmentNumber.replace(/[^0-9]/g, '')) || 0;
          return aNum - bNum;
        });
      
      setApartmentsStats(stats);
    } catch (error) {
      console.error('Ошибка загрузки статистики квартир:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApartmentsStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApartmentsStats();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Theme.colors.error;
      case 'inProgress':
        return Theme.colors.warning;
      case 'resolved':
        return Theme.colors.success;
      case 'closed':
        return Theme.colors.textSecondary;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const handleApartmentPress = (apartmentNumber: string) => {
    console.log('🏠 Переход к дефектам квартиры:', apartmentNumber);
    
    // Нормализуем номер квартиры для поиска в базе
    // В базе apartment_id может быть в формате T101 или Т101, U501 или У501
    // Попробуем оба варианта
    let searchApartmentId = apartmentNumber;
    if (apartmentNumber.startsWith('Т')) {
      searchApartmentId = 'T' + apartmentNumber.substring(1);
    } else if (apartmentNumber.startsWith('У')) {
      searchApartmentId = 'U' + apartmentNumber.substring(1);
    }
    
    console.log('🔍 Ищем дефекты для:', { 
      display: apartmentNumber, 
      search: searchApartmentId 
    });
    
    // Переходим на экран дефектов с фильтром по квартире
    // DefectsScreen находится внутри Tab Navigator, поэтому используем navigate к Main с указанием screen
    navigation.navigate('Main', {
      screen: 'Defects',
      params: { 
        apartmentFilter: searchApartmentId, // Передаем в формате для поиска в БД
        userRole 
      }
    });
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
        <Header userRole={userRole} title={projectName} />
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
              <Text style={styles.loadingText}>Загрузка квартир...</Text>
            </View>
          ) : apartmentsStats.length === 0 ? (
            <Card variant="gradient">
              <Text style={styles.sectionTitle}>Квартиры с дефектами</Text>
              <Text style={styles.emptyText}>Нет квартир с дефектами</Text>
            </Card>
          ) : (
            <>
              <Card variant="gradient" style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Квартиры с дефектами</Text>
                <Text style={styles.summaryText}>
                  Всего квартир с дефектами: {apartmentsStats.length}
                </Text>
                <Text style={styles.summaryText}>
                  Всего дефектов: {apartmentsStats.reduce((sum, apt) => sum + apt.total, 0)}
                </Text>
              </Card>
              
              {apartmentsStats.map((stat) => (
                <Card key={stat.apartmentNumber} variant="gradient" style={styles.apartmentCard}>
                  <TouchableOpacity
                    onPress={() => handleApartmentPress(stat.apartmentNumber)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.apartmentHeader}>
                      <View style={styles.apartmentTitleContainer}>
                        <Ionicons 
                          name="home-outline" 
                          size={24} 
                          color={Theme.colors.primary} 
                        />
                        <Text style={styles.apartmentNumber}>
                          Квартира {stat.apartmentNumber}
                        </Text>
                      </View>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={Theme.colors.textLight} 
                      />
                    </View>
                    
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Всего</Text>
                        <Text style={styles.statValue}>{stat.total}</Text>
                      </View>
                      
                      {stat.open > 0 && (
                        <View style={styles.statItem}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor('open') }]} />
                          <Text style={styles.statLabel}>Открыто</Text>
                          <Text style={[styles.statValue, { color: getStatusColor('open') }]}>
                            {stat.open}
                          </Text>
                        </View>
                      )}
                      
                      {stat.inProgress > 0 && (
                        <View style={styles.statItem}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor('inProgress') }]} />
                          <Text style={styles.statLabel}>В работе</Text>
                          <Text style={[styles.statValue, { color: getStatusColor('inProgress') }]}>
                            {stat.inProgress}
                          </Text>
                        </View>
                      )}
                      
                      {stat.resolved > 0 && (
                        <View style={styles.statItem}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor('resolved') }]} />
                          <Text style={styles.statLabel}>Решено</Text>
                          <Text style={[styles.statValue, { color: getStatusColor('resolved') }]}>
                            {stat.resolved}
                          </Text>
                        </View>
                      )}
                      
                      {stat.closed > 0 && (
                        <View style={styles.statItem}>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor('closed') }]} />
                          <Text style={styles.statLabel}>Закрыто</Text>
                          <Text style={[styles.statValue, { color: getStatusColor('closed') }]}>
                            {stat.closed}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
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
  summaryCard: {
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.sm,
  },
  summaryText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
  apartmentCard: {
    marginBottom: Theme.spacing.md,
  },
  apartmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  apartmentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  apartmentNumber: {
    ...Theme.typography.h3,
    marginLeft: Theme.spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginRight: Theme.spacing.xs,
  },
  statValue: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
});

export default ProjectApartmentsScreen;
