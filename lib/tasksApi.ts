import { supabase } from './supabase';
import { Task } from '../types';

/**
 * Преобразование данных из Supabase в формат Task
 */
const mapToTask = (data: any): Task => ({
  id: data.id,
  projectId: data.project_id,
  name: data.title || data.name,
  description: data.description || '',
  status: data.status || 'pending',
  assignee: data.assigned_to || data.assignee || '',
  startDate: data.start_date || '',
  endDate: data.end_date || '',
  progress: data.progress_percentage || data.progress || 0,
});

/**
 * Получить все задачи
 */
export const getAllTasks = async (limit?: number): Promise<Task[]> => {
  try {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Ограничиваем количество записей для оптимизации (по умолчанию 100)
    if (limit) {
      query = query.limit(limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения задач:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getAllTasks:', error);
    return [];
  }
};

/**
 * Получить задачу по ID
 */
export const getTaskById = async (id: string): Promise<Task | null> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Ошибка получения задачи:', error);
      throw error;
    }

    return data ? mapToTask(data) : null;
  } catch (error) {
    console.error('Ошибка в getTaskById:', error);
    return null;
  }
};

/**
 * Получить задачи по проекту
 */
export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения задач по проекту:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getTasksByProject:', error);
    return [];
  }
};

/**
 * Получить задачи по статусу
 */
export const getTasksByStatus = async (status: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения задач по статусу:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getTasksByStatus:', error);
    return [];
  }
};

/**
 * Получить задачи по исполнителю
 */
export const getTasksByAssignee = async (assignee: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', assignee)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения задач по исполнителю:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getTasksByAssignee:', error);
    return [];
  }
};

/**
 * Получить просроченные задачи
 */
export const getOverdueTasks = async (): Promise<Task[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .lt('end_date', today)
      .in('status', ['pending', 'in-progress'])
      .order('end_date', { ascending: true });

    if (error) {
      console.error('Ошибка получения просроченных задач:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getOverdueTasks:', error);
    return [];
  }
};

/**
 * Получить задачи на сегодня
 */
export const getTodayTasks = async (): Promise<Task[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('start_date', today)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Ошибка получения задач на сегодня:', error);
      throw error;
    }

    return (data || []).map(mapToTask);
  } catch (error) {
    console.error('Ошибка в getTodayTasks:', error);
    return [];
  }
};

export interface TaskInput {
  projectId: string;
  name: string;
  description?: string;
  status: Task['status'];
  assignee?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
}

export interface TaskUpdate {
  projectId?: string;
  name?: string;
  description?: string;
  status?: Task['status'];
  assignee?: string;
  startDate?: string;
  endDate?: string;
  progress?: number;
}

/**
 * Создать новую задачу
 */
export const createTask = async (task: TaskInput): Promise<Task | null> => {
  try {
    const insertData: any = {
      project_id: task.projectId,
      title: task.name,
      status: task.status || 'pending',
      progress_percentage: task.progress || 0,
    };

    if (task.description) {
      insertData.description = task.description;
    }
    if (task.assignee) {
      insertData.assigned_to = task.assignee;
    }
    if (task.startDate) {
      insertData.start_date = task.startDate;
    }
    if (task.endDate) {
      insertData.end_date = task.endDate;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания задачи:', error);
      throw error;
    }

    return data ? mapToTask(data) : null;
  } catch (error) {
    console.error('Ошибка в createTask:', error);
    return null;
  }
};

/**
 * Обновить задачу
 */
export const updateTask = async (id: string, updates: TaskUpdate): Promise<Task | null> => {
  try {
    const updateData: any = {};

    if (updates.projectId !== undefined) {
      updateData.project_id = updates.projectId;
    }
    if (updates.name !== undefined) {
      updateData.title = updates.name;
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    if (updates.assignee !== undefined) {
      updateData.assigned_to = updates.assignee;
    }
    if (updates.startDate !== undefined) {
      updateData.start_date = updates.startDate;
    }
    if (updates.endDate !== undefined) {
      updateData.end_date = updates.endDate;
    }
    if (updates.progress !== undefined) {
      updateData.progress_percentage = updates.progress;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления задачи:', error);
      throw error;
    }

    return data ? mapToTask(data) : null;
  } catch (error) {
    console.error('Ошибка в updateTask:', error);
    return null;
  }
};

/**
 * Удалить задачу
 */
export const deleteTask = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Ошибка удаления задачи:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Ошибка в deleteTask:', error);
    return false;
  }
};

/**
 * Получить общий прогресс проекта на основе таблицы progress_data
 */
export const getProjectProgress = async (projectId: string): Promise<{
  totalProgress: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  delayedTasks: number;
  averageProgress: number;
}> => {
  try {
    console.log('🔄 Получение прогресса проекта из progress_data:', projectId);
    
    // Получаем данные из таблицы progress_data
    const { data, error } = await supabase
      .from('progress_data')
      .select('task_name, section, apartment_id, fact_progress, plan_progress');

    if (error) {
      console.error('❌ Ошибка получения данных прогресса:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Нет данных прогресса для проекта:', projectId);
      return {
        totalProgress: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
        delayedTasks: 0,
        averageProgress: 0
      };
    }

    // Группируем по работам (task_name + section)
    const workGroups: { [key: string]: number[] } = {};
    const apartments = new Set<string>();

    data.forEach((item: any) => {
      const workKey = `${item.task_name}|${item.section}`;
      if (!workGroups[workKey]) {
        workGroups[workKey] = [];
      }
      workGroups[workKey].push(item.fact_progress || 0);
      apartments.add(item.apartment_id);
    });

    // Рассчитываем общий прогресс каждой работы
    const workProgresses = Object.values(workGroups).map(progresses => 
      progresses.reduce((sum, progress) => sum + progress, 0) / progresses.length
    );

    const totalWorks = Object.keys(workGroups).length;
    const totalApartments = apartments.size;
    // Защита от деления на ноль
    const averageProgress = totalWorks > 0 
      ? workProgresses.reduce((sum, progress) => sum + progress, 0) / workProgresses.length
      : 0;
    
    // Подсчитываем работы по статусам
    const completedTasks = workProgresses.filter(progress => progress === 100).length;
    const inProgressTasks = workProgresses.filter(progress => progress > 0 && progress < 100).length;
    const notStartedTasks = workProgresses.filter(progress => progress === 0).length;

    console.log('✅ Прогресс проекта рассчитан из progress_data:', {
      projectId,
      totalWorks,
      totalApartments,
      averageProgress: Math.round(averageProgress),
      completedTasks,
      inProgressTasks,
      notStartedTasks
    });

    // Округляем averageProgress, но гарантируем число
    const finalAverageProgress = isNaN(averageProgress) ? 0 : Math.round(averageProgress);
    
    return {
      totalProgress: totalWorks > 0 ? Math.round(workProgresses.reduce((sum, p) => sum + p, 0)) : 0,
      totalTasks: totalWorks,
      completedTasks,
      inProgressTasks,
      pendingTasks: notStartedTasks,
      delayedTasks: 0, // В progress_data нет статуса delayed
      averageProgress: finalAverageProgress
    };
  } catch (error) {
    console.error('❌ Ошибка в getProjectProgress:', error);
    return {
      totalProgress: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      delayedTasks: 0,
      averageProgress: 0
    };
  }
};
