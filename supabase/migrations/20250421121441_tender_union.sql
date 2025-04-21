-- Function to safely deduct a credit from a user's balance
CREATE OR REPLACE FUNCTION deduct_credit(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET credit_balance = credit_balance - 1
  WHERE id = user_id AND credit_balance >= 1;
END;
$$ LANGUAGE plpgsql;