import { create } from 'zustand';
import supabase from '../utils/supabase';
import { User } from '@supabase/supabase-js';
import { usePaymentStore } from './paymentStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  
  signUp: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      set({ 
        user: data.user,
        isAuthenticated: !!data.user,
        isLoading: false 
      });

      // Fetch initial credit balance
      if (data.user) {
        usePaymentStore.getState().fetchCreditBalance();
      }
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  signIn: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/.netlify/functions/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signin', email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }
      
      set({ 
        user: data.user,
        isAuthenticated: !!data.user,
        isLoading: false 
      });

      // Fetch credit balance on sign in
      if (data.user) {
        usePaymentStore.getState().fetchCreditBalance();
      }
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  signOut: async () => {
    try {
      set({ isLoading: true });
      await supabase.auth.signOut();
      set({ 
        user: null,
        isAuthenticated: false,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  checkSession: async () => {
    try {
      set({ isLoading: true });
      const { data } = await supabase.auth.getSession();
      const { session } = data;
      
      if (session) {
        set({ 
          user: session.user,
          isAuthenticated: true,
          isLoading: false 
        });
        
        // Fetch credit balance when session is restored
        usePaymentStore.getState().fetchCreditBalance();
      } else {
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: (error as Error).message
      });
    }
  },
  
  clearError: () => set({ error: null }),
}));