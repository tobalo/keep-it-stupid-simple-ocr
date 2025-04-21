import { create } from 'zustand';
import supabase from '../utils/supabase';
import { Database } from '../types/supabase';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File, userId: string) => Promise<Document | null>;
  clearError: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  error: null,
  
  fetchDocuments: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      set({ 
        documents: data as Document[],
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  fetchDocument: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      set({ 
        currentDocument: data as Document,
        isLoading: false 
      });
      
      // Start polling for status updates if the document is being processed
      if (data.status === 'pending' || data.status === 'processing') {
        const pollInterval = setInterval(async () => {
          const { data: updatedDoc, error: pollError } = await supabase
            .from('documents')
            .select('*')
            .eq('id', id)
            .single();
          
          if (!pollError && updatedDoc) {
            set({ currentDocument: updatedDoc as Document });
            
            // Stop polling if processing is complete or failed
            if (updatedDoc.status === 'completed' || updatedDoc.status === 'failed') {
              clearInterval(pollInterval);
            }
          }
        }, 2000); // Poll every 2 seconds
        
        // Clean up interval after 5 minutes to prevent infinite polling
        setTimeout(() => clearInterval(pollInterval), 300000);
      }
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  },
  
  uploadDocument: async (file: File, userId: string) => {
    try {
      set({ isLoading: true, error: null });

      // First, verify user exists and has enough credits
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credit_balance')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error('Failed to verify user account. Please try signing in again.');
      }

      if (!userData) {
        throw new Error('User account not found. Please try signing in again.');
      }

      if (userData.credit_balance < 1) {
        throw new Error('Insufficient credits. Please purchase more credits to continue.');
      }
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error('Failed to upload file. Please try again.');
      }
      
      // Create document record
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          original_filename: file.name,
          status: 'pending',
          file_path: filePath,
        })
        .select()
        .single();
      
      if (insertError) {
        // Clean up uploaded file if document creation fails
        await supabase.storage
          .from('documents')
          .remove([filePath]);
        
        throw new Error('Failed to create document record. Please try again.');
      }
      
      set({ isLoading: false });
      
      // Trigger document processing
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const response = await fetch('/.netlify/functions/process-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ documentId: data.id }),
        });

        if (!response.ok) {
          throw new Error('Failed to start document processing');
        }
      } catch (processError) {
        console.error('Processing error:', processError);
        // Don't throw here - we still want to return the document
        // The status will remain 'pending' and the user can retry processing
      }
      
      return data as Document;
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