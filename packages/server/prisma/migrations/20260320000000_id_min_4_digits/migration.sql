-- Migration: id_min_4_digits
-- Ensure User and Admin IDs start at minimum 1000 (4 digits).
-- PostgreSQL sequences never reuse values, so IDs already assigned are safe.
-- pg_get_serial_sequence avoids hardcoding the sequence name.

-- User: next ID will be >= 1000
SELECT setval(
  pg_get_serial_sequence('"User"', 'id'),
  GREATEST(999, (SELECT COALESCE(MAX(id), 999) FROM "User"))
);

-- Admin: next ID will be >= 1000
SELECT setval(
  pg_get_serial_sequence('"Admin"', 'id'),
  GREATEST(999, (SELECT COALESCE(MAX(id), 999) FROM "Admin"))
);
