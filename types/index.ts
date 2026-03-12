export type UserRole = 'admin' | 'management' | 'client' | 'foreman' | 'contractor' | 'worker' | 'storekeeper' | 'technadzor' | 'user';
export type UserType = 'worker' | 'management';

export interface Project {
  id: string;
  name: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  client: string;
  foreman: string;
  architect: string;
  description: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  assignee: string;
  startDate: string;
  endDate: string;
  progress: number;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  status: 'ordered' | 'delivered' | 'in-stock' | 'low-stock';
  projectId: string;
}

export interface Defect {
  id: string;
  projectId: string;
  title: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  reportedBy: string;
  reportedDate: string;
  assignedTo?: string;
  dueDate?: string;
  photoUrl?: string;
  x_coord?: number; // Координата X на плане в процентах (0-100)
  y_coord?: number; // Координата Y на плане в процентах (0-100)
}
