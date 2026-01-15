-- Tabla de equipos con sus IDs de API-Football
CREATE TABLE public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_team_id INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cache de H2H para evitar llamadas repetidas
CREATE TABLE public.h2h_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_key TEXT NOT NULL UNIQUE,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fixtures de H2H almacenados
CREATE TABLE public.h2h_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_fixture_id INTEGER NOT NULL UNIQUE,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  raw_json JSONB NOT NULL,
  fixture_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_h2h_cache_key ON public.h2h_cache(canonical_key);
CREATE INDEX idx_h2h_cache_fetched ON public.h2h_cache(fetched_at);
CREATE INDEX idx_h2h_fixtures_teams ON public.h2h_fixtures(home_team_id, away_team_id);

-- RLS: Datos públicos (solo lectura)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.h2h_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.h2h_fixtures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are publicly readable"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "H2H cache is publicly readable"
ON public.h2h_cache FOR SELECT
USING (true);

CREATE POLICY "H2H fixtures are publicly readable"
ON public.h2h_fixtures FOR SELECT
USING (true);

-- Insertar equipos de Liga 1 con sus IDs de API-Football
INSERT INTO public.teams (id, name, api_team_id) VALUES
  ('uni', 'Universitario', 2648),
  ('ali', 'Alianza Lima', 2650),
  ('cri', 'Sporting Cristal', 2653),
  ('mel', 'FBC Melgar', 2654),
  ('cus', 'Cienciano', 2655),
  ('gar', 'Deportivo Garcilaso', 2656),
  ('jpi', 'Alianza Atlético', 13065),
  ('utc', 'UTC', 2660),
  ('cha', 'ADT', 3304),
  ('gra', 'Deportivo Grau', 11079),
  ('shu', 'Sport Huancayo', 2657),
  ('aas', 'Cusco FC', 7818),
  ('cie', 'Carlos A. Mannucci', 4624),
  ('com', 'Comerciantes Unidos', 3314),
  ('sba', 'Sport Boys', 2659),
  ('fcc', 'Unión Comercio', 2661),
  ('moq', 'Los Chankas', 13068),
  ('adt', 'Juan Pablo II', 7819);
