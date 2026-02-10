-- Update the update_course_data function to include never_expires field
CREATE OR REPLACE FUNCTION update_course_data(
  p_course_id UUID,
  p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE courses
  SET 
    name = COALESCE((p_updates->>'name')::VARCHAR, courses.name),
    category = COALESCE((p_updates->>'category')::VARCHAR, courses.category),
    display_order = COALESCE((p_updates->>'display_order')::INTEGER, courses.display_order),
    expiry_months = COALESCE((p_updates->>'expiry_months')::INTEGER, courses.expiry_months),
    never_expires = COALESCE((p_updates->>'never_expires')::BOOLEAN, courses.never_expires)
  WHERE courses.id = p_course_id;
  
  SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'category', category,
    'display_order', display_order,
    'expiry_months', expiry_months,
    'never_expires', never_expires
  ) INTO v_result
  FROM courses
  WHERE id = p_course_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
