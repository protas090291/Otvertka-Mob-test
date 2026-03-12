import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../constants/Theme';
import { Defect } from '../types';
import { DefectInput, DefectUpdate, uploadDefectPhoto } from '../lib/defectsApi';
import { getAllProjects, Project } from '../lib/projectsApi';

interface DefectFormProps {
  visible?: boolean;
  defect?: Defect | null;
  initialData?: Partial<DefectInput>;
  onClose?: () => void;
  onCancel?: () => void;
  onSubmit: (defect: DefectInput | DefectUpdate) => Promise<void>;
}

const DefectForm: React.FC<DefectFormProps> = ({ visible = true, defect, initialData, onSubmit, onClose, onCancel }) => {
  const [formData, setFormData] = useState({
    projectId: initialData?.projectId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    severity: (initialData?.severity || 'medium') as Defect['severity'],
    status: (initialData?.status || 'open') as Defect['status'],
    assignedTo: initialData?.assignedTo || '',
    dueDate: initialData?.dueDate || '',
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadProjects();
      if (defect) {
        setFormData({
          projectId: defect.projectId,
          title: defect.title,
          description: defect.description,
          location: defect.location,
          severity: defect.severity,
          status: defect.status,
          assignedTo: defect.assignedTo || '',
          dueDate: defect.dueDate || '',
        });
        // Если у дефекта есть фото, показываем его
        if (defect.photoUrl) {
          setPhotoUri(defect.photoUrl);
          setSelectedPhoto(null); // Существующее фото не требует загрузки
        } else {
          setPhotoUri(null);
          setSelectedPhoto(null);
        }
      } else if (initialData) {
        setFormData({
          projectId: initialData.projectId || '',
          title: initialData.title || '',
          description: initialData.description || '',
          location: initialData.location || '',
          severity: (initialData.severity || 'medium') as Defect['severity'],
          status: (initialData.status || 'open') as Defect['status'],
          assignedTo: initialData.assignedTo || '',
          dueDate: initialData.dueDate || '',
        });
        setPhotoUri(null);
        setSelectedPhoto(null);
      } else {
        setFormData({
          projectId: '',
          title: '',
          description: '',
          location: '',
          severity: 'medium',
          status: 'open',
          assignedTo: '',
          dueDate: '',
        });
        setPhotoUri(null);
        setSelectedPhoto(null);
      }
    }
  }, [visible, defect, initialData]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert('Ошибка', 'Необходимы разрешения для доступа к камере и медиатеке');
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Ошибка при съемке фото:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const handlePickPhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setSelectedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Ошибка при выборе фото:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать фото');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setSelectedPhoto(null);
  };

  const loadProjects = async () => {
    try {
      console.log('🔄 Загрузка проектов для формы дефекта...');
      const data = await getAllProjects();
      console.log('✅ Проекты загружены:', data.length);
      setProjects(data);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки проектов:', error);
      // Не показываем ошибку пользователю, просто используем пустой список
      // Форма может работать и без выбора проекта
      setProjects([]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Ошибка', 'Название дефекта обязательно');
      return;
    }

    setLoading(true);
    try {
      let photoUrl: string | null = null;
      
      // Если есть новое фото, загружаем его
      if (selectedPhoto && !defect) {
        // Создаем временный дефект для получения ID (если создаем новый)
        // В этом случае фото загрузится после создания дефекта
        photoUrl = selectedPhoto; // Сохраняем URI для последующей загрузки
      } else if (selectedPhoto && defect) {
        // Если редактируем существующий дефект и есть новое фото
        photoUrl = await uploadDefectPhoto(selectedPhoto, defect.id);
      }

      if (defect) {
        const updateData: DefectUpdate = {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          severity: formData.severity,
          status: formData.status,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
        };
        
        // Если есть новое фото, добавляем его URI для последующей загрузки
        if (selectedPhoto) {
          (updateData as any).photoUri = selectedPhoto;
        }
        
        await onSubmit(updateData);
      } else {
        const inputData: DefectInput = {
          projectId: formData.projectId || undefined,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          severity: formData.severity,
          status: formData.status,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
        };
        
        // Добавляем photoUri для последующей загрузки
        if (selectedPhoto) {
          (inputData as any).photoUri = selectedPhoto;
          console.log('📸 DefectForm: photoUri добавлен в inputData:', selectedPhoto);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              hypothesisId: 'A',
              message: 'DefectForm: photoUri added to inputData',
              data: {hasSelectedPhoto: !!selectedPhoto, photoUri: selectedPhoto},
              timestamp: Date.now(),
              sessionId: 'debug-session',
              location: 'DefectForm.tsx:213'
            })
          }).catch(() => {});
          // #endregion
        } else {
          console.log('📸 DefectForm: фото не выбрано');
        }
        
        // Создаем дефект
        await onSubmit(inputData);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Ошибка сохранения дефекта:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить дефект');
    } finally {
      setLoading(false);
    }
  };

  const severityOptions: { label: string; value: Defect['severity'] }[] = [
    { label: 'Низкий', value: 'low' },
    { label: 'Средний', value: 'medium' },
    { label: 'Высокий', value: 'high' },
    { label: 'Критичный', value: 'critical' },
  ];

  const statusOptions: { label: string; value: Defect['status'] }[] = [
    { label: 'Открыт', value: 'open' },
    { label: 'В работе', value: 'in-progress' },
    { label: 'Исправлен', value: 'resolved' },
    { label: 'Закрыт', value: 'closed' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{defect ? 'Редактировать дефект' : 'Создать дефект'}</Text>
            <TouchableOpacity onPress={onClose || onCancel || (() => {})}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Проект</Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>Название *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Введите название дефекта"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Введите описание дефекта"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Местоположение</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Введите местоположение"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Серьезность</Text>
              <View style={styles.pickerContainer}>
                {severityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      formData.severity === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, severity: option.value })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.severity === option.value && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
              <Text style={styles.label}>Назначен на</Text>
              <TextInput
                style={styles.input}
                value={formData.assignedTo}
                onChangeText={(text) => setFormData({ ...formData, assignedTo: text })}
                placeholder="Введите имя исполнителя"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Срок исправления</Text>
              <TextInput
                style={styles.input}
                value={formData.dueDate}
                onChangeText={(text) => setFormData({ ...formData, dueDate: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Фото</Text>
              <View style={styles.photoContainer}>
                {photoUri ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: photoUri }} style={styles.photoImage} contentFit="cover" />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={handleRemovePhoto}
                    >
                      <Ionicons name="close-circle" size={24} color={Theme.colors.error} />
                    </TouchableOpacity>
                    {!selectedPhoto && (
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoOverlayText}>Существующее фото</Text>
                        <View style={styles.photoButtons}>
                          <TouchableOpacity
                            style={styles.photoButtonSmall}
                            onPress={handleTakePhoto}
                          >
                            <Ionicons name="camera" size={20} color="#fff" />
                            <Text style={styles.photoButtonTextSmall}>Новое</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.photoButtonSmall}
                            onPress={handlePickPhoto}
                          >
                            <Ionicons name="image" size={20} color="#fff" />
                            <Text style={styles.photoButtonTextSmall}>Выбрать</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera" size={24} color={Theme.colors.primary} />
                      <Text style={styles.photoButtonText}>Сделать фото</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoButton}
                      onPress={handlePickPhoto}
                    >
                      <Ionicons name="image" size={24} color={Theme.colors.primary} />
                      <Text style={styles.photoButtonText}>Выбрать из галереи</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
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
                {loading ? 'Сохранение...' : defect ? 'Сохранить' : 'Создать'}
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
  photoContainer: {
    marginTop: Theme.spacing.xs,
  },
  photoPreview: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: Theme.spacing.sm,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: Theme.spacing.xs,
    right: Theme.spacing.xs,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: Theme.borderRadius.full,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    gap: Theme.spacing.xs,
  },
  photoButtonText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.primary,
    fontWeight: '500',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: Theme.spacing.sm,
  },
  photoOverlayText: {
    ...Theme.typography.bodySmall,
    color: '#fff',
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  photoButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xs,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.sm,
    gap: Theme.spacing.xs,
    marginHorizontal: Theme.spacing.xs,
  },
  photoButtonTextSmall: {
    ...Theme.typography.caption,
    color: '#fff',
    fontWeight: '500',
  },
});

export default DefectForm;
