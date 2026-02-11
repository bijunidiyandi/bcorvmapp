import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineLogin } from '../services/auth.api';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
    isSalesManager: () => boolean;
  isSalesman: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const session = await AsyncStorage.getItem('@van_sales_session');
    if (session) {
      setUser(JSON.parse(session));
    }
    setLoading(false);
  }

  const isSalesManager = () => {
 
    if( user?.roles?.includes('Admin'))
        {user.roles='SALES_MANAGER'


      return true;}
        else
        return false;

    
  };

  const isSalesman = () => {
    
     if(user?.roles?.includes('User'))
      {
      user.roles='SALESMAN'
      return true;
      }   else
        return false;

     
  };

  async function signIn(username: string, password: string) {
    console.log(username,password)
    const res = await onlineLogin({ username, password });
    await AsyncStorage.setItem('@van_sales_session', JSON.stringify(res));
    console.log('res - signin',res)
    setUser(res);

  }

  async function signOut() {
    await AsyncStorage.removeItem('@van_sales_session');
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
         signOut,
        isSalesManager,
        isSalesman,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext );
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
