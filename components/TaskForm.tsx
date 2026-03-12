import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { Task } from '../types';
import { TaskInput, TaskUpdate } from '../lib/tasksApi';
import { getAllProjects, Project } from '../lib/projectsApi';

interface TaskFormProps {
  visible: boolean;
  task?: Task | null;
  projectId?: string;
  onClose: () => void;
  onSubmit: (task: TaskInput | TaskUpdate) => Promise<void>;
}

const TaskForm: React.FC<TaskFormProps> = ({ visible, task, projectId, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    projectId: projectId || '',
    name: '',
    description: '',
    status: 'pending' as Task['status'],
    assignee: '',
    startDate: '',
    endDate: '',
    progress: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProjects();
      if (task) {
        setFormData({
          projectId: task.projectId,
          name: task.name,
          description: task.description,
          status: task.status,
          assignee: task.assignee,
          startDate: task.startDate,
          endDate: task.endDate,
          progress: task.progress,
        });
      } else {
        setFormData({
          projectId: projectId || '',
          name: '',
          description: '',
          status: 'pending',
          assignee: '',
          startDate: '',
          endDate: '',
          progress: 0,
        });
      }
    }
  }, [visible, task, projectId]);

  const loadProjects = async () => {
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error('Ошибка загрузки проектов:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Ошибка', 'Название задачи обязательно');
      return;
    }
    if (!formData.projectId) {
      Alert.alert('Ошибка', 'Выберите проект');
      return;
    }

    setLoading(true);
    try {
      if (task) {
        await onSubmit({
          name: formData.name,
          description: formData.description,
          status: formData.status,
          assignee: formData.assignee,
          startDate: formData.startDate,
          endDate: formData.endDate,
          progress: formData.progress,
        });
      } else {
        await onSubmit({
          projectId: formData.projectId,
          name: formData.name,
          description: formData.description,
          status: formData.status,
          assignee: formData.assignee,
          startDate: formData.startDate,
          endDate: formData.endDate,
          progress: formData.progress,
        } as TaskInput);
      }
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить задачу');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions: { label: string; value: Task['status'] }[] = [
    { label: 'Ожидает', value: 'pending' },
    { label: 'В работе', value: 'in_progress' },
    { label: 'Завершена', value: 'completed' },
    { label: 'Просрочена', value: 'delayed' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{task ? 'Редактировать задачу' : 'Создать задачу'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            {!projectId && (
              <View style={styles.field}>
                <Text style={styles.label}>Проект *</Text>
                <View style={styles.pickerContainer}>
                  {projects.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pickerOption,
                        formData.projectId === p.id && styles.pickerOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, projectId: p.id })}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.projectId === p.id && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Название *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Введите название задачи"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Введите описание задачи"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Статус</Text>
              <View style={styles.pickerContainer}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      formData.status === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, status: option.value })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.status === option.value && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Исполнитель</Text>
              <TextInput
                style={styles.input}
                value={formData.assignee}
                onChangeText={(text) => setFormData({ ...formData, assignee: text })}
                placeholder="Введите имя исполнителя"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Дата начала</Text>
              <TextInput
                style={styles.input}
                value={formData.startDate}
                onChangeText={(text) => setFormData({ ...formData, startDate: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Дата окончания</Text>
              <TextInput
                style={styles.input}
                value={formData.endDate}
                onChangeText={(text) => setFormData({ ...formData, endDate: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Прогресс (%)</Text>
              <TextInput
                style={styles.input}
                value={String(formData.progress)}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  setFormData({ ...formData, progress: Math.min(100, Math.max(0, num)) });
                }}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Сохранение...' : task ? 'Сохранить' : 'Создать'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  title: {
    ...Theme.typography.h2,
    fontWeight: '700',
  },
  form: {
    padding: Theme.spacing.lg,
  },
  field: {
    marginBottom: Theme.spacing.md,
  },
  label: {
    ...Theme.typography.body,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
    color: Theme.colors.text,
  },
  input: {
    ...Theme.typography.body,
    backgroundColor: Theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    color: Theme.colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
  },
  pickerOption: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  pickerOptionText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text,
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    padding: Theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    gap: Theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.backgroundLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  submitButton: {
    flex: 1,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...Theme.typography.body,
    fontWeight: '600',
    color: '#fff',
  },
});

export default TaskForm;
