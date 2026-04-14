import { supabase } from './supabase';

export type NotificationItem = {
  id: string;
  user_id: string;
  defect_id: string | null;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

export const listNotificationsForUser = async (userId: string, limit = 50): Promise<NotificationItem[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, defect_id, title, body, created_at, read_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Ошибка загрузки уведомлений:', error);
    return [];
  }

  return (data || []) as NotificationItem[];
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Ошибка подсчета уведомлений:', error);
    return 0;
  }

  return count || 0;
};

export const markNotificationRead = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    console.error('Ошибка отметки уведомления прочитанным:', error);
    return false;
  }
  return true;
};

export const markAllNotificationsRead = async (userId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Ошибка отметки всех уведомлений прочитанными:', error);
    return false;
  }

  return true;
};
