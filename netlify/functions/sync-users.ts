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

    // Use Supabase Admin API to fetch all users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error fetching users from Supabase Auth:', authError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch users from Supabase Auth' }),
      };
    }

    const results = {
      total: authUsers.users.length,
      synced: 0,
      errors: 0,
    };

    // Iterate through users and create records if they don't exist
    for (const authUser of authUsers.users) {
      try {
        // Check if user exists in users table
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', authUser.id)
          .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error(`Error checking user ${authUser.id}:`, userError);
          results.errors++;
          continue;
        }

        if (!existingUser) {
          // Create user record with initial credits
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              credit_balance: 2, // Give 2 free credits
              created_at: authUser.created_at,
            });

          if (insertError) {
            console.error(`Error creating user record for ${authUser.id}:`, insertError);
            results.errors++;
            continue;
          }

          // Record the credit transaction
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: authUser.id,
              amount: 0, // Free credits
              status: 'completed',
              credits_added: 2,
            });

          if (transactionError) {
            console.error(`Error recording transaction for ${authUser.id}:`, transactionError);
            // Don't increment errors since the user was created successfully
          }

          results.synced++;
        }
      } catch (error) {
        console.error(`Error processing user ${authUser.id}:`, error);
        results.errors++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'User sync completed',
        results,
      }),
    };
  } catch (error) {
    console.error('Error syncing users:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};