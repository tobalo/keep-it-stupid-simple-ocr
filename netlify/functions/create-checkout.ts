import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const siteUrl = process.env.URL || 'http://localhost:8888';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Get user from auth header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const { credits } = JSON.parse(event.body || '{}');

    if (!credits || credits < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Valid credit amount is required' }),
      };
    }

    // Get or create Stripe customer
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userData.user.id)
      .single();

    if (userError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' }),
      };
    }

    let customerId = userRecord.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          supabase_id: userData.user.id,
        },
      });

      customerId = customer.id;

      // Update user with Stripe customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userData.user.id);
    }

    // Calculate price (25 cents per credit)
    const unitAmount = 25; // in cents
    const amount = unitAmount * credits;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} OCR Credits`,
              description: 'Credits for OCR document processing',
            },
            unit_amount: unitAmount,
          },
          quantity: credits,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/account?payment=success`,
      cancel_url: `${siteUrl}/account?payment=canceled`,
      metadata: {
        user_id: userData.user.id,
        credits: credits.toString(),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        checkoutUrl: session.url,
      }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create checkout session' }),
    };
  }
};