ALTER TABLE lessons DROP CONSTRAINT lessons_group_id_starts_at_key;
CREATE UNIQUE INDEX lessons_active_group_start
  ON lessons(group_id, starts_at) WHERE cancelled_at IS NULL;

ALTER TABLE grades ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);

CREATE TABLE grade_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES users,
  subject_id uuid NOT NULL REFERENCES subjects,
  teacher_id uuid NOT NULL REFERENCES users,
  actor_id uuid NOT NULL REFERENCES users,
  previous_points smallint CHECK (previous_points BETWEEN 0 AND 100),
  points smallint NOT NULL CHECK (points BETWEEN 0 AND 100),
  grade_version integer NOT NULL CHECK (grade_version > 0),
  source text NOT NULL CHECK (source IN ('baseline','manual','import')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, grade_version)
);
CREATE INDEX grade_events_student_subject ON grade_events(student_id,subject_id,id DESC);
INSERT INTO grade_events(student_id,subject_id,teacher_id,actor_id,points,grade_version,source,created_at)
  SELECT student_id,subject_id,teacher_id,updated_by,points,version,'baseline',updated_at FROM grades;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='deka_app') THEN
    REVOKE UPDATE, DELETE ON grade_events, audit_log FROM deka_app;
  END IF;
END $$;
