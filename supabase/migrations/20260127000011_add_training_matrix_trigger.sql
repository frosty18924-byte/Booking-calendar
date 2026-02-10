-- Create function to calculate expiry_date
CREATE OR REPLACE FUNCTION calculate_expiry_date()
RETURNS TRIGGER AS $$
DECLARE
  v_expiry_months INT;
  v_course_id UUID;
BEGIN
  v_course_id := NEW.course_id;
  
  IF v_course_id IS NOT NULL AND NEW.completion_date IS NOT NULL THEN
    SELECT c.expiry_months INTO v_expiry_months
    FROM courses c
    WHERE c.id = v_course_id;
    
    IF v_expiry_months IS NOT NULL THEN
      NEW.expiry_date := NEW.completion_date + (INTERVAL '1 month' * v_expiry_months);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiry_date on insert/update
DROP TRIGGER IF EXISTS set_expiry_date_trigger ON staff_training_matrix;
CREATE TRIGGER set_expiry_date_trigger
BEFORE INSERT OR UPDATE ON staff_training_matrix
FOR EACH ROW
EXECUTE FUNCTION calculate_expiry_date();
