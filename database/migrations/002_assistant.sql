CREATE TABLE assistant_threads (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assistant_threads_user ON assistant_threads(user_id,updated_at DESC);
CREATE TABLE assistant_messages (
  id uuid PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES assistant_threads ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('user','assistant')),
  content text NOT NULL DEFAULT '' CHECK(length(content)<=20000),
  status text NOT NULL CHECK(status IN ('pending','complete','failed')),
  sources jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assistant_messages_thread ON assistant_messages(thread_id,created_at,id);
CREATE TABLE assistant_leases (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);
CREATE TABLE assistant_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES users ON DELETE CASCADE,
  count integer NOT NULL,
  window_start timestamptz NOT NULL
);
