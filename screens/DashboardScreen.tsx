import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import VoiceCommandButton from '../components/VoiceCommandButton';
import { Theme } from '../constants/Theme';
import { UserRole } from '../types';
import { getAllProjects, getProjectStats, getActiveProjects, Project } from '../lib/projectsApi';
import { getAllTasks, getTasksByStatus, getOverdueTasks } from '../lib/tasksApi';
import { getAllMaterials, getLowStockMaterials } from '../lib/materialsApi';
import { getActiveDefects } from '../lib/defectsApi';

interface DashboardScreenProps {
  navigation: any;
  route: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const currentUser = route.params?.currentUser;
  const currentUserId = currentUser?.id;
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeDefectsCount, setActiveDefectsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const quickActions: Partial<Record<UserRole, Array<{ label: string; icon: string; view: string }>>> = {
    admin: [
      { label: 'Проекты', icon: 'business-outline', view: 'Projects' },
      { label: 'Дефекты', icon: 'warning-outline', view: 'Defects' },
      { label: 'Материалы', icon: 'cube-outline', view: 'Materials' },
      { label: 'Профиль', icon: 'person-outline', view: 'Profile' },
    ],
    management: [
      { label: 'Проекты', icon: 'business-outline', view: 'Projects' },
      { label: 'Дефекты', icon: 'warning-outline', view: 'Defects' },
      { label: 'Материалы', icon: 'cube-outline', view: 'Materials' },
      { label: 'Профиль', icon: 'person-outline', view: 'Profile' },
    ],
    user: [
      { label: 'Проекты', icon: 'business-outline', view: 'Projects' },
      { label: 'Дефекты', icon: 'warning-outline', view: 'Defects' },
      { label: 'Профиль', icon: 'person-outline', view: 'Profile' },
    ],
    client: [
      { label: 'Создать задачу', icon: 'calendar-outline', view: 'Schedule' },
      { label: 'Добавить дефект', icon: 'warning-outline', view: 'Defects' },
      { label: 'Просмотреть отчеты', icon: 'document-text-outline', view: 'Reports' },
      { label: 'Просмотреть бюджет', icon: 'cash-outline', view: 'Budget' },
    ],
    foreman: [
      { label: 'Создать задачу', icon: 'add-circle-outline', view: 'Schedule' },
      { label: 'Обновить прогресс', icon: 'trending-up-outline', view: 'Schedule' },
      { label: 'Добавить отчет', icon: 'document-text-outline', view: 'Reports' },
      { label: 'Просмотреть материалы', icon: 'cube-outline', view: 'Materials' },
    ],
    technadzor: [
      { label: 'Добавить дефект', icon: 'warning-outline', view: 'Defects' },
      { label: 'Создать отчет', icon: 'document-text-outline', view: 'Reports' },
      { label: 'Проверить качество', icon: 'checkmark-circle-outline', view: 'Defects' },
      { label: 'Назначить дефект', icon: 'people-outline', view: 'Defects' },
    ],
  };

