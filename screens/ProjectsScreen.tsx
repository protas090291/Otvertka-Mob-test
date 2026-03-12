import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { getAllProjects } from '../lib/projectsApi';
import { Project } from '../lib/supabase';
import { getProjectProgress } from '../lib/tasksApi';
import { calculateQuality } from '../lib/qualityCalculator';

interface ProjectsScreenProps {
  navigation: any;
  route: any;
}

interface ProjectWithMetrics extends Project {
  actualProgress?: number;
  timeProgress?: number;
  qualityScore?: number;
}

const ProjectsScreen: React.FC<ProjectsScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const fetchedProjects = await getAllProjects();
      
      // Проверяем, есть ли проект "Вишневый сад" в базе
      const hasVishnevyySad = fetchedProjects.some((p: any) => {
        const id = (p.id || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return id === 'zhk-vishnevyy-sad' || 
               name.includes('вишневый сад') || 
               name.includes('вишнёвый сад');
      });
      
      // Статические данные для проекта "Вишневый сад" (синхронизированы с веб-версией)
      const staticVishnevyySad: Project = {
        id: 'zhk-vishnevyy-sad',
        name: 'ЖК "Вишневый сад"',
        description: 'Строительство жилого комплекса',
        status: 'construction', // 'construction' маппится в 'in-progress' при отображении
        progress: 65,
        start_date: '2025-06-20',
        end_date: '2026-06-20',
        total_budget: 180000000,
        spent: 117000000,
        client: 'ООО "АБ ДЕВЕЛОПМЕНТ ЦЕНТР"',
        foreman: 'Саидов Ю.Н.',
        architect: 'Петров П.П.',
        address: 'ул. Вишневая, 15',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Фильтруем проект "Вишневый сад" из базы, если он там есть
      const filteredProjects = fetchedProjects.filter((project: any) => {
        const id = (project.id || '').toLowerCase();
        const name = (project.name || '').toLowerCase();
        return id !== 'zhk-vishnevyy-sad' && 
               !name.includes('вишневый сад') &&
               !name.includes('вишнёвый сад');
      });
      
      // Добавляем статический проект "Вишневый сад" в начало списка
      const allProjects = [staticVishnevyySad, ...filteredProjects];
      
      // Загружаем метрики для каждого проекта
      const projectsWithMetrics = await Promise.all(
        allProjects.map(async (project) => {
          try {
            // Для проекта "Вишневый сад" используем статические данные (как в веб-версии)
            let actualProgress = 0;
            let timeProgress = 0;
            let qualityScore = 0;
            
            if (project.id === 'zhk-vishnevyy-sad') {
              // Статические данные для "Вишневый сад" (как в веб-версии)
              // Используем статический прогресс 65%, а не из progress_data
              actualProgress = 65; // Синхронизировано с веб-версией
              
              const startDate = new Date('2025-06-20').getTime();
              const endDate = new Date('2026-06-20').getTime();
              const currentTime = new Date().getTime();
              
              timeProgress = (startDate > 0 && endDate > 0 && endDate > startDate)
                ? Math.min(Math.max(((currentTime - startDate) / (endDate - startDate)) * 100, 0), 100)
                : 0;
            } else {
              // Для остальных проектов используем данные из базы
              const projectProgressData = await getProjectProgress(project.id);
              actualProgress = projectProgressData.averageProgress || 0;
              
              const startDate = project.start_date ? new Date(project.start_date).getTime() : 0;
              const endDate = project.end_date ? new Date(project.end_date).getTime() : 0;
              const currentTime = new Date().getTime();
              
              timeProgress = (startDate > 0 && endDate > 0 && endDate > startDate)
                ? Math.min(Math.max(((currentTime - startDate) / (endDate - startDate)) * 100, 0), 100)
                : 0;
            }
            
            // Рассчитываем качество
            const qualityCalculation = calculateQuality({
              actualProgress,
              timeProgress
            });
            qualityScore = qualityCalculation.qualityScore;
            
            return {
              ...project,
              actualProgress,
              timeProgress,
              qualityScore
            };
          } catch (error) {
            console.error(`Ошибка загрузки метрик для проекта ${project.id}:`, error);
            return {
              ...project,
              actualProgress: project.progress || 0,
              timeProgress: 0,
              qualityScore: 0
            };
          }
        })
      );
      
      setProjects(projectsWithMetrics);
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const statusColors = {
    'planning': { bg: '#f3f4f6', text: '#6b7280' },
    'in-progress': { bg: '#dbeafe', text: '#3b82f6' },
    'completed': { bg: '#d1fae5', text: '#10b981' },
    'on-hold': { bg: '#fee2e2', text: '#ef4444' },
  };

  const statusLabels = {
    'planning': 'Планирование',
    'in-progress': 'В работе',
    'completed': 'Завершён',
    'on-hold': 'Приостановлен',
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
        <Header userRole={userRole} title="Проекты" />
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
              <Text style={styles.loadingText}>Загрузка проектов...</Text>
            </View>
          ) : projects.length === 0 ? (
            <Card variant="gradient" style={styles.emptyCard}>
              <Text style={styles.emptyText}>Нет проектов</Text>
            </Card>
          ) : (
            projects.map((project) => {
              const projectStatus = project.status === 'construction' ? 'in-progress' : 
                                   project.status === 'planning' ? 'planning' :
                                   project.status === 'completed' ? 'completed' : 'on-hold';
              const status = statusColors[projectStatus as keyof typeof statusColors];
              return (
                <Card key={project.id} variant="gradient" style={styles.projectCard}>
                  <View style={styles.projectHeader}>
                    <View style={styles.projectTitleContainer}>
                      <Text style={styles.projectName}>{project.name}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>
                          {statusLabels[projectStatus as keyof typeof statusLabels]}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Ionicons name="trending-up-outline" size={20} color={Theme.colors.primary} />
                      <Text style={styles.metricLabel}>Прогресс</Text>
                      <Text style={styles.metricValue}>{project.actualProgress !== undefined ? project.actualProgress : Math.round(project.progress || 0)}%</Text>
                    </View>
                    <View style={styles.metric}>
                      <Ionicons name="calendar-outline" size={20} color={Theme.colors.warning} />
                      <Text style={styles.metricLabel}>Время</Text>
                      <Text style={styles.metricValue}>{project.timeProgress !== undefined ? Math.round(project.timeProgress) : 0}%</Text>
                    </View>
                    <View style={styles.metric}>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Theme.colors.secondary} />
                      <Text style={styles.metricLabel}>Качество</Text>
                      <Text style={styles.metricValue}>{project.qualityScore !== undefined ? project.qualityScore : 0}%</Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <LinearGradient
                        colors={[Theme.colors.primary, Theme.colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${project.actualProgress !== undefined ? project.actualProgress : Math.round(project.progress || 0)}%` }]}
                      />
                    </View>
                  </View>

                  <View style={styles.projectDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={16} color={Theme.colors.textSecondary} />
                      <Text style={styles.detailLabel}>Срок завершения</Text>
                      <Text style={styles.detailValue}>
                        {project.end_date ? new Date(project.end_date).toLocaleDateString('ru') : 'Не указан'}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={16} color={Theme.colors.textSecondary} />
                      <Text style={styles.detailLabel}>Начальник участка</Text>
                      <Text style={styles.detailValue}>{project.foreman || 'Не указан'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="business-outline" size={16} color={Theme.colors.textSecondary} />
                      <Text style={styles.detailLabel}>Архитектор</Text>
                      <Text style={styles.detailValue}>{project.architect || 'Не указан'}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => navigation.navigate('ProjectApartments', { 
                      projectId: project.id,
                      projectName: project.name,
                      userRole 
                    })}
                  >
                    <Text style={styles.viewButtonText}>Подробнее</Text>
                    <Ionicons name="arrow-forward" size={20} color={Theme.colors.primary} />
                  </TouchableOpacity>
                </Card>
              );
            })
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
  projectCard: {
    marginBottom: Theme.spacing.md,
  },
  projectHeader: {
    marginBottom: Theme.spacing.md,
  },
  projectTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  projectName: {
    ...Theme.typography.h3,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.full,
  },
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.colors.border,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    ...Theme.typography.caption,
    marginTop: Theme.spacing.xs,
    marginBottom: 4,
  },
  metricValue: {
    ...Theme.typography.h3,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: Theme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Theme.borderRadius.sm,
  },
  projectDetails: {
    marginBottom: Theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  detailLabel: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
    flex: 1,
  },
  detailValue: {
    ...Theme.typography.bodySmall,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  viewButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginRight: Theme.spacing.xs,
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
  emptyCard: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
});

export default ProjectsScreen;
