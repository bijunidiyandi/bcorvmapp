import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Van } from '../types/database';
import { authApi } from '../services/auth';
import { vanApi } from '../services/sqlite-api';

interface VanContextType {
  selectedVan: Van | null;
  setSelectedVan: (van: Van | null) => Promise<void>;
  loading: boolean;
  canChangeVan: boolean;
}

const VanContext = createContext<VanContextType | undefined>(undefined);

const VAN_STORAGE_KEY = '@van_sales:selected_van';

export function VanProvider({ children }: { children: React.ReactNode }) {
  const [selectedVan, setSelectedVanState] = useState<Van | null>(null);
  const [loading, setLoading] = useState(true);
  const [canChangeVan, setCanChangeVan] = useState(true);

  useEffect(() => {
    loadSelectedVan();
  }, []);

  const loadSelectedVan = async () => {
    try {
      const user = await authApi.getCurrentUser();

      if (user && user.role === 'SALESMAN' && user.default_van_id) {
        const van = await vanApi.getById(user.default_van_id);
        if (van) {
          setSelectedVanState(van);
          await AsyncStorage.setItem(VAN_STORAGE_KEY, JSON.stringify(van));
          setCanChangeVan(false);
        }
      } else if (user && user.role === 'SALES_MANAGER') {
        const vanJson = await AsyncStorage.getItem(VAN_STORAGE_KEY);
        if (vanJson) {
          setSelectedVanState(JSON.parse(vanJson));
        }
        setCanChangeVan(true);
      } else {
        const vanJson = await AsyncStorage.getItem(VAN_STORAGE_KEY);
        if (vanJson) {
          setSelectedVanState(JSON.parse(vanJson));
        }
        setCanChangeVan(true);
      }
    } catch (error) {
      console.error('Error loading selected van:', error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedVan = async (van: Van | null) => {
    if (!canChangeVan && van) {
      console.warn('Cannot change van for salesman');
      return;
    }

    try {
      if (van) {
        await AsyncStorage.setItem(VAN_STORAGE_KEY, JSON.stringify(van));
      } else {
        await AsyncStorage.removeItem(VAN_STORAGE_KEY);
      }
      setSelectedVanState(van);
    } catch (error) {
      console.error('Error saving selected van:', error);
      throw error;
    }
  };

  return (
    <VanContext.Provider
      value={{
        selectedVan,
        setSelectedVan,
        loading,
        canChangeVan,
      }}
    >
      {children}
    </VanContext.Provider>
  );
}

export function useVan() {
  const context = useContext(VanContext);
  if (context === undefined) {
    throw new Error('useVan must be used within a VanProvider');
  }
  return context;
}
