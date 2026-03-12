// Обертка для AsyncStorage, совместимая с Expo
import AsyncStorage from '@react-native-async-storage/async-storage';

// Создаем интерфейс, совместимый с Supabase Storage
export const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Ошибка чтения из AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Ошибка записи в AsyncStorage:', error);
      throw error;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Ошибка удаления из AsyncStorage:', error);
      throw error;
    }
  },
};
