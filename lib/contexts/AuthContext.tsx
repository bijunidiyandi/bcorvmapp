import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../services/auth';
import { User, UserRole } from '../types/database';

interface AuthUser extends Omit<User, 'password_hash'> {
  salesman_type?: string | null;
  default_van?: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  signIn: (userId: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isSalesManager: () => boolean;
  isSalesman: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser as AuthUser);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (userId: string, password: string) => {
    try {
      const response = await authApi.login(userId, password);
      setUser(response.user as AuthUser);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const isSalesManager = () => {
    return user?.role === 'SALES_MANAGER';
  };

  const isSalesman = () => {
    return user?.role === 'SALESMAN';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        role: user?.role || null,
        signIn,
        signOut,
        refreshUser,
        isSalesManager,
        isSalesman,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
