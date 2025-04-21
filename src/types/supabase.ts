export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          stripe_customer_id: string | null
          credit_balance: number
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          stripe_customer_id?: string | null
          credit_balance?: number
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          stripe_customer_id?: string | null
          credit_balance?: number
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          original_filename: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text: string | null
          created_at: string
          file_path: string
          word_count: number | null
          error_message: string | null
        }
        Insert: {
          id?: string
          user_id: string
          original_filename: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text?: string | null
          created_at?: string
          file_path: string
          word_count?: number | null
          error_message?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          original_filename?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          ocr_text?: string | null
          created_at?: string
          file_path?: string
          word_count?: number | null
          error_message?: string | null
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          amount: number
          status: 'pending' | 'completed' | 'failed'
          created_at: string
          stripe_payment_id: string | null
          credits_added: number
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          amount: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          stripe_payment_id?: string | null
          credits_added: number
        }
        Update: {
          id?: string
          user_id?: string
          document_id?: string | null
          amount?: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          stripe_payment_id?: string | null
          credits_added?: number
        }
      }
    }
  }
}