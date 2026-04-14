// Импортируем polyfills для Android совместимости
import '../polyfills';

import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

const supabaseUrl = 'https://yytqmdanfcwfqfqruvta.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dHFtZGFuZmN3ZnFmcXJ1dnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MzMzNDEsImV4cCI6MjA3MzEwOTM0MX0.vCgOY0MVZ6oGlZuK8SRhD8YhNyEsjP65ebJuWjy8HPw';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dHFtZGFuZmN3ZnFmcXJ1dnRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUzMzM0MSwiZXhwIjoyMDczMTA5MzQxfQ.ni200CDPDR225aDJhBHQXh17t0fnX8bXuzYflOTPYnM';

const DEFAULT_TIMEOUT = 30000; // Увеличиваем timeout до 30 секунд для мобильных устройств

// Функция для fetch с таймаутом (для React Native)
const fetchWithTimeout = async (
  resource: string | Request,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

// Создаем клиент Supabase для React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage,
    detectSessionInUrl: false, // В React Native нет URL
  },
  global: {
    fetch: (resource: any, options: any) => fetchWithTimeout(String(resource), options),
  },
});

// Admin клиент (для административных операций)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (resource: any, options: any) => fetchWithTimeout(String(resource), options),
  },
});

// Экспортируем типы для использования в API функциях
export interface Project {
  id: string;
  name: string;
  description: string;
  address: string;
  status: 'planning' | 'construction' | 'completed' | 'on-hold' | 'cancelled';
  progress: number;
  start_date: string;
  end_date: string;
  total_budget: number;
  spent: number;
  client: string;
  foreman: string;
  architect: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
