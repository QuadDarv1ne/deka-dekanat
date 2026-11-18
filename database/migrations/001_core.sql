CREATE TABLE faculties (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE study_groups (
  id uuid PRIMARY KEY,
  faculty_id uuid NOT NULL REFERENCES faculties,
  name text NOT NULL UNIQUE,
  course smallint NOT NULL CHECK (course BETWEEN 1 AND 6),
  program text NOT NULL
);
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student','dean','teacher','admin')),
  faculty_id uuid REFERENCES faculties,
  group_id uuid REFERENCES study_groups,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (role <> 'student' OR group_id IS NOT NULL),
  CHECK (role NOT IN ('student','dean','teacher') OR faculty_id IS NOT NULL)
);
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE login_limits (
  key_hash text PRIMARY KEY,
  failures integer NOT NULL,
  window_start timestamptz NOT NULL
);
CREATE TABLE subjects (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  color text NOT NULL CHECK (color IN ('violet','blue','orange','green'))
);
CREATE TABLE teaching_assignments (
  teacher_id uuid NOT NULL REFERENCES users,
  subject_id uuid NOT NULL REFERENCES subjects,
  group_id uuid NOT NULL REFERENCES study_groups,
  PRIMARY KEY (teacher_id,subject_id,group_id)
);
CREATE TABLE lessons (
  id uuid PRIMARY KEY,
  subject_id uuid NOT NULL REFERENCES subjects,
  group_id uuid NOT NULL REFERENCES study_groups,
  teacher_id uuid NOT NULL REFERENCES users,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  room text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('lecture','practice','lab')),
  note text NOT NULL DEFAULT '',
  CHECK (ends_at > starts_at),
  UNIQUE(group_id,starts_at),
  FOREIGN KEY (teacher_id,subject_id,group_id) REFERENCES teaching_assignments
);
CREATE INDEX lessons_start ON lessons(starts_at);
CREATE TABLE grades (
  student_id uuid NOT NULL REFERENCES users,
  subject_id uuid NOT NULL REFERENCES subjects,
  teacher_id uuid NOT NULL REFERENCES users,
  points smallint NOT NULL CHECK (points BETWEEN 0 AND 100),
  updated_by uuid NOT NULL REFERENCES users,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(student_id,subject_id)
);
CREATE TABLE requests (
  id uuid PRIMARY KEY,
  number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  student_id uuid NOT NULL REFERENCES users,
  faculty_id uuid NOT NULL REFERENCES faculties,
  kind text NOT NULL CHECK (kind IN ('study','scholarship','tax','leave','transfer','other')),
  details text NOT NULL CHECK (length(details) BETWEEN 3 AND 2000),
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_progress','ready','done','rejected','cancelled')),
  assigned_to uuid REFERENCES users,
  staff_note text NOT NULL DEFAULT '',
  verification_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE INDEX requests_faculty_status ON requests(faculty_id,status,created_at DESC);
CREATE INDEX requests_student ON requests(student_id,created_at DESC);
CREATE TABLE request_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES requests,
  actor_id uuid NOT NULL REFERENCES users,
  status text NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users,
  title text NOT NULL,
  body text NOT NULL,
  href text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user ON notifications(user_id,created_at DESC);
CREATE TABLE announcements (
  id uuid PRIMARY KEY,
  faculty_id uuid NOT NULL REFERENCES faculties,
  title text NOT NULL,
  body text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES users,
  action text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
