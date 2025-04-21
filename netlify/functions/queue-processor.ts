import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"; // Import SDK

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const geminiApiKey = process.env.GEMINI_API_KEY || ''; // Ensure this is set in Netlify

// Check for Gemini API Key and Initialize SDK
if (!geminiApiKey) {
  console.error('FATAL: Missing GEMINI_API_KEY environment variable');
  // Optionally return an error immediately, though the function might not be invoked if the key is missing server-side
  // return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: Missing Gemini API Key' }) };
  throw new Error('Missing GEMINI_API_KEY environment variable'); // More direct for immediate failure
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey); // Initialize SDK

// Maximum number of retries for a job
const MAX_RETRIES = 3;

// Delay between retries (in milliseconds) with exponential backoff
const getRetryDelay = (attempts: number) => Math.pow(2, attempts) * 1000;

// Helper function to convert Blob to Base64 data URI
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string); // result is a data URI
    reader.onerror = (error) => reject(new Error(`FileReader error: ${error}`));
    reader.readAsDataURL(blob);
  });
}

export const handler: Handler = async (event) => {
  try {
    // Only allow POST requests (standard check)
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    // --- Job Fetching Logic ---
    const { data: jobs, error: jobError } = await supabase
      .from('ocr_jobs')
      .select('*, documents(*)') // Ensure 'documents' table relation is set up correctly in Supabase
      .eq('status', 'pending')
      .order('created_at', { ascending: true }) // Process oldest pending job first
      // .order('last_attempted_at', { ascending: true, nullsFirst: true }) // Alternative ordering
      .limit(1);

    if (jobError) {
       console.error('Error fetching pending OCR jobs:', jobError);
       // Decide if this is a retryable error or indicates a DB issue
       return { statusCode: 500, body: JSON.stringify({ error: `Failed to fetch jobs: ${jobError.message}` }) };
    }

    if (!jobs || jobs.length === 0) {
      // console.log('No pending OCR jobs found.'); // Optional logging
      return { statusCode: 200, body: JSON.stringify({ message: 'No pending jobs' }) };
    }

    const job = jobs[0];
    const document = job.documents; // Access related document data

    // --- Document and File Path Validation ---
    if (!document) {
        console.error(`Job ${job.id} is missing associated document data. Marking job as failed.`);
        await supabase.from('ocr_jobs').update({ status: 'failed', error_message: 'Internal error: Missing document data', last_attempted_at: new Date().toISOString() }).eq('id', job.id);
        // No corresponding document to mark as failed here
        return { statusCode: 200, body: JSON.stringify({ message: `Job ${job.id} failed: Missing document data.` }) }; // Return 200 as the function itself didn't fail catastrophically
    }
    if (!document.file_path) {
        console.error(`Document ${document.id} (Job ${job.id}) is missing file_path. Marking job and document as failed.`);
        const errorMessage = 'Document file path missing';
        await supabase.from('ocr_jobs').update({ status: 'failed', error_message: errorMessage, last_attempted_at: new Date().toISOString() }).eq('id', job.id);
        await supabase.from('documents').update({ status: 'failed', error_message: errorMessage }).eq('id', document.id);
        return { statusCode: 200, body: JSON.stringify({ message: `Job ${job.id} failed: ${errorMessage}` }) };
    }

    // --- Retry Logic Check ---
    // Note: job.attempts should reflect completed attempts *before* this run
    const currentAttemptNumber = job.attempts + 1;
    if (currentAttemptNumber > MAX_RETRIES) {
      console.warn(`Job ${job.id} exceeded max retries (${MAX_RETRIES}). Marking as failed.`);
      const errorMessage = 'Maximum retry attempts exceeded';
      await supabase.from('ocr_jobs').update({ status: 'failed', error_message: errorMessage, last_attempted_at: new Date().toISOString() }).eq('id', job.id);
      await supabase.from('documents').update({ status: 'failed', error_message: `OCR processing failed: ${errorMessage}` }).eq('id', document.id);
      return { statusCode: 200, body: JSON.stringify({ message: `Job ${job.id} failed: ${errorMessage}` }) };
    }

    console.log(`Processing Job ID: ${job.id}, Document ID: ${document.id}, Attempt: ${currentAttemptNumber}`);

    // --- Mark Job as Processing ---
    // Update attempts count *before* processing attempt
    const { error: updateError } = await supabase
      .from('ocr_jobs')
      .update({
        status: 'processing',
        attempts: currentAttemptNumber, // Increment attempts for this run
        last_attempted_at: new Date().toISOString(),
        error_message: null // Clear previous attempt's error message
      })
      .eq('id', job.id);

    if (updateError) {
        console.error(`Failed to mark job ${job.id} as processing:`, updateError);
        // Consider if this should prevent processing or just be logged
        return { statusCode: 500, body: JSON.stringify({ error: `Failed to update job status: ${updateError.message}` }) };
    }
    // Optionally update document status to 'processing' as well
    await supabase.from('documents').update({ status: 'processing', error_message: null }).eq('id', document.id);


    // --- File Download ---
    let fileData: Blob | null = null;
    let fileDownloadError: any = null;
    try {
        const { data, error } = await supabase.storage
            .from('documents') // Ensure this matches your bucket name
            .download(document.file_path);
        if (error) throw error;
        if (!data) throw new Error('Downloaded file data is null');
        fileData = data;
    } catch (error) {
        fileDownloadError = error;
    }

    if (fileDownloadError || !fileData) {
       console.error(`Failed to download file ${document.file_path} for Job ${job.id}:`, fileDownloadError);
       const errorMessage = `Failed to download file from storage: ${fileDownloadError?.message || 'Unknown download error'}`;
       // Failure path: Update statuses and potentially retry
       await handleProcessingFailure(job, document, errorMessage, currentAttemptNumber, supabase);
       return { statusCode: 500, body: JSON.stringify({ error: errorMessage }) }; // Indicate server error during processing
    }


    // --- Processing Logic (Gemini Call) ---
    const startTime = Date.now();
    try {
      // Convert file Blob to base64 data URI
      const base64DataUri = await blobToBase64(fileData);
      const mimeType = fileData.type;

      // Extract base64 data part (remove "data:...;base64,")
      const base64String = base64DataUri.split(',')[1];
      if (!base64String) {
          throw new Error("Failed to extract base64 string from data URI.");
      }

      // Prepare parts for Gemini API
      const imagePart = {
        inlineData: {
          data: base64String,
          mimeType: mimeType,
        },
      };
      const textPart = {
          text: "Extract all text content from this document/image using OCR. Focus only on returning the raw text found, without adding any explanations, summaries, analysis, or formatting beyond basic line breaks present in the source. Do not include labels like 'Extracted Text:'."
      };

      // Initialize Gemini Model
      const model = genAI.getGenerativeModel({
          model: "gemini-pro-vision", // Or "gemini-1.5-flash" / "gemini-1.5-pro" if available and preferred
          // Safety settings (adjust thresholds as needed)
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          ],
          // Generation configuration
          generationConfig: {
             temperature: 0.1, // Lower temperature for more deterministic OCR
             // topP: 0.8,
             // topK: 40,
             maxOutputTokens: 8192 // Set a reasonable max token limit
          }
      });

      // Call Gemini API
      console.log(`Calling Gemini for Job ID: ${job.id}`);
      const result = await model.generateContent({ contents: [{ role: "user", parts: [textPart, imagePart] }] });
      const response = result.response;
      const processingTimeMs = Date.now() - startTime;
      console.log(`Gemini response received for Job ID: ${job.id} in ${processingTimeMs}ms`);


      // --- Process Gemini Response ---
      // Check for blocked content first
      if (!response || response.promptFeedback?.blockReason) {
         const blockReason = response?.promptFeedback?.blockReason || 'Unknown safety block';
         const safetyRatings = response?.promptFeedback?.safetyRatings || [];
         console.error(`Gemini request blocked for Job ${job.id}. Reason: ${blockReason}`, safetyRatings);
         throw new Error(`Content blocked by Gemini safety filters: ${blockReason}`); // Trigger failure handling
      }

      // Check for valid response structure and text
      const candidate = response.candidates?.[0];
      const extractedText = candidate?.content?.parts?.[0]?.text;

      if (!candidate || !extractedText) {
         console.error(`Gemini response missing expected text content for Job ${job.id}:`, JSON.stringify(response, null, 2));
         throw new Error('Failed to get valid text response from Gemini API'); // Trigger failure handling
      }

      // --- Success Path ---
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      const processingTimeSec = processingTimeMs / 1000;

      // Update document with OCR results
      const { error: docUpdateError } = await supabase
        .from('documents')
        .update({
          status: 'completed',
          ocr_text: extractedText,
          word_count: wordCount,
          processing_time: processingTimeSec,
          confidence_score: null, // Gemini Vision API doesn't provide a standard confidence score for OCR
          error_message: null // Clear any previous error
        })
        .eq('id', document.id);

       if (docUpdateError) {
           console.error(`Failed to update document ${document.id} status to completed:`, docUpdateError);
           // Decide if this is critical enough to mark the job as failed despite successful OCR
           // For now, log it and proceed to mark job completed. Consider adding specific error handling.
       }

      // Mark job as completed
      const { error: jobCompleteError } = await supabase
        .from('ocr_jobs')
        .update({
          status: 'completed',
          error_message: null // Ensure error is cleared
        })
        .eq('id', job.id);

      if (jobCompleteError) {
          console.error(`Failed to mark job ${job.id} as completed:`, jobCompleteError);
          // Log and potentially alert, but OCR was successful.
      }

      // Deduct 1 credit using RPC
      console.log(`Attempting to deduct credit for user ${document.user_id} (Job ${job.id})`);
      const { error: creditError } = await supabase.rpc('deduct_credit', { p_user_id: document.user_id, p_amount: 1 }); // Ensure param name matches RPC definition
      if (creditError) {
          // Log error but don't fail the entire process. Consider alerting/queueing for retry.
          console.error(`Failed to deduct credit for user ${document.user_id} (Job ${job.id}):`, creditError);
      } else {
          console.log(`Credit deducted successfully for user ${document.user_id} (Job ${job.id})`);
      }

      console.log(`Job ${job.id} completed successfully.`);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, jobId: job.id, documentId: document.id }),
      };

    } catch (error: any) { // --- Failure Path (Catch processing errors) ---
      console.error(`Processing error for Job ${job.id} (Attempt ${currentAttemptNumber}):`, error);
      const errorMessage = error.message || 'Unknown processing error';

      // Use helper to handle status updates and retries
      await handleProcessingFailure(job, document, errorMessage, currentAttemptNumber, supabase);

      return {
          statusCode: 500, // Indicate server error during processing attempt
          body: JSON.stringify({ error: `Processing failed: ${errorMessage}` })
      };
    }
  } catch (error: any) { // --- Catch Unhandled Errors ---
    console.error('Unhandled queue processor error:', error);
    // Avoid leaking internal details in production response
    const publicErrorMessage = 'Internal server error occurred.';
    return {
      statusCode: 500,
      body: JSON.stringify({ error: publicErrorMessage }), // Generic error message
      // body: JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), // More detailed for debugging
    };
  }
};

