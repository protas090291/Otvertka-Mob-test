
import 'react-native-gesture-handler';

// Импортируем polyfills первыми для Android совместимости
import './polyfills';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './screens/LoginScreen';
import { getCurrentUser, signOut, UserProfile } from './lib/authApi';
import { Theme } from './constants/Theme';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'android') {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const { user, error } = await getCurrentUser();
      if (error || !user) {
        setCurrentUser(null);
      } else {
        setCurrentUser(user);
      }
    } catch (error: any) {
      console.error('Ошибка проверки авторизации:', error);
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <>
        <StatusBar style="light" />
        <View
          style={{
            flex: 1,
            backgroundColor: Theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={{ color: Theme.colors.text, marginTop: 16 }}>Загрузка...</Text>
        </View>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <StatusBar style="light" />
        <ErrorBoundary>
          <LoginScreen onLogin={handleLogin} />
        </ErrorBoundary>
      </>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <AppNavigator userRole={currentUser.role} currentUser={currentUser} onLogout={handleLogout} />
    </ErrorBoundary>
  );
}
