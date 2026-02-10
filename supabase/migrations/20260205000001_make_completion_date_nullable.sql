-- Make completion_date nullable to support status-only records (Booked, Awaiting, N/A)
ALTER TABLE staff_training_matrix
ALTER COLUMN completion_date DROP NOT NULL;
