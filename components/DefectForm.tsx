import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, Platform, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../constants/Theme';
import { Defect } from '../types';
import { DefectInput, DefectUpdate, uploadDefectPhoto } from '../lib/defectsApi';
import { getAllProjects, Project } from '../lib/projectsApi';
import { getActiveUserProfiles, UserProfileLite } from '../lib/authApi';

interface DefectFormProps {
  visible?: boolean;
  defect?: Defect | null;
  initialData?: Partial<DefectInput>;
  onClose?: () => void;
  onCancel?: () => void;
  onSubmit: (defect: DefectInput | DefectUpdate) => Promise<void>;
}

const DefectForm: React.FC<DefectFormProps> = ({ visible = true, defect, initialData, onSubmit, onClose, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    projectId: initialData?.projectId || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    severity: (initialData?.severity || 'medium') as Defect['severity'],
    status: (initialData?.status || 'open') as Defect['status'],
    assignedToId: (initialData as any)?.assignedToId || '',
    assignedToName: (initialData as any)?.assignedToName || initialData?.assignedTo || '',
    assignedTo: initialData?.assignedTo || '',
    dueDate: initialData?.dueDate || '',
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignees, setAssignees] = useState<UserProfileLite[]>([]);
  const [assigneePickerVisible, setAssigneePickerVisible] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [dueDatePickerVisible, setDueDatePickerVisible] = useState(false);

  const formatDateYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseYYYYMMDD = (s: string): Date | null => {
    const v = (s || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const [y, m, d] = v.split('-').map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  useEffect(() => {
    if (visible) {
      loadProjects();
      loadAssignees();
      if (defect) {
        setFormData({
          projectId: defect.projectId,
          title: defect.title,
          description: defect.description,
          location: defect.location,
          severity: defect.severity,
          status: defect.status,
          assignedToId: defect.assignedToId || '',
          assignedToName: defect.assignedToName || defect.assignedTo || '',
          assignedTo: defect.assignedTo || '',
          dueDate: defect.dueDate || '',
        });
        // Если у дефекта есть фото, показываем его
        if (defect.photoUrl) {
          setPhotoUri(defect.photoUrl);
          setSelectedPhotos([]); // Существующее фото не требует загрузки
        } else {
          setPhotoUri(null);
          setSelectedPhotos([]);
        }
      } else if (initialData) {
        setFormData({
          projectId: initialData.projectId || '',
          title: initialData.title || '',
          description: initialData.description || '',
          location: initialData.location || '',
          severity: (initialData.severity || 'medium') as Defect['severity'],
          status: (initialData.status || 'open') as Defect['status'],
          assignedToId: (initialData as any)?.assignedToId || '',
          assignedToName: (initialData as any)?.assignedToName || initialData.assignedTo || '',
          assignedTo: initialData.assignedTo || '',
          dueDate: initialData.dueDate || '',
        });
        setPhotoUri(null);
        setSelectedPhotos([]);
      } else {
        setFormData({
          projectId: '',
          title: '',
          description: '',
          location: '',
          severity: 'medium',
          status: 'open',
          assignedToId: '',
          assignedToName: '',
          assignedTo: '',
          dueDate: '',
        });
        setPhotoUri(null);
        setSelectedPhotos([]);
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
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        setSelectedPhotos((prev) => [...prev, result.assets[0].uri]);
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
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        setSelectedPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      }
    } catch (error) {
      console.error('Ошибка при выборе фото:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать фото');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
    setSelectedPhotos([]);
  };

  const handleRemoveSelectedPhoto = (uri: string) => {
    setSelectedPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const loadProjects = async () => {
    try {
      console.log('🔄 Загрузка проектов для формы дефекта...');
      const data = await getAllProjects();
      console.log('✅ Проекты загружены:', data.length);
      setProjects(data);
    } catch (error: any) {
      console.error('❌ Ошибка загрузки проектов:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить проекты');
    }
  };

  const loadAssignees = async () => {
    try {
      const data = await getActiveUserProfiles();
      setAssignees(data);
    } catch {
      setAssignees([]);
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
      if (selectedPhotos.length > 0 && !defect) {
        // Создаем временный дефект для получения ID (если создаем новый)
        // В этом случае фото загрузится после создания дефекта
        photoUrl = selectedPhotos[0]; // Сохраняем URI для последующей загрузки
      } else if (selectedPhotos.length > 0 && defect) {
        // Если редактируем существующий дефект и есть новое фото
        photoUrl = await uploadDefectPhoto(selectedPhotos[0], defect.id);
      }

      if (defect) {
        const updateData: DefectUpdate = {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          severity: formData.severity,
          status: formData.status,
          assignedToId: formData.assignedToId || undefined,
          assignedToName: formData.assignedToName || undefined,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
        };
        
        // Если есть новое фото, добавляем его URI для последующей загрузки
        if (selectedPhotos.length > 0) {
          (updateData as any).photoUris = selectedPhotos;
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
          assignedToId: formData.assignedToId || undefined,
          assignedToName: formData.assignedToName || undefined,
          assignedTo: formData.assignedTo,
          dueDate: formData.dueDate,
        };
        
        // Добавляем photoUri для последующей загрузки
        if (selectedPhotos.length > 0) {
          (inputData as any).photoUris = selectedPhotos;
          console.log('📸 DefectForm: photoUris добавлены в inputData:', selectedPhotos.length);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/6775aa3c-6f0f-4e50-8345-e04987cc8c03', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              hypothesisId: 'A',
              message: 'DefectForm: photoUri added to inputData',
              data: {hasSelectedPhoto: selectedPhotos.length > 0, photoCount: selectedPhotos.length},
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
            <TouchableOpacity onPress={onClose || onCancel}>
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
                placeholderTextColor={Theme.colors.textSecondary}
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
                placeholderTextColor={Theme.colors.textSecondary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Местоположение</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Введите местоположение"
                placeholderTextColor={Theme.colors.textSecondary}
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
              <TouchableOpacity
                style={styles.input}
                onPress={() => {
                  setAssigneeSearch('');
                  setAssigneePickerVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: formData.assignedToName ? Theme.colors.text : Theme.colors.textSecondary }}>
                  {formData.assignedToName ? formData.assignedToName : 'Выберите исполнителя'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Срок исправления</Text>
              <TouchableOpacity
                style={styles.input}
                activeOpacity={0.8}
                onPress={() => setDueDatePickerVisible(true)}
              >
                <Text style={{ color: formData.dueDate ? Theme.colors.text : Theme.colors.textSecondary }}>
                  {formData.dueDate ? formData.dueDate : 'Выберите дату'}
                </Text>
              </TouchableOpacity>
              {dueDatePickerVisible ? (
                <DateTimePicker
                  value={parseYYYYMMDD(formData.dueDate) || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(event: any, selected?: Date) => {
                    if (Platform.OS !== 'ios') {
                      setDueDatePickerVisible(false);
                    }
                    if (event?.type === 'dismissed') return;
                    if (!selected) return;
                    setFormData((prev) => ({ ...prev, dueDate: formatDateYYYYMMDD(selected) }));
                  }}
                />
              ) : null}
              {Platform.OS === 'ios' && dueDatePickerVisible ? (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Theme.spacing.sm }}>
                  <TouchableOpacity
                    style={{ paddingVertical: Theme.spacing.sm, paddingHorizontal: Theme.spacing.md }}
                    onPress={() => setDueDatePickerVisible(false)}
                  >
                    <Text style={{ color: Theme.colors.primary, fontWeight: '700' }}>Готово</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
                    {selectedPhotos.length === 0 && (
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
            {selectedPhotos.length > 0 && (
              <View style={{ marginTop: Theme.spacing.sm }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedPhotos.map((uri) => (
                    <View key={uri} style={{ marginRight: Theme.spacing.sm }}>
                      <View style={styles.photoPreviewSmall}>
                        <Image source={{ uri }} style={styles.photoImageSmall} contentFit="cover" />
                        <TouchableOpacity
                          style={styles.removePhotoButtonSmall}
                          onPress={() => handleRemoveSelectedPhoto(uri)}
                        >
                          <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, Theme.spacing.md) }]}>
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

      <AssigneePickerModal
        visible={assigneePickerVisible}
        assignees={assignees}
        search={assigneeSearch}
        onChangeSearch={setAssigneeSearch}
        onSelect={(u) => setFormData((prev) => ({ ...prev, assignedToId: u.id, assignedToName: u.displayName, assignedTo: u.displayName }))}
        onClose={() => setAssigneePickerVisible(false)}
      />
    </Modal>
  );
};

const AssigneePickerModal: React.FC<{
  visible: boolean;
  assignees: UserProfileLite[];
  search: string;
  onChangeSearch: (v: string) => void;
  onSelect: (u: UserProfileLite) => void;
  onClose: () => void;
}> = ({ visible, assignees, search, onChangeSearch, onSelect, onClose }) => {
  const insets = useSafeAreaInsets();
  const normalized = search.trim().toLowerCase();
  const filtered = normalized
    ? assignees.filter((u) => u.displayName.toLowerCase().includes(normalized))
    : assignees;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              maxHeight: '80%',
              marginBottom: insets.bottom,
              paddingBottom: Math.max(insets.bottom, Theme.spacing.md),
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Выбор исполнителя</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: Theme.spacing.lg, paddingBottom: Theme.spacing.md }}>
            <TextInput
              style={styles.input}
              value={search}
              onChangeText={onChangeSearch}
              placeholder="Поиск по имени"
              placeholderTextColor={Theme.colors.textSecondary}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ paddingHorizontal: Theme.spacing.lg, paddingVertical: Theme.spacing.md }}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={{ color: Theme.colors.text, fontSize: 16 }}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: Theme.colors.border, marginHorizontal: Theme.spacing.lg }} />
            )}
          />
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
    backgroundColor: Theme.colors.cardBackgroundLight,
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
    backgroundColor: Theme.colors.cardBackgroundLight,
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
    backgroundColor: Theme.colors.cardBackgroundLight,
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
  photoPreviewSmall: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.cardBackgroundLight,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoImageSmall: {
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
  removePhotoButtonSmall: {
    position: 'absolute',
    top: 2,
    right: 2,
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
    backgroundColor: Theme.colors.cardBackgroundLight,
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
