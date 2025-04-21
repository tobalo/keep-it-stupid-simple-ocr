/*
  # Initial database schema for OCR service

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `created_at` (timestamptz)
      - `stripe_customer_id` (text, nullable)
      - `credit_balance` (integer)
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `original_filename` (text)
      - `status` (enum: 'pending', 'processing', 'completed', 'failed')
      - `ocr_text` (text, nullable)
      - `created_at` (timestamptz)
      - `file_path` (text)
      - `word_count` (integer, nullable)
      - `error_message` (text, nullable)
    - `transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `document_id` (uuid, foreign key, nullable)
      - `amount` (integer)
      - `status` (enum: 'pending', 'completed', 'failed')
      - `created_at` (timestamptz)
      - `stripe_payment_id` (text, nullable)
      - `credits_added` (integer)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to access their own data
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  stripe_customer_id text,
  credit_balance integer DEFAULT 0
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  original_filename text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  ocr_text text,
  created_at timestamptz DEFAULT now(),
  file_path text NOT NULL,
  word_count integer,
  error_message text
);

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  document_id uuid REFERENCES documents(id),
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  stripe_payment_id text,
  credits_added integer NOT NULL
);

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies

-- Users table policies
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Documents table policies
CREATE POLICY "Users can insert their own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Transactions table policies
CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage policy
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', FALSE);

CREATE POLICY "Users can upload their own documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );