-- Utilizadores (gerido pelo Supabase Auth)
-- tabela auth.users já existe

-- Perfis públicos
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  total_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partidas
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,           -- ID da PandaScore API
  game TEXT NOT NULL,                -- 'cs2' | 'valorant' | 'lol'
  tournament TEXT NOT NULL,
  team_a TEXT NOT NULL,
  team_b TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'upcoming',    -- 'upcoming' | 'live' | 'finished'
  winner TEXT,                       -- 'team_a' | 'team_b' | 'draw'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Previsões
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  match_id UUID REFERENCES matches(id) NOT NULL,
  predicted_winner TEXT NOT NULL,    -- 'team_a' | 'team_b'
  points_earned INT,                 -- null até resultado confirmado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, match_id)          -- um voto por utilizador por partida
);

-- Índices para performance
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_matches_status ON matches(status);

-- Função para calcular pontos de forma idempotente
CREATE OR REPLACE FUNCTION calculate_points(p_match_id UUID)
RETURNS void AS $$
DECLARE
  v_winner TEXT;
BEGIN
  -- Obter o vencedor da partida
  SELECT winner INTO v_winner
  FROM matches
  WHERE id = p_match_id;

  -- Atualizar previsões apenas se não foram calculadas e o vencedor bate certo
  UPDATE predictions
  SET points_earned = 10
  WHERE match_id = p_match_id
    AND points_earned IS NULL
    AND predicted_winner = v_winner;

  -- Atualizar previsões erradas
  UPDATE predictions
  SET points_earned = 0
  WHERE match_id = p_match_id
    AND points_earned IS NULL
    AND predicted_winner != v_winner;

  -- Atualizar o total de pontos dos utilizadores
  -- Este step é uma forma simples; em produção faríamos um trigger nas predictions ou uma soma total
  UPDATE profiles
  SET total_points = (
    SELECT COALESCE(SUM(points_earned), 0)
    FROM predictions
    WHERE user_id = profiles.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create a profile for new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Matches are viewable by everyone." ON matches
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own predictions." ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own predictions." ON predictions
  FOR SELECT USING (auth.uid() = user_id);
