CREATE TABLE student_cards (
  student_id uuid PRIMARY KEY REFERENCES users(id),
  number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  verification_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);
