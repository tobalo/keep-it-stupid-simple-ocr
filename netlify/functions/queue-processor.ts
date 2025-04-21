import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Maximum number of retries for a job
const MAX_RETRIES = 3;

// Delay between retries (in milliseconds) with exponential backoff
const getRetryDelay = (attempts: number) => Math.pow(2, attempts) * 1000;

export const handler: Handler = async (event) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Find the next pending job
    const { data: jobs, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*, documents(*)')
      .eq('status', 'pending')
      .order('last_attempted_at', { ascending: true, nullsFirst: true })
      .limit(1);

    if (jobError) {
      throw jobError;
    }

    if (!jobs || jobs.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No pending jobs' }),
      };
    }

    const job = jobs[0];
    const document = job.documents;

    // Check if max retries exceeded
    if (job.attempts >= MAX_RETRIES) {
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'failed',
          error_message: 'Maximum retry attempts exceeded',
          last_attempted_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Job failed - max retries exceeded' }),
      };
    }

    // Mark job as processing
    await supabase
      .from('ocr_jobs')
      .update({
        status: 'processing',
        attempts: job.attempts + 1,
        last_attempted_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Get file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (fileError || !fileData) {
      throw new Error('Failed to download file');
    }

    const startTime = Date.now();

    try {
      // Convert file to base64
      const base64String = await blobToBase64(fileData);
      const mimeType = fileData.type;

      // Process with Gemini Vision API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Extract all text from this document using OCR. Return only the extracted text without any additional commentary or analysis."
                  },
                  {
                    inlineData: {
                      mimeType,
                      data: base64String.split(',')[1]
                    }
                  }
                ]
              }
            ],
            generation_config: {
              temperature: 0.1,
              top_p: 0.8,
              top_k: 40
            }
          })
        }
      );

      const geminiData = await response.json();

      if (!response.ok || !geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error('Failed to process document with Gemini API');
      }

      const extractedText = geminiData.candidates[0].content.parts[0].text;
      const wordCount = extractedText.split(/\s+/).filter(word => word.length > 0).length;
      const processingTime = (Date.now() - startTime) / 1000; // Convert to seconds
      const confidenceScore = 0.99; // Gemini doesn't provide confidence scores, using placeholder

      // Update document with OCR results
      await supabase
        .from('documents')
        .update({
          status: 'completed',
          ocr_text: extractedText,
          word_count: wordCount,
          processing_time: processingTime,
          confidence_score: confidenceScore
        })
        .eq('id', document.id);

      // Mark job as completed
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'completed'
        })
        .eq('id', job.id);

      // Deduct 1 credit
      await supabase.rpc('deduct_credit', { user_id: document.user_id });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, jobId: job.id }),
      };
    } catch (error) {
      console.error('Processing error:', error);

      // Update job status
      await supabase
        .from('ocr_jobs')
        .update({
          status: 'failed',
          error_message: (error as Error).message,
        })
        .eq('id', job.id);

      // If this was the final retry, update document status
      if (job.attempts >= MAX_RETRIES - 1) {
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            error_message: (error as Error).message,
          })
          .eq('id', document.id);
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = getRetryDelay(job.attempts);
        await supabase
          .from('ocr_jobs')
          .update({
            status: 'pending',
            last_attempted_at: new Date(Date.now() + retryDelay).toISOString(),
          })
          .eq('id', job.id);
      }

      throw error;
    }
  } catch (error) {
    console.error('Queue processor error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}