CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  title       text,
  description text,
  image_url   text,
  site_name   text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  ai_status   text NOT NULL DEFAULT 'pending',
  ai_error    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS links_tags_gin ON links USING gin (tags);
CREATE INDEX IF NOT EXISTS links_created_at_idx ON links (created_at DESC);

INSERT INTO categories (name) VALUES
  ('Receitas'), ('Artigos'), ('Notícias'), ('Vídeos'), ('Ferramentas'),
  ('Tech/Dev'), ('IA'), ('UI/Design'), ('Inspiração'), ('Educação'),
  ('Finanças'), ('Saúde')
ON CONFLICT (name) DO NOTHING;
