CREATE TABLE request_messages (
  request_id uuid NOT NULL REFERENCES requests(id),
  sender_id uuid NOT NULL REFERENCES users(id),
  submission_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 2 AND 1200),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, sender_id, submission_id)
);
CREATE INDEX request_messages_order ON request_messages (request_id, created_at, submission_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='deka_app') THEN
    GRANT SELECT, INSERT ON request_messages TO deka_app;
  END IF;
END $$;
