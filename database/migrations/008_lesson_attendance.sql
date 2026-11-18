CREATE TABLE lesson_attendance (
    lesson_id uuid NOT NULL REFERENCES lessons ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    status text CHECK (status IN ('present','absent','excused')),
    marked_by uuid NOT NULL REFERENCES users,
    version integer NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (lesson_id, student_id)
);

CREATE INDEX lesson_attendance_student ON lesson_attendance (student_id, lesson_id);
