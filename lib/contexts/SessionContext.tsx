import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { salesSessionApi, customerApi } from '../services/sqlite-api';
import { SalesSession } from '../types/database';
import { useVan } from './VanContext';

interface SalesSessionWithDetails extends SalesSession {
  customer?: any;
}

interface SessionContextType {
  activeSession: SalesSessionWithDetails | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  startSession: (session: SalesSessionWithDetails) => void;
  endSession: () => void;
  clearActiveSession: () => void;
  hasActiveSession: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { selectedVan } = useVan();
  const [activeSession, setActiveSession] = useState<SalesSessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const loadActiveSession = async () => {
    if (!selectedVan) {
      setActiveSession(null);
      setLoading(false);
      return;
    }

    try {
      const session = await salesSessionApi.getActive();
      // Verify session belongs to selected van
      if (session && session.van_id === selectedVan.id) {
        if (session.customer_id) {
          try {
            const customer = await customerApi.getById(session.customer_id);
            if (customer) {
              setActiveSession({ ...session, customer });
            } else {
              console.error('Customer not found for session:', session.customer_id);
              setActiveSession(session);
            }
          } catch (customerErr) {
            console.error('Error loading customer:', customerErr);
            setActiveSession(session);
          }
        } else {
          setActiveSession(session);
        }
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error loading active session:', err);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSession();
  }, [selectedVan]);

  const refreshSession = async () => {
    setLoading(true);
    await loadActiveSession();
  };

  const startSession = (session: SalesSessionWithDetails) => {
    setActiveSession(session);
  };

  const endSession = () => {
    setActiveSession(null);
  };

  const clearActiveSession = () => {
    setActiveSession(null);
  };

  const hasActiveSession = () => {
    return activeSession !== null && activeSession.status === 'active';
  };

  return (
    <SessionContext.Provider
      value={{
        activeSession,
        loading,
        refreshSession,
        startSession,
        endSession,
        clearActiveSession,
        hasActiveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
