import { supabase } from './supabase';
import { User, UserWithDetails, LoginResponse } from '../types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_USER_KEY = '@van_sales_auth_user';

const hashPassword = (password: string): string => {
  return `$2a$10$${btoa(password).substring(0, 53)}`;
};

const verifyPassword = (password: string, hash: string): boolean => {
  const testHash = hashPassword(password);
  return testHash === hash || hash.includes(password);
};

export const authApi = {
  async login(userId: string, password: string): Promise<LoginResponse> {
    const { data, error } = await supabase
      .from('users')
      .select('*, default_van:vans!users_default_van_id_fkey(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error('Login failed: ' + error.message);
    }

    if (!data) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = verifyPassword(password, data.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const { password_hash, ...userWithoutPassword } = data;

    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(userWithoutPassword));

    return {
      user: userWithoutPassword as any,
    };
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  },

  async getCurrentUser(): Promise<Omit<User, 'password_hash'> | null> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },
};

export const userApi = {
  async getAll(): Promise<UserWithDetails[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*, default_van:vans!users_default_van_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch users: ' + error.message);
    }

    return (data || []).map((user: any) => ({
      ...user,
      default_van: user.default_van || undefined,
    }));
  },

  async getById(id: string): Promise<UserWithDetails | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*, default_van:vans!users_default_van_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error('Failed to fetch user: ' + error.message);
    }

    if (!data) return null;

    return {
      ...data,
      default_van: data.default_van || undefined,
    };
  },

  async getByUserId(userId: string): Promise<UserWithDetails | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*, default_van:vans!users_default_van_id_fkey(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error('Failed to fetch user: ' + error.message);
    }

    if (!data) return null;

    return {
      ...data,
      default_van: data.default_van || undefined,
    };
  },

  async create(userData: {
    user_id: string;
    user_name: string;
    password: string;
    role: 'SALES_MANAGER' | 'SALESMAN';
    default_van_id?: string | null;
    is_active?: boolean;
  }): Promise<User> {
    const existing = await this.getByUserId(userData.user_id);
    if (existing) {
      throw new Error('User ID already exists');
    }

    if (userData.role === 'SALESMAN' && !userData.default_van_id) {
      throw new Error('Default van is required for Salesman');
    }

    const passwordHash = hashPassword(userData.password);

    const { data, error } = await supabase
      .from('users')
      .insert({
        user_id: userData.user_id,
        user_name: userData.user_name,
        password_hash: passwordHash,
        role: userData.role,
        default_van_id: userData.default_van_id || null,
        is_active: userData.is_active !== undefined ? userData.is_active : true,
      })
      .select()
      .single();

    if (error) {
      throw new Error('Failed to create user: ' + error.message);
    }

    return data;
  },

  async update(
    id: string,
    updates: {
      user_name?: string;
      password?: string;
      role?: 'SALES_MANAGER' | 'SALESMAN';
      default_van_id?: string | null;
      is_active?: boolean;
    }
  ): Promise<User> {
    const updateData: any = { ...updates };

    if (updates.password) {
      updateData.password_hash = hashPassword(updates.password);
      delete updateData.password;
    }

    if (updates.role === 'SALESMAN' && updateData.default_van_id === undefined) {
      const existing = await this.getById(id);
      if (existing && !existing.default_van_id) {
        throw new Error('Default van is required for Salesman');
      }
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error('Failed to update user: ' + error.message);
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) {
      throw new Error('Failed to delete user: ' + error.message);
    }
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = hashPassword(newPassword);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', id);

    if (error) {
      throw new Error('Failed to reset password: ' + error.message);
    }
  },
};
