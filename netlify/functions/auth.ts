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

    const { action, email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    let result;

    switch (action) {
      case 'signup':
        // First check if user already exists in users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single();

        if (existingUser) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User already exists' }),
          };
        }

        // Create auth user
        result = await supabase.auth.signUp({
          email,
          password,
        });

        if (result.error) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: result.error.message }),
          };
        }

        // Create user record with initial credits
        if (result.data.user) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: result.data.user.id,
              email: result.data.user.email,
              credit_balance: 2, // Give 2 free credits
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error creating user record:', insertError);
            // Delete auth user if profile creation fails
            await supabase.auth.admin.deleteUser(result.data.user.id);
            return {
              statusCode: 500,
              body: JSON.stringify({ error: 'Failed to create user profile' }),
            };
          }

          // Record the credit transaction
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              user_id: result.data.user.id,
              amount: 0, // Free credits
              status: 'completed',
              credits_added: 2,
              created_at: new Date().toISOString(),
            });

          if (transactionError) {
            console.error('Error recording initial credit transaction:', transactionError);
          }
        }
        break;

      case 'signin':
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (result.error) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: result.error.message }),
          };
        }

        // Ensure user exists in users table
        if (result.data.user) {
          const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', result.data.user.id)
            .single();

          if (userError || !userRecord) {
            // Create user record if it doesn't exist
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: result.data.user.id,
                email: result.data.user.email,
                credit_balance: 2, // Give 2 free credits
                created_at: result.data.user.created_at,
              });

            if (insertError) {
              console.error('Error creating user record:', insertError);
            } else {
              // Record the credit transaction
              await supabase
                .from('transactions')
                .insert({
                  user_id: result.data.user.id,
                  amount: 0,
                  status: 'completed',
                  credits_added: 2,
                  created_at: new Date().toISOString(),
                });
            }
          }
        }
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: result.data.user,
        session: result.data.session,
      }),
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};