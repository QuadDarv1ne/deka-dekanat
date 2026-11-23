-- An assistant lease is a per-process lock: it protects a single running
-- generation. When the container restarts mid-answer the row survives (the
-- process cannot delete it) and blocks the same user until expires_at passes,
-- which shows up as a spurious 429 "wait for the previous answer".
-- Tagging every lease with the boot id of the process that created it lets the
-- next boot drop leases that cannot possibly still be running.
ALTER TABLE assistant_leases ADD COLUMN boot_id uuid;
