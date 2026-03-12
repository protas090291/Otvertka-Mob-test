import { supabase, Project } from './supabase';

// Реэкспортируем Project для использования в других модулях
export type { Project };

export interface ProjectInput {
  name: string;
  description: string;
  address: string;
  status: 'planning' | 'construction' | 'completed' | 'on-hold' | 'cancelled';
  start_date: string;
  end_date: string;
  total_budget: number;
  client: string;
  foreman: string;
  architect: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  address?: string;
  status?: 'planning' | 'construction' | 'completed' | 'on-hold' | 'cancelled';
  progress?: number;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  spent?: number;
  client?: string;
  foreman?: string;
  architect?: string;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  averageProgress: number;
  statusBreakdown: {
    [status: string]: number;
  };
}

/**
 * Получить все проекты
 */
export const getAllProjects = async (): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения проектов:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Ошибка в getAllProjects:', error);
    return [];
  }
};

/**
 * Получить проект по ID
 */
export const getProjectById = async (id: string): Promise<Project | null> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Ошибка получения проекта:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Ошибка в getProjectById:', error);
    return null;
  }
};

/**
 * Получить проекты по статусу
 */
export const getProjectsByStatus = async (status: string): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения проектов по статусу:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Ошибка в getProjectsByStatus:', error);
    return [];
  }
};

/**
 * Получить активные проекты
 */
export const getActiveProjects = async (): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('status', ['planning', 'construction'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка получения активных проектов:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Ошибка в getActiveProjects:', error);
    return [];
  }
};

/**
 * Поиск проектов
 */
export const searchProjects = async (searchTerm: string): Promise<Project[]> => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,client.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка поиска проектов:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Ошибка в searchProjects:', error);
    return [];
  }
};

/**
 * Получить статистику проектов
 */
export const getProjectStats = async (): Promise<ProjectStats> => {
  try {
    const projects = await getAllProjects();
    
    let totalProjects = projects.length;
    let activeProjects = 0;
    let completedProjects = 0;
    let totalBudget = 0;
    let totalSpent = 0;
    let totalProgress = 0;
    const statusBreakdown: { [status: string]: number } = {};

    projects.forEach(project => {
      totalBudget += project.total_budget || 0;
      totalSpent += project.spent || 0;
      totalProgress += project.progress || 0;

      if (project.status === 'construction') {
        activeProjects++;
      } else if (project.status === 'completed') {
        completedProjects++;
      }

      statusBreakdown[project.status] = (statusBreakdown[project.status] || 0) + 1;
    });

    const averageProgress = totalProjects > 0 ? totalProgress / totalProjects : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      averageProgress: Math.round(averageProgress * 100) / 100,
      statusBreakdown
    };
  } catch (error) {
    console.error('Ошибка в getProjectStats:', error);
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalBudget: 0,
      totalSpent: 0,
      averageProgress: 0,
      statusBreakdown: {}
    };
  }
};
