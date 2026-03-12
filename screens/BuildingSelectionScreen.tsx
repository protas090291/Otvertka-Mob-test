import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { getAllApartments, loadBuildingUApartments } from '../lib/plansApi';

interface BuildingSelectionScreenProps {
  navigation: any;
  route: any;
}

const BuildingSelectionScreen: React.FC<BuildingSelectionScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const allApartments = getAllApartments();
  const [buildingUApartments, setBuildingUApartments] = useState<string[]>([]);
  const [loadingU, setLoadingU] = useState(false);

  // Автоматический выбор квартиры при переходе из голосового управления
  useEffect(() => {
    const apartmentNumber = route.params?.apartmentNumber;
    const autoSelect = route.params?.autoSelect;
    
    if (autoSelect && apartmentNumber) {
      // Автоматически определяем здание по номеру квартиры
      const buildingId = apartmentNumber.startsWith('U') || apartmentNumber.startsWith('У') ? 'U' : 'T';
      
      // Загружаем квартиры и автоматически переходим к нужной
      const handleAutoSelect = async () => {
        if (buildingId === 'U') {
          setLoadingU(true);
          try {
            const apartments = await loadBuildingUApartments();
            setBuildingUApartments(apartments);
            
            // Нормализуем номер квартиры для поиска
            const normalizedApt = apartmentNumber.startsWith('У') 
              ? 'У' + apartmentNumber.substring(1)
              : apartmentNumber.startsWith('U')
              ? 'У' + apartmentNumber.substring(1)
              : apartmentNumber;
            
            const apartmentExists = apartments.some(apt => apt === normalizedApt);
            
            if (apartmentExists) {
              // Переходим сразу на план квартиры
              navigation.push('ApartmentPlan', { 
                userRole,
                buildingId: 'U',
                apartments: [normalizedApt],
                key: `apartment-plan-U-${apartmentNumber}-${Date.now()}`
              });
            } else {
              Alert.alert('Внимание', `Квартира ${normalizedApt} не найдена в корпусе У`);
            }
          } catch (error) {
            console.error('Ошибка загрузки квартир корпуса У:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить квартиры корпуса У');
          } finally {
            setLoadingU(false);
          }
        } else {
          // Для корпуса Т
          const normalizedApt = apartmentNumber.startsWith('Т') 
            ? 'Т' + apartmentNumber.substring(1)
            : apartmentNumber.startsWith('T')
            ? 'Т' + apartmentNumber.substring(1)
            : 'Т' + apartmentNumber;
          
          const apartmentExists = allApartments.some(apt => apt === normalizedApt);
          
          if (apartmentExists) {
            navigation.push('ApartmentPlan', { 
              userRole,
              buildingId: 'T',
              apartments: [normalizedApt],
              key: `apartment-plan-T-${apartmentNumber}-${Date.now()}`
            });
          } else {
            Alert.alert('Внимание', `Квартира ${normalizedApt} не найдена в корпусе Т`);
          }
        }
      };
      
      handleAutoSelect();
    }
  }, [route.params?.apartmentNumber, route.params?.autoSelect]);

  const handleSelectBuilding = async (buildingId: string) => {
    if (buildingId === 'T') {
      // Для корпуса Т открываем экран с квартирами
      navigation.push('ApartmentPlan', { 
        userRole,
        buildingId: 'T',
        apartments: allApartments,
        key: `apartment-plan-T-${Date.now()}` // Уникальный ключ для принудительного пересоздания
      });
    } else if (buildingId === 'U') {
      // Для корпуса У загружаем квартиры из базы данных
      setLoadingU(true);
      try {
        console.log('🔄 Загрузка квартир корпуса У из базы данных...');
        const apartments = await loadBuildingUApartments();
        console.log('✅ Загружены квартиры корпуса У:', apartments);
        
        if (apartments.length > 0) {
          setBuildingUApartments(apartments);
          navigation.push('ApartmentPlan', { 
            userRole,
            buildingId: 'U',
            apartments: apartments,
            key: `apartment-plan-U-${Date.now()}` // Уникальный ключ для принудительного пересоздания
          });
        } else {
          Alert.alert(
            'Внимание', 
            'Квартиры корпуса У не найдены в базе данных. Проверьте наличие файлов с префиксом U в Storage.'
          );
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки квартир корпуса У:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить квартиры корпуса У из базы данных');
      } finally {
        setLoadingU(false);
      }
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
        <Header userRole={userRole} title="Выбор корпуса" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Theme.colors.success, Theme.colors.success + 'CC']}
                style={styles.headerIcon}
              >
                <Ionicons name="business" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Выбор корпуса</Text>
            <Text style={styles.subtitle}>Выберите корпус для просмотра планов</Text>
          </View>

          <View style={styles.buildingsGrid}>
            {/* Корпус Т */}
            <TouchableOpacity
              style={styles.buildingCard}
              onPress={() => handleSelectBuilding('T')}
              activeOpacity={0.8}
            >
              <Card variant="gradient" style={styles.card}>
                <View style={styles.buildingIconContainer}>
                  <LinearGradient
                    colors={[Theme.colors.secondary, Theme.colors.primary]}
                    style={styles.buildingIcon}
                  >
                    <Ionicons name="business" size={40} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.buildingName}>Корпус Т</Text>
                <Text style={styles.buildingInfo}>{allApartments.length} квартир</Text>
              </Card>
            </TouchableOpacity>

            {/* Корпус У */}
            <TouchableOpacity
              style={styles.buildingCard}
              onPress={() => handleSelectBuilding('U')}
              activeOpacity={0.8}
            >
              <Card variant="gradient" style={styles.card}>
                <View style={styles.buildingIconContainer}>
                  <LinearGradient
                    colors={[Theme.colors.success, Theme.colors.success + 'CC']}
                    style={styles.buildingIcon}
                  >
                    <Ionicons name="business" size={40} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.buildingName}>Корпус У</Text>
                {loadingU ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Theme.colors.textSecondary} />
                    <Text style={styles.buildingInfo}>Загрузка...</Text>
                  </View>
                ) : (
                  <Text style={styles.buildingInfo}>
                    {buildingUApartments.length > 0 ? `${buildingUApartments.length} квартир` : '5 квартир'}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          </View>
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
    padding: Theme.spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: Theme.spacing.md,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Theme.typography.h1,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  buildingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
    marginHorizontal: -Theme.spacing.xs,
  },
  buildingCard: {
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
  },
  card: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
    minHeight: 200,
  },
  buildingIconContainer: {
    marginBottom: Theme.spacing.md,
  },
  buildingIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buildingName: {
    ...Theme.typography.h2,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  buildingInfo: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
  },
});

export default BuildingSelectionScreen;
