import { supabase } from './supabase';
import { Material } from '../types';

/**
 * Преобразование данных из Supabase в формат Material
 */
const mapToMaterial = (data: any): Material => ({
  id: data.id,
  name: data.name || '',
  category: data.category || data.subcategory || '',
  quantity: data.quantity || 0,
  unit: data.unit || '',
  costPerUnit: data.cost_per_unit || 0,
  supplier: data.supplier || '',
  status: data.status || 'in-stock',
  projectId: data.project_id || '',
});

/**
 * Получить все материалы
 */
export const getAllMaterials = async (): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения материалов:', error);
      throw error;
    }

    return (data || []).map(mapToMaterial);
  } catch (error) {
    console.error('Ошибка в getAllMaterials:', error);
    return [];
  }
};

/**
 * Получить материалы по категории
 */
export const getMaterialsByCategory = async (category: string): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения материалов по категории:', error);
      throw error;
    }

    return (data || []).map(mapToMaterial);
  } catch (error) {
    console.error('Ошибка в getMaterialsByCategory:', error);
    return [];
  }
};

/**
 * Получить материалы по статусу
 */
export const getMaterialsByStatus = async (status: string): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('status', status)
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения материалов по статусу:', error);
      throw error;
    }

    return (data || []).map(mapToMaterial);
  } catch (error) {
    console.error('Ошибка в getMaterialsByStatus:', error);
    return [];
  }
};

/**
 * Получить материалы с низким запасом
 */
export const getLowStockMaterials = async (): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .eq('status', 'low-stock')
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка получения материалов с низким запасом:', error);
      throw error;
    }

    return (data || []).map(mapToMaterial);
  } catch (error) {
    console.error('Ошибка в getLowStockMaterials:', error);
    return [];
  }
};

/**
 * Поиск материалов
 */
export const searchMaterials = async (searchTerm: string): Promise<Material[]> => {
  try {
    const { data, error } = await supabase
      .from('warehouse_items')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,supplier.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Ошибка поиска материалов:', error);
      throw error;
    }

    return (data || []).map(mapToMaterial);
  } catch (error) {
    console.error('Ошибка в searchMaterials:', error);
    return [];
  }
};
