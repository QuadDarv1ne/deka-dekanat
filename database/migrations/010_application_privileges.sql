DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='deka_app') THEN
    REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM deka_app;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO deka_app;
    GRANT INSERT, UPDATE, DELETE ON
      sessions, login_limits, lessons, grades, requests, notifications, announcements,
      assistant_threads, assistant_messages, assistant_leases, assistant_rate_limits,
      academic_imports, study_plan_preferences, lesson_attendance TO deka_app;
    GRANT INSERT ON audit_log, request_events, grade_events, student_cards TO deka_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO deka_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      REVOKE INSERT, UPDATE, DELETE ON TABLES FROM deka_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO deka_app;
  END IF;
END $$;
