"use client";

import { create } from 'zustand';
import { api } from '@/lib/api';

export interface CompanyUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TENANT_ADMIN' | 'BUSINESS_OWNER' | 'CATALOG_MANAGER' | 'SALES_USER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

interface CompanyState {
  users: CompanyUser[];
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  createUser: (data: Partial<CompanyUser> & { password?: string }) => Promise<CompanyUser>;
  updateUserStatus: (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.get<CompanyUser[]>('/company-users');
      set({ users, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true });
    try {
      const newUser = await api.post<CompanyUser>('/company-users', data);
      set((state) => ({ users: [...state.users, newUser], isLoading: false }));
      return newUser;
    } catch (err: any) {
      set({ isLoading: false });
      throw err;
    }
  },

  updateUserStatus: async (id, status) => {
    await api.patch(`/company-users/${id}`, { status });
    set((state) => ({
      users: state.users.map(u => u.id === id ? { ...u, status } : u)
    }));
  }
}));
