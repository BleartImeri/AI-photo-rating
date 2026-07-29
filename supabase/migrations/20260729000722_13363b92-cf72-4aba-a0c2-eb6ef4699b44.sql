CREATE TABLE public.ad_rewards (
  transaction_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  payout numeric NOT NULL DEFAULT 0,
  tokens_awarded integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_rewards TO authenticated;
GRANT ALL ON public.ad_rewards TO service_role;
ALTER TABLE public.ad_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ad rewards" ON public.ad_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX ad_rewards_user_id_idx ON public.ad_rewards(user_id);