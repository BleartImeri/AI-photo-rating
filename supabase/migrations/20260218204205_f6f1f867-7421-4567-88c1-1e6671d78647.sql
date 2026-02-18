
-- Token wallets table (session-based, no auth required for simplicity)
CREATE TABLE public.token_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  tokens INTEGER NOT NULL DEFAULT 40,
  last_refill_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Photo analyses table
CREATE TABLE public.photo_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  overall_score INTEGER,
  result JSONB,
  tokens_spent INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_analyses ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can manage their own wallet by session_id
CREATE POLICY "Anyone can read their wallet" ON public.token_wallets
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert their wallet" ON public.token_wallets
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update their wallet" ON public.token_wallets
  FOR UPDATE USING (true);

-- RLS: anyone can read/insert analyses
CREATE POLICY "Anyone can read analyses" ON public.photo_analyses
  FOR SELECT USING (true);
CREATE POLICY "Anyone can insert analyses" ON public.photo_analyses
  FOR INSERT WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_token_wallets_updated_at
  BEFORE UPDATE ON public.token_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
