import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import Card from '../components/Card';
import TaskForm from '../components/TaskForm';
import { Theme } from '../constants/Theme';
import { UserRole, Task } from '../types';
import { getAllTasks, getTasksByProject, createTask, updateTask, deleteTask, TaskInput, TaskUpdate } from '../lib/tasksApi';

interface ScheduleScreenProps {
  navigation: any;
  route: any;
}

const ScheduleScreen: React.FC<ScheduleScreenProps> = ({ navigation, route }) => {
  const userRole: UserRole = route.params?.userRole || 'technadzor';
  const projectId = route.params?.projectId;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = projectId 
        ? await getTasksByProject(projectId)
        : await getAllTasks();
      setTasks(data);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCreateTask = async (taskData: TaskInput) => {
    const result = await createTask(taskData);
    if (result) {
      await loadTasks();
      Alert.alert('Успех', 'Задача успешно создана');
    } else {
      Alert.alert('Ошибка', 'Не удалось создать задачу');
    }
  };

  const handleUpdateTask = async (taskData: TaskUpdate) => {
    if (!editingTask) return;
    const result = await updateTask(editingTask.id, taskData);
    if (result) {
      await loadTasks();
      setEditingTask(null);
      Alert.alert('Успех', 'Задача успешно обновлена');
    } else {
      Alert.alert('Ошибка', 'Не удалось обновить задачу');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    Alert.alert(
      'Удаление задачи',
      'Вы уверены, что хотите удалить эту задачу?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteTask(taskId);
            if (result) {
              await loadTasks();
              Alert.alert('Успех', 'Задача удалена');
            } else {
              Alert.alert('Ошибка', 'Не удалось удалить задачу');
            }
          },
        },
      ]
    );
  };

  const openEditForm = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const closeForm = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Theme.colors.success;
      case 'in_progress':
      case 'in-progress':
        return Theme.colors.primary;
      case 'delayed':
        return Theme.colors.error;
      default:
        return Theme.colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
      case 'in-progress':
        return 'В работе';
      case 'delayed':
        return 'Просрочена';
      default:
        return 'Ожидает';
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
        <Header userRole={userRole} title="График работ" />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowTaskForm(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Создать задачу</Text>
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
              <Text style={styles.loadingText}>Загрузка задач...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <Card variant="gradient">
              <Text style={styles.sectionTitle}>Задачи</Text>
              <Text style={styles.emptyText}>Нет задач</Text>
            </Card>
          ) : (
            <>
              <Card variant="gradient">
                <Text style={styles.sectionTitle}>Задачи ({tasks.length})</Text>
              </Card>
              {tasks.map((task) => {
                const statusColor = getStatusColor(task.status);
                return (
                  <Card key={task.id} variant="gradient" style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskName}>{task.name}</Text>
                      <View style={styles.taskHeaderActions}>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {getStatusLabel(task.status)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openEditForm(task)}
                        >
                          <Ionicons name="create-outline" size={20} color={Theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTask(task.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={Theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {task.description ? (
                      <Text style={styles.taskDescription}>{task.description}</Text>
                    ) : null}
                    <View style={styles.taskDetails}>
                      {task.assignee ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="person-outline" size={16} color={Theme.colors.textSecondary} />
                          <Text style={styles.detailText}>{task.assignee}</Text>
                        </View>
                      ) : null}
                      {task.endDate ? (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={16} color={Theme.colors.textSecondary} />
                          <Text style={styles.detailText}>
                            {new Date(task.endDate).toLocaleDateString('ru')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={[Theme.colors.primary, Theme.colors.secondary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${task.progress || 0}%` }]}
                        />
                      </View>
                      <Text style={styles.progressText}>{task.progress || 0}%</Text>
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <TaskForm
        visible={showTaskForm}
        task={editingTask}
        projectId={projectId}
        onClose={closeForm}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
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
  taskCard: {
    marginTop: Theme.spacing.md,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  taskName: {
    ...Theme.typography.h3,
    flex: 1,
    marginRight: Theme.spacing.sm,
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
  taskDescription: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  taskDetails: {
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
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
    ...Theme.typography.bodySmall,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  headerActions: {
    padding: Theme.spacing.md,
    paddingTop: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primary,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    gap: Theme.spacing.xs,
  },
  addButtonText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: '#fff',
  },
  taskHeaderActions: {
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
});

export default ScheduleScreen;