  // Загрузка данных из базы (оптимизировано - параллельная загрузка)
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Статические данные для проекта "Вишнёвый сад" (синхронизированы с веб-версией)
      const staticVishnevyySad: Project = {
        id: 'zhk-vishnevyy-sad',
        name: 'ЖК "Вишнёвый сад"',
        description: 'Строительство жилого комплекса',
        status: 'construction',
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
      
      // Загружаем все данные параллельно для ускорения
      const [activeProjects, allProjects, allTasks, allMaterials, activeDefects] = await Promise.all([
        getActiveProjects(),
        getAllProjects(),
        getAllTasks(),
        getAllMaterials(),
        getActiveDefects(),
      ]);
      
      // Обрабатываем проекты
      const filteredProjects = activeProjects.filter((project: any) => {
        const id = (project.id || '').toLowerCase();
        const name = (project.name || '').toLowerCase();
        return id !== 'zhk-vishnevyy-sad' && 
               !name.includes('вишневый сад') &&
               !name.includes('вишнёвый сад');
      });
      
      const projectsWithVishnevyySad = [staticVishnevyySad, ...filteredProjects];
      setProjects(projectsWithVishnevyySad);
      
      // Вычисляем статистику из уже загруженных проектов (без дополнительного запроса)
      let totalProjects = allProjects.length;
      let activeProjectsCount = 0;
      let completedProjects = 0;
      let totalBudget = 0;
      let totalSpent = 0;
      let totalProgress = 0;
      const statusBreakdown: { [status: string]: number } = {};

      allProjects.forEach(project => {
        totalBudget += project.total_budget || 0;
        totalSpent += project.spent || 0;
        totalProgress += project.progress || 0;

        if (project.status === 'construction') {
          activeProjectsCount++;
        } else if (project.status === 'completed') {
          completedProjects++;
        }

        statusBreakdown[project.status] = (statusBreakdown[project.status] || 0) + 1;
      });

      const averageProgress = totalProjects > 0 ? totalProgress / totalProjects : 0;

      setProjectStats({
        totalProjects,
        activeProjects: activeProjectsCount,
        completedProjects,
        totalBudget,
        totalSpent,
        averageProgress: Math.round(averageProgress * 100) / 100,
        statusBreakdown
      });
      
      setTasks(allTasks);
      setMaterials(allMaterials);
      setActiveDefectsCount(activeDefects.length);
      
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Вычисляем статистику на основе реальных данных
  const getStatsForRole = () => {
    const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress');
    const overdueTasks = tasks.filter(t => {
      if (t.endDate) {
        const endDate = new Date(t.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return endDate < today && (t.status === 'pending' || t.status === 'in_progress' || t.status === 'in-progress');
      }
      return false;
    });
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const lowStockMaterials = materials.filter(m => m.status === 'low-stock' || m.status === 'out-of-stock');
    
    const commonOpsStats: Array<{ title: string; value: string; icon: any; color: any }> = [
      {
        title: 'Активные проекты',
        value: String(projectStats?.activeProjects || projects.length || 0),
        icon: 'business-outline' as const,
        color: 'blue' as const,
      },
      {
        title: 'Активные дефекты',
        value: String(activeDefectsCount),
        icon: 'warning-outline' as const,
        color: 'red' as const,
      },
      {
        title: 'Активные задачи',
        value: String(activeTasks.length),
        icon: 'checkmark-circle-outline' as const,
        color: 'green' as const,
      },
      {
        title: 'Просрочки',
        value: String(overdueTasks.length),
        icon: 'alert-circle-outline' as const,
        color: 'orange' as const,
      },
    ];

    const stats: Partial<Record<UserRole, Array<{ title: string; value: string; icon: any; color: any }>>> = {
      admin: commonOpsStats,
      management: commonOpsStats,
      user: commonOpsStats,
      client: [
        { 
          title: 'Активные проекты', 
          value: String(projectStats?.activeProjects || projects.length || 0), 
          icon: 'business-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Прогресс времени', 
          value: `${Math.round(projectStats?.averageProgress || 0)}%`, 
          icon: 'calendar-outline' as const, 
          color: 'green' as const 
        },
        { 
          title: 'Завершение', 
          value: `${Math.round(projectStats?.averageProgress || 0)}%`, 
          icon: 'trending-up-outline' as const, 
          color: 'orange' as const 
        },
        { 
          title: 'Дней до дедлайна', 
          value: '365', 
          icon: 'time-outline' as const, 
          color: 'red' as const 
        },
      ],
      foreman: [
        { 
          title: 'Проекты в работе', 
          value: String(projectStats?.activeProjects || projects.length || 0), 
          icon: 'business-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Активные задачи', 
          value: String(activeTasks.length), 
          icon: 'checkmark-circle-outline' as const, 
          color: 'green' as const 
        },
        { 
          title: 'Команда', 
          value: '12', 
          icon: 'people-outline' as const, 
          color: 'purple' as const 
        },
        { 
          title: 'Просрочки', 
          value: String(overdueTasks.length), 
          icon: 'warning-outline' as const, 
          color: 'red' as const 
        },
      ],
      contractor: [
        { 
          title: 'Проекты в работе', 
          value: String(projectStats?.activeProjects || projects.length || 0), 
          icon: 'business-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Активные задачи', 
          value: String(activeTasks.length), 
          icon: 'checkmark-circle-outline' as const, 
          color: 'green' as const 
        },
        { 
          title: 'Команда', 
          value: '12', 
          icon: 'people-outline' as const, 
          color: 'purple' as const 
        },
        { 
          title: 'Просрочки', 
          value: String(overdueTasks.length), 
          icon: 'warning-outline' as const, 
          color: 'red' as const 
        },
      ],
      worker: [
        { 
          title: 'Мои задачи', 
          value: String(tasks.length), 
          icon: 'checkmark-circle-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Выполнено сегодня', 
          value: String(completedTasks.length), 
          icon: 'trending-up-outline' as const, 
          color: 'green' as const 
        },
        { 
          title: 'В работе', 
          value: String(activeTasks.length), 
          icon: 'time-outline' as const, 
          color: 'orange' as const 
        },
        { 
          title: 'Просрочено', 
          value: String(overdueTasks.length), 
          icon: 'warning-outline' as const, 
          color: 'red' as const 
        },
      ],
      storekeeper: [
        { 
          title: 'Товары на складе', 
          value: String(materials.length), 
          icon: 'cube-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Заказы в обработке', 
          value: '5', 
          icon: 'time-outline' as const, 
          color: 'orange' as const 
        },
        { 
          title: 'Критический запас', 
          value: String(lowStockMaterials.length), 
          icon: 'warning-outline' as const, 
          color: 'red' as const 
        },
        { 
          title: 'Общая стоимость', 
          value: '₽8.5М', 
          icon: 'cash-outline' as const, 
          color: 'green' as const 
        },
      ],
      technadzor: [
        { 
          title: 'Контролируемые проекты', 
          value: String(projectStats?.activeProjects || projects.length || 0), 
          icon: 'business-outline' as const, 
          color: 'blue' as const 
        },
        { 
          title: 'Активные дефекты', 
          value: String(activeDefectsCount), 
          icon: 'warning-outline' as const, 
          color: 'red' as const 
        },
        { 
          title: 'Проверки сегодня', 
          value: '4', 
          icon: 'checkmark-circle-outline' as const, 
          color: 'green' as const 
        },
        { 
          title: 'Отчеты за месяц', 
          value: '12', 
          icon: 'document-text-outline' as const, 
          color: 'purple' as const 
        },
      ],
    };
    
    return (stats[userRole] || stats.technadzor || []) as Array<{ title: string; value: string; icon: any; color: any }>;
  };

  const stats: Array<{ title: string; value: string; icon: any; color: any }> = getStatsForRole();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Theme.colors.background, Theme.colors.backgroundDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Header userRole={userRole} currentUserId={currentUserId} onNotificationPress={() => navigation.navigate('Notifications')} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Добро пожаловать в Отвёртку</Text>
            <Text style={styles.welcomeSubtitle}>Обзор ваших проектов и текущей деятельности</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {stats.map((stat: any, index: number) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                trend="+12%"
                style={index >= 2 ? styles.secondRowCard : undefined}
              />
            ))}
          </View>

          {/* Voice Command */}
          <Card variant="gradient" style={styles.voiceCommandCard}>
            <Text style={styles.sectionTitle}>Голосовое управление</Text>
            <VoiceCommandButton navigation={navigation} userRole={userRole} />
          </Card>

          {/* Recent Projects */}
          <Card variant="gradient" style={styles.projectsCard}>
            <View style={styles.projectsHeader}>
              <Text style={styles.sectionTitle}>Активные проекты</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Projects')}>
                <Text style={styles.seeAllText}>Все проекты</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <Text style={styles.loadingText}>Загрузка проектов...</Text>
            ) : projects.length > 0 ? (
              projects.slice(0, 3).map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => navigation.navigate('Projects')}
                >
                  <View style={styles.projectInfo}>
                    <Text style={styles.projectName}>{project.name}</Text>
                    <Text style={styles.projectStatus}>
                      {project.status === 'construction' ? 'В работе' : 
                       project.status === 'planning' ? 'Планирование' :
                       project.status === 'completed' ? 'Завершен' : project.status}
                    </Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <LinearGradient
                        colors={[Theme.colors.primary, Theme.colors.secondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${project.progress || 0}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{Math.round(project.progress || 0)}%</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Нет активных проектов</Text>
            )}
          </Card>
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
    paddingBottom: Theme.spacing.xl,
  },
  welcomeSection: {
    marginBottom: Theme.spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    lineHeight: 32,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Theme.spacing.lg,
    marginHorizontal: -Theme.spacing.xs,
    justifyContent: 'space-between',
  },
  secondRowCard: {
    marginTop: Theme.spacing.lg,
  },
  quickActionsCard: {
    marginBottom: Theme.spacing.lg,
  },
  voiceCommandCard: {
    marginBottom: Theme.spacing.lg,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
    lineHeight: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Theme.spacing.xs,
  },
  quickActionButton: {
    width: '47%',
    margin: Theme.spacing.xs,
    padding: Theme.spacing.md,
    paddingVertical: Theme.spacing.lg,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 100,
  },
  quickActionIcon: {
    marginBottom: Theme.spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  projectsCard: {
    marginBottom: Theme.spacing.lg,
  },
  projectsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  seeAllText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.primary,
  },
  projectCard: {
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.cardBackgroundLight,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.shadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  projectInfo: {
    marginBottom: Theme.spacing.sm,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    lineHeight: 24,
  },
  projectStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.primary,
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    overflow: 'hidden',
    marginRight: Theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: Theme.borderRadius.sm,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    padding: Theme.spacing.lg,
  },
});

export default DashboardScreen;