// --- Helper Function for Failure Handling ---
async function handleProcessingFailure(job: any, document: any, errorMessage: string, attemptNumber: number, supabaseClient: any) {
    console.log(`Handling failure for Job ${job.id}, Attempt ${attemptNumber}`);
    if (attemptNumber >= MAX_RETRIES) {
        // Final failure: Mark both job and document as failed permanently
        console.warn(`Job ${job.id} reached max retries. Marking as permanently failed.`);
        await supabaseClient.from('ocr_jobs').update({ status: 'failed', error_message: errorMessage }).eq('id', job.id);
        await supabaseClient.from('documents').update({ status: 'failed', error_message: `OCR failed: ${errorMessage}` }).eq('id', document.id);
    } else {
        // Schedule retry: Mark job as pending, update error message, set next attempt time
        const retryDelay = getRetryDelay(attemptNumber); // Calculate delay based on the attempt number just failed
        const nextAttemptTime = new Date(Date.now() + retryDelay);
        console.log(`Scheduling retry for Job ${job.id} in ${retryDelay / 1000} seconds.`);
        await supabaseClient
          .from('ocr_jobs')
          .update({
            status: 'pending', // Revert to pending for retry
            error_message: errorMessage, // Store the error from this failed attempt
            last_attempted_at: nextAttemptTime.toISOString(), // Set next potential start time
          })
          .eq('id', job.id);
        // Keep document status as 'processing' or revert if preferred during retry
        await supabaseClient.from('documents').update({ status: 'processing', error_message: `OCR Attempt ${attemptNumber} failed. Retrying... (${errorMessage})` }).eq('id', document.id);
    }
}
