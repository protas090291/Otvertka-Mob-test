
import 'react-native-gesture-handler';

// Импортируем polyfills первыми для Android совместимости
import './polyfills';

import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { UserProfile } from './lib/authApi';

export default function App() {
  const [mode, setMode] = React.useState<'menu' | 'login' | 'nav'>('menu');
  const [authResult, setAuthResult] = React.useState<string>('');
  const [busy, setBusy] = React.useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = React.useState<UserProfile | null>(null);

  const runGetCurrentUser = async () => {
    setBusy(true);
    setAuthResult('Running getCurrentUser...');
    try {
      const authApi = require('./lib/authApi') as any;
      const res = await authApi.getCurrentUser();
      setAuthResult(JSON.stringify(res, null, 2));
    } catch (e: any) {
      setAuthResult(e?.stack ? String(e.stack) : String(e));
    } finally {
      setBusy(false);
    }
  };

  const Button = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => ({
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: pressed ? '#1F2937' : '#111827',
        borderWidth: 1,
        borderColor: '#374151',
        opacity: busy ? 0.6 : 1,
        marginTop: 10,
      })}
    >
      <Text style={{ color: '#E5E7EB', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    </Pressable>
  );

  const canRenderNavigator = Boolean(loggedInUser);

  if (mode === 'login') {
    try {
      const LoginScreen = (require('./screens/LoginScreen').default as any) || null;
      if (LoginScreen) {
        return (
          <>
            <StatusBar style="light" />
            <LoginScreen
              onLogin={(user: UserProfile) => {
                setLoggedInUser(user);
                setAuthResult(JSON.stringify({ user }, null, 2));
                setMode('menu');
              }}
            />
          </>
        );
      }
    } catch (e: any) {
      return (
        <>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: '#000000', padding: 16, paddingTop: 60 }}>
            <Text style={{ color: '#FCA5A5', fontSize: 18, fontWeight: '700' }}>LoginScreen load error</Text>
            <ScrollView style={{ marginTop: 12 }}>
              <Text style={{ color: '#FFFFFF' }}>{e?.stack ? String(e.stack) : String(e)}</Text>
            </ScrollView>
            <Button title="Back to menu" onPress={() => setMode('menu')} />
          </View>
        </>
      );
    }
  }

  if (mode === 'nav') {
    try {
      const AppNavigator = (require('./navigation/AppNavigator').default as any) || null;
      if (AppNavigator) {
        return (
          <>
            <StatusBar style="light" />
            <AppNavigator
              userRole={loggedInUser?.role ?? 'user'}
              currentUser={loggedInUser ?? ({ role: 'user' } as any)}
              onLogout={() => {
                setLoggedInUser(null);
                setMode('menu');
              }}
            />
          </>
        );
      }
    } catch (e: any) {
      return (
        <>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: '#000000', padding: 16, paddingTop: 60 }}>
            <Text style={{ color: '#FCA5A5', fontSize: 18, fontWeight: '700' }}>AppNavigator load error</Text>
            <ScrollView style={{ marginTop: 12 }}>
              <Text style={{ color: '#FFFFFF' }}>{e?.stack ? String(e.stack) : String(e)}</Text>
            </ScrollView>
            <Button title="Back to menu" onPress={() => setMode('menu')} />
          </View>
        </>
      );
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#000000', padding: 16, paddingTop: 60 }}>
        <Text style={{ color: '#00FF00', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>DIAG MENU</Text>
        <Text style={{ color: '#FFFFFF', marginTop: 10, fontSize: 14, textAlign: 'center' }}>
          Нажимай по одному пункту. Где снова станет серый экран/краш — там и виновник.
        </Text>

        <View style={{ marginTop: 16 }}>
          <Button title="Render LoginScreen" onPress={() => setMode('login')} />
          <Button
            title={canRenderNavigator ? 'Render AppNavigator' : 'Render AppNavigator (login first)'}
            onPress={() => {
              if (!canRenderNavigator) {
                setAuthResult('Login first: open LoginScreen and sign in successfully, then render AppNavigator.');
                return;
              }
              setMode('nav');
            }}
          />
          <Button title="Run getCurrentUser()" onPress={runGetCurrentUser} />
        </View>

        <ScrollView style={{ marginTop: 16, borderRadius: 10, borderWidth: 1, borderColor: '#374151', padding: 12 }}>
          <Text style={{ color: '#93C5FD', fontSize: 12, fontWeight: '700' }}>OUTPUT</Text>
          <Text style={{ color: '#E5E7EB', marginTop: 8, fontSize: 12 }}>{authResult || '(empty)'}</Text>
        </ScrollView>
      </View>
    </>
  );
}
