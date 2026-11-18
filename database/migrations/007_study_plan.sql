CREATE TABLE study_plan_preferences (
    student_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES lessons ON DELETE CASCADE,
    marked_ready boolean NOT NULL DEFAULT false,
    reminder_minutes smallint CHECK (reminder_minutes IN (60, 1440)),
    PRIMARY KEY (student_id, lesson_id)
);

CREATE INDEX study_plan_preferences_lesson ON study_plan_preferences (lesson_id);
