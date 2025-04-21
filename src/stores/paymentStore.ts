import { create } from 'zustand';
import supabase from '../utils/supabase';
import { Database } from '../types/supabase';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface PaymentState {
  transactions: Transaction[];
  creditBalance: number;
  isLoading: boolean;
  error: string | null;
  fetchTransactions: () => Promise<void>;
  fetchCreditBalance: () => Promise<void>;
  createCheckoutSession: (credits: number) => Promise<string | null>;
  clearError: () => void;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  transactions: [],
  creditBalance: 0,
  isLoading: false,
  error: null,
  
  fetchTransactions: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ 
        transactions: data as Transaction[],
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  fetchCreditBalance: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('credit_balance')
        .eq('id', userData.user.id)
        .single();
      
      if (error) throw error;
      
      set({ 
        creditBalance: (data as User).credit_balance,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  createCheckoutSession: async (credits: number) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }
      
      const data = await response.json();
      set({ isLoading: false });
      
      return data.checkoutUrl;
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
      return null;
    }
  },
  
  clearError: () => set({ error: null }),
}));