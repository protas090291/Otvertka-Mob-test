// Импортируем polyfills для Android совместимости
import '../polyfills';

import { supabase, supabaseAdmin } from './supabase';

export type UserRole = 'admin' | 'management' | 'user' | 'technadzor';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Получить профиль пользователя по ID
 */
const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Ошибка получения профиля:', error);
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Ошибка в getUserProfile:', error);
    return null;
  }
};

/**
 * Вход в систему через Supabase Auth
 */
export const signIn = async (credentials: LoginCredentials): Promise<{ user: UserProfile | null; error: string | null }> => {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      if (authError.message.includes('Failed to fetch') || authError.message.includes('Network')) {
        return { user: null, error: 'Ошибка подключения к серверу. Проверьте интернет-соединение.' };
      }
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Пользователь не найден' };
    }

    // Получаем профиль пользователя
    let profile = await getUserProfile(authData.user.id);

    if (!profile) {
      // Пытаемся получить через admin клиент
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!adminError && adminProfile) {
        profile = adminProfile as UserProfile;
      } else {
        // Пытаемся создать профиль вручную, если его нет
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email || credentials.email,
            full_name: authData.user.user_metadata?.full_name || null,
            role: authData.user.user_metadata?.role || 'user',
            is_active: true,
          })
          .select()
          .single();

        if (createError || !newProfile) {
          return { user: null, error: `Профиль пользователя не найден. Обратитесь к администратору.` };
        }

        profile = newProfile as UserProfile;
      }
    }

    if (!profile) {
      return { user: null, error: 'Профиль пользователя не найден. Обратитесь к администратору для создания профиля.' };
    }

    // Проверяем, активен ли пользователь
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return { user: null, error: 'Аккаунт деактивирован. Обратитесь к администратору.' };
    }

    return { user: profile, error: null };
  } catch (error: any) {
    console.error('Ошибка входа:', error);
    return { user: null, error: error.message || 'Ошибка входа в систему' };
  }
};

/**
 * Выход из системы
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error: any) {
    console.error('Ошибка выхода:', error);
    return { error: error.message || 'Ошибка выхода из системы' };
  }
};

/**
 * Получить текущего авторизованного пользователя
 */
export const getCurrentUser = async (): Promise<{ user: UserProfile | null; error: string | null }> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      if (authError.message.includes('Failed to fetch') || authError.message.includes('Network')) {
        return { user: null, error: 'Ошибка подключения к серверу. Проверьте интернет-соединение.' };
      }
      return { user: null, error: authError.message || 'Пользователь не авторизован' };
    }

    if (!authUser) {
      return { user: null, error: 'Пользователь не авторизован' };
    }

    // Получаем профиль
    let profile: UserProfile | null = null;

    profile = await getUserProfile(authUser.id);

    if (!profile) {
      // Пытаемся через admin клиент
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!adminError && adminProfile) {
        profile = adminProfile as UserProfile;
      } else {
        return { user: null, error: 'Профиль пользователя не найден. Обратитесь к администратору.' };
      }
    }

    if (!profile) {
      return { user: null, error: 'Профиль пользователя не найден' };
    }

    // Проверяем, активен ли пользователь
    if (!profile.is_active) {
      await supabase.auth.signOut();
      return { user: null, error: 'Аккаунт деактивирован. Обратитесь к администратору.' };
    }

    return { user: profile, error: null };
  } catch (error: any) {
    console.error('Ошибка получения пользователя:', error);
    return { user: null, error: error.message || 'Ошибка получения пользователя' };
  }
};
