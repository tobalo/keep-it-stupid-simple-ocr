import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event) => {
  try {
    // Verify webhook signature
    const payload = event.body || '';
    const signature = event.headers['stripe-signature'] || '';

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeWebhookSecret
      );
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid Stripe webhook signature' }),
      };
    }

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid' && session.metadata) {
          const userId = session.metadata.user_id;
          const credits = parseInt(session.metadata.credits || '0', 10);

          if (!userId || !credits) {
            return {
              statusCode: 400,
              body: JSON.stringify({ error: 'Missing user ID or credits in metadata' }),
            };
          }

          // Update user's credit balance
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('credit_balance')
            .eq('id', userId)
            .single();

          if (userError) {
            return {
              statusCode: 404,
              body: JSON.stringify({ error: 'User not found' }),
            };
          }

          const newBalance = (userData.credit_balance || 0) + credits;

          await supabase
            .from('users')
            .update({ credit_balance: newBalance })
            .eq('id', userId);

          // Record the transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: userId,
              amount: session.amount_total || 0,
              status: 'completed',
              stripe_payment_id: session.payment_intent as string,
              credits_added: credits,
            });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata.user_id) {
          // Record failed transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: paymentIntent.metadata.user_id,
              amount: paymentIntent.amount,
              status: 'failed',
              stripe_payment_id: paymentIntent.id,
              credits_added: 0,
            });
        }
        break;
      }

      case 'charge.refunded': {
        const charge = stripeEvent.data.object as Stripe.Charge;
        if (charge.payment_intent && charge.metadata.user_id) {
          // Get the original transaction
          const { data: transaction } = await supabase
            .from('transactions')
            .select('credits_added')
            .eq('stripe_payment_id', charge.payment_intent)
            .single();

          if (transaction) {
            // Deduct refunded credits
            await supabase.rpc('deduct_credit', {
              user_id: charge.metadata.user_id,
              amount: transaction.credits_added
            });

            // Record refund transaction
            await supabase
              .from('transactions')
              .insert({
                user_id: charge.metadata.user_id,
                amount: -charge.amount_refunded,
                status: 'completed',
                stripe_payment_id: charge.payment_intent,
                credits_added: -transaction.credits_added,
              });
          }
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        
        // Get user by Stripe customer ID
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (user) {
          // Update user subscription status
          await supabase
            .from('users')
            .update({
              subscription_status: subscription.status,
              subscription_id: subscription.id,
            })
            .eq('id', user.id);
        }
        break;
      }

      case 'customer.deleted': {
        const customer = stripeEvent.data.object as Stripe.Customer;
        
        // Clear Stripe customer ID from user record
        await supabase
          .from('users')
          .update({
            stripe_customer_id: null,
            subscription_status: null,
            subscription_id: null,
          })
          .eq('stripe_customer_id', customer.id);
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process webhook' }),
    };
  }
};