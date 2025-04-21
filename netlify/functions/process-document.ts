import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const { documentId } = JSON.parse(event.body || '{}');

    if (!documentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    // Get document info
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    // Verify user has enough credits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credit_balance')
      .eq('id', document.user_id)
      .single();

    if (userError || !userData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    if (userData.credit_balance < 1) {
      await supabase
        .from('documents')
        .update({
          status: 'failed',
          error_message: 'Insufficient credits'
        })
        .eq('id', documentId);

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Insufficient credits' }),
      };
    }

    // Create OCR job
    const { error: jobError } = await supabase
      .from('ocr_jobs')
      .insert({
        document_id: documentId,
        status: 'pending'
      });

    if (jobError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create OCR job' }),
      };
    }

    // Trigger queue processor
    try {
      await fetch('/.netlify/functions/queue-processor', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to trigger queue processor:', error);
      // Don't return an error - the job is created and will be processed eventually
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('Error processing document:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};