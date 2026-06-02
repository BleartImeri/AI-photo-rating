-- Add user_id to token_wallets to tie wallets to authenticated users
ALTER TABLE public.token_wallets
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS token_wallets_user_id_key
  ON public.token_wallets(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS token_wallets_session_id_idx
  ON public.token_wallets(session_id);

-- Tighten RLS: users can only see/modify their own wallet
DROP POLICY IF EXISTS "Anyone can read their wallet" ON public.token_wallets;
DROP POLICY IF EXISTS "Anyone can update their wallet" ON public.token_wallets;
DROP POLICY IF EXISTS "Anyone can insert their wallet" ON public.token_wallets;

CREATE POLICY "Users can read their own wallet"
  ON public.token_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallet"
  ON public.token_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet"
  ON public.token_wallets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Tighten photo_analyses: users can only see their own analyses (by user_id)
ALTER TABLE public.photo_analyses
  ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS photo_analyses_user_id_idx
  ON public.photo_analyses(user_id);

DROP POLICY IF EXISTS "Anyone can read analyses" ON public.photo_analyses;
DROP POLICY IF EXISTS "Anyone can insert analyses" ON public.photo_analyses;

CREATE POLICY "Users can read their own analyses"
  ON public.photo_analyses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analyses"
  ON public.photo_analyses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
