import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, PermissionsAndroid } from 'react-native';
import * as Speech from 'expo-speech';
import { Theme } from '../constants/Theme';
import VoiceControlButton from './VoiceControlButton';

// Безопасный импорт Constants
let Constants: any = null;
try {
  Constants = require('expo-constants').default;
} catch (e) {
  console.warn('⚠️ expo-constants недоступен:', e);
}

// Условный импорт Voice - только если не в Expo Go
let Voice: any = null;
try {
  // Проверяем, не в Expo Go ли мы
  const isExpoGo = Constants?.executionEnvironment === 'storeClient';
  if (!isExpoGo && Constants) {
    Voice = require('@react-native-voice/voice').default;
  }
} catch (e) {
  console.warn('⚠️ @react-native-voice/voice недоступен:', e);
}

interface VoiceCommandButtonProps {
  navigation: any;
  userRole: string;
}

const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ navigation, userRole }) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  
  // Проверяем, в Expo Go ли мы
  const isExpoGo = Constants?.executionEnvironment === 'storeClient';

  useEffect(() => {
    // Если в Expo Go, голосовое управление недоступно
    if (isExpoGo || !Voice) {
      setIsAvailable(false);
      return;
    }

    // Проверка доступности распознавания речи
    Voice.isAvailable().then((available: boolean) => {
      setIsAvailable(available);
      if (!available) {
        console.warn('⚠️ Распознавание речи недоступно на этом устройстве');
      }
    }).catch((err: any) => {
      console.error('Ошибка проверки доступности:', err);
      setIsAvailable(false);
    });

    // Обработчики событий Voice
    Voice.onSpeechStart = () => {
      console.log('🎤 Начало распознавания речи');
      setError('');
    };

    Voice.onSpeechRecognized = () => {
      console.log('✅ Речь распознана');
    };

    Voice.onSpeechEnd = () => {
      console.log('🔚 Конец распознавания речи');
      setIsListening(false);
    };

    Voice.onSpeechError = (e: any) => {
      console.error('❌ Ошибка распознавания:', e);
      setError(e.error?.message || 'Ошибка распознавания речи');
      setIsListening(false);
      
      // Не говорим об ошибке, если пользователь просто остановил запись
      if (e.error?.code !== '7' && e.error?.code !== '6') {
        Speech.speak('Ошибка распознавания. Попробуйте еще раз', { language: 'ru' });
      }
    };

    Voice.onSpeechResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        const text = e.value[0];
        console.log('📝 Распознанный текст:', text);
        setRecognizedText(text);
        handleCommand(text);
      }
    };

    Voice.onSpeechPartialResults = (e: any) => {
      if (e.value && e.value.length > 0) {
        const partialText = e.value[0];
        console.log('📝 Частичный результат:', partialText);
        setRecognizedText(partialText);
      }
    };

    return () => {
      if (Voice) {
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
        }).catch((err: any) => {
          console.error('Ошибка при очистке Voice:', err);
        });
      }
    };
  }, [isExpoGo]);

  // Запрос разрешений на Android
  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Разрешение на использование микрофона',
            message: 'Приложению нужен доступ к микрофону для голосового управления',
            buttonNeutral: 'Спросить позже',
            buttonNegative: 'Отмена',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Ошибка запроса разрешения:', err);
        return false;
      }
    }
    return true; // iOS обрабатывает разрешения автоматически
  };

  // Парсинг номера квартиры из текста
  const parseApartmentNumber = (text: string): string | null => {
    // Паттерны для поиска номеров квартир
    const patterns = [
      /(?:квартир[аеы]?|кв\.?)\s*([ттуу]\s*\d+)/i,  // "квартира Т203", "кв. У501"
      /([ттуу]\s*\d+)/i,                              // "Т203", "У501"
      /(?:квартир[аеы]?|кв\.?)\s*(\d{3,4})/i,         // "квартира 203", "кв. 404"
      /(\d{3,4})/i,                                    // "203", "404", "1003"
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let apartmentNumber = match[1].trim().toUpperCase();
        
        // Нормализация: добавляем префикс Т если его нет
        if (!apartmentNumber.match(/^[ТТУУ]/)) {
          // Если номер начинается с цифры, добавляем Т
          if (apartmentNumber.match(/^\d/)) {
            apartmentNumber = 'Т' + apartmentNumber;
          }
        }
        
        // Заменяем латиницу на кириллицу для отображения
        apartmentNumber = apartmentNumber.replace(/T/g, 'Т').replace(/U/g, 'У');
        
        return apartmentNumber;
      }
    }
    
    return null;
  };

  // Обработка команд с парсингом номеров квартир
  const handleCommand = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    const apartmentNumber = parseApartmentNumber(text);
    
    console.log('🔍 Обработка команды:', { text, lowerText, apartmentNumber });

    // Команды для навигации к дефектам конкретной квартиры
    if ((lowerText.includes('дефект') || lowerText.includes('дефекты')) 
        && (lowerText.includes('квартир') || lowerText.includes('кв') || apartmentNumber)) {
      
      if (apartmentNumber) {
        // Нормализуем для поиска в БД (латиница)
        const normalizedApt = apartmentNumber.startsWith('Т') || apartmentNumber.startsWith('T')
          ? 'T' + apartmentNumber.substring(1)
          : apartmentNumber.startsWith('У') || apartmentNumber.startsWith('U')
          ? 'U' + apartmentNumber.substring(1)
          : 'T' + apartmentNumber;
        
        navigation.navigate('Main', {
          screen: 'Defects',
          params: { 
            apartmentFilter: normalizedApt,
            userRole 
          }
        });
        Speech.speak(`Открываю дефекты квартиры ${apartmentNumber}`, { language: 'ru' });
        return;
      } else {
        // Просто "дефекты" или "показать дефекты" без номера квартиры
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю список дефектов', { language: 'ru' });
        return;
      }
    }

    // Команды для создания дефекта в конкретной квартире
    if ((lowerText.includes('создай') || lowerText.includes('создать') || 
         lowerText.includes('добавь') || lowerText.includes('добавить') ||
         lowerText.includes('отметь') || lowerText.includes('отметить')) 
        && lowerText.includes('дефект') 
        && (lowerText.includes('квартир') || lowerText.includes('кв') || apartmentNumber)) {
      
      if (apartmentNumber) {
        // Нормализуем для поиска в БД (латиница)
        const normalizedApt = apartmentNumber.startsWith('Т') || apartmentNumber.startsWith('T')
          ? 'T' + apartmentNumber.substring(1)
          : apartmentNumber.startsWith('У') || apartmentNumber.startsWith('U')
          ? 'U' + apartmentNumber.substring(1)
          : 'T' + apartmentNumber;
        
        // Определяем здание по номеру квартиры
        const buildingId = normalizedApt.startsWith('U') ? 'U' : 'T';
        
        // Переходим на экран выбора здания с предустановленным номером квартиры
        navigation.navigate('BuildingSelection', { 
          userRole,
          apartmentNumber: normalizedApt,
          autoSelect: true // Флаг для автоматического выбора
        });
        Speech.speak(`Открываю создание дефекта в квартире ${apartmentNumber}`, { language: 'ru' });
        return;
      } else {
        // Просто "создать дефект" без номера квартиры
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю создание дефекта', { language: 'ru' });
        return;
      }
    }

    // Простые команды без параметров
    const simpleCommands: { [key: string]: () => void } = {
      'создать дефект': () => {
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю создание дефекта', { language: 'ru' });
      },
      'добавить дефект': () => {
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю создание дефекта', { language: 'ru' });
      },
      'показать дефекты': () => {
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю список дефектов', { language: 'ru' });
      },
      'открыть дефекты': () => {
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю список дефектов', { language: 'ru' });
      },
      'дефекты': () => {
        navigation.navigate('Main', { screen: 'Defects', params: { userRole } });
        Speech.speak('Открываю дефекты', { language: 'ru' });
      },
      'создать задачу': () => {
        navigation.navigate('Schedule');
        Speech.speak('Открываю создание задачи', { language: 'ru' });
      },
      'показать проекты': () => {
        navigation.navigate('Projects');
        Speech.speak('Открываю список проектов', { language: 'ru' });
      },
      'открыть проекты': () => {
        navigation.navigate('Projects');
        Speech.speak('Открываю список проектов', { language: 'ru' });
      },
      'проекты': () => {
        navigation.navigate('Projects');
        Speech.speak('Открываю проекты', { language: 'ru' });
      },
      'показать материалы': () => {
        navigation.navigate('Materials');
        Speech.speak('Открываю список материалов', { language: 'ru' });
      },
      'материалы': () => {
        navigation.navigate('Materials');
        Speech.speak('Открываю материалы', { language: 'ru' });
      },
      'главная': () => {
        navigation.navigate('Main', { screen: 'Dashboard', params: { userRole } });
        Speech.speak('Возвращаюсь на главную', { language: 'ru' });
      },
      'домой': () => {
        navigation.navigate('Main', { screen: 'Dashboard', params: { userRole } });
        Speech.speak('Возвращаюсь на главную', { language: 'ru' });
      },
    };

    // Поиск простой команды
    for (const [command, action] of Object.entries(simpleCommands)) {
      if (lowerText.includes(command)) {
        action();
        return;
      }
    }

    // Если команда не распознана
    Speech.speak('Команда не распознана. Попробуйте еще раз', { language: 'ru' });
    console.log('⚠️ Команда не распознана:', text);
  };

  const startListening = async () => {
    try {
      // Проверка на Expo Go
      if (isExpoGo || !Voice) {
        Alert.alert(
          'Голосовое управление недоступно',
          'Голосовое управление работает только в development build приложения.\n\nВ Expo Go эта функция недоступна, так как требует нативных модулей.\n\nДля использования голосового управления создайте development build:\nnpx expo run:ios или npx expo run:android',
          [{ text: 'Понятно' }]
        );
        return;
      }

      // Проверка доступности
      if (!isAvailable) {
        Alert.alert(
          'Недоступно',
          'Распознавание речи недоступно на этом устройстве'
        );
        return;
      }

      // Запрос разрешений
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        Alert.alert(
          'Нет разрешения',
          'Для работы голосового управления необходимо разрешение на использование микрофона'
        );
        return;
      }

      setError('');
      setRecognizedText('');
      setIsListening(true);
      
      Speech.speak('Слушаю команду', { language: 'ru' });
      
      // Запуск распознавания речи с русским языком
      await Voice.start('ru-RU');
      
    } catch (e: any) {
      console.error('Ошибка запуска распознавания:', e);
      setError(e.message || 'Не удалось начать распознавание');
      setIsListening(false);
      Alert.alert(
        'Ошибка', 
        'Не удалось начать распознавание речи. Проверьте разрешения микрофона и доступность распознавания речи на устройстве.'
      );
    }
  };

  const stopListening = async () => {
    try {
      if (Voice) {
        await Voice.stop();
      }
      setIsListening(false);
      Speech.speak('Остановлено', { language: 'ru' });
    } catch (e: any) {
      console.error('Ошибка остановки:', e);
      setIsListening(false);
    }
  };

  return (
    <View style={styles.container}>
      <VoiceControlButton
        isListening={isListening}
        onPress={isListening ? stopListening : startListening}
        disabled={!isAvailable || isExpoGo || !Voice}
      />
      {isExpoGo || !Voice ? (
        <Text style={styles.warningText}>
          ⚠️ Голосовое управление доступно только в development build{'\n'}
          (не работает в Expo Go)
        </Text>
      ) : null}
      {recognizedText ? (
        <Text style={styles.recognizedText}>Распознано: {recognizedText}</Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!isExpoGo && Voice ? (
        <Text style={styles.hintText}>
          Примеры команд:{'\n'}
          "Перейди в дефекты квартиры 203"{'\n'}
          "Создай дефект в квартире 404"{'\n'}
          "Показать дефекты"
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  recognizedText: {
    marginTop: 12,
    fontSize: 14,
    color: Theme.colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: Theme.colors.error || '#ef4444',
    textAlign: 'center',
  },
  hintText: {
    marginTop: 12,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  warningText: {
    marginTop: 12,
    fontSize: 11,
    color: '#f59e0b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});

export default VoiceCommandButton;
