/*
  # Add OCR jobs table and update documents schema

  1. New Tables
    - `ocr_jobs`
      - `id` (uuid, primary key)
      - `document_id` (uuid, foreign key)
      - `status` (enum: 'pending', 'processing', 'completed', 'failed')
      - `attempts` (integer)
      - `last_attempted_at` (timestamptz)
      - `error_message` (text)
      - `created_at` (timestamptz)

  2. Changes
    - Add `processing_time` column to `documents` table
    - Add `confidence_score` column to `documents` table

  3. Security
    - Enable RLS on `ocr_jobs` table
    - Add policies for users to view their own jobs
*/

-- Create OCR jobs table
CREATE TABLE IF NOT EXISTS ocr_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_attempted_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_time numeric;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidence_score numeric;

-- Enable RLS on OCR jobs table
ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for OCR jobs
CREATE POLICY "Users can view their own OCR jobs"
  ON ocr_jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM documents WHERE documents.id = ocr_jobs.document_id));

-- Add index for faster job querying
CREATE INDEX IF NOT EXISTS ocr_jobs_status_idx ON ocr_jobs (status, last_attempted_at);