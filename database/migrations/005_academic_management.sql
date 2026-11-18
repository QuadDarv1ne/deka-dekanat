ALTER TABLE lessons ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE lessons ADD COLUMN cancelled_at timestamptz;
CREATE TABLE academic_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users,
  kind text NOT NULL CHECK (kind IN ('schedule','grades')),
  rows jsonb NOT NULL,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX academic_imports_expiry ON academic_imports(expires_at);
