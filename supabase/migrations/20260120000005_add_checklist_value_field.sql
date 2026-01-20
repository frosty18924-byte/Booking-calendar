-- Add value field to checklist_completions to store text data (e.g., invoice number)
ALTER TABLE checklist_completions ADD COLUMN value TEXT;
