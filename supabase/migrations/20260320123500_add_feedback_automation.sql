-- Feedback form configuration
CREATE TABLE IF NOT EXISTS public.feedback_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL, -- e.g. 'default_form'
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize default form config with values from current hardcoded form
INSERT INTO public.feedback_settings (key, config)
VALUES ('default_form', '{
  "descriptors": ["Well tutored", "Useful", "Basic", "Practical", "Fun", "Nothing New", "Professional", "Informative", "Boring", "Motivating", "Too Long", "Educational", "Hard to follow", "Vague", "Participative", "Interactive", "Disorganised"],
  "scales": [
    {"id": "knowledge", "label": "Knowledge", "before_label": "Before this session", "after_label": "After this session"},
    {"id": "confidence", "label": "Confidence", "before_label": "Before this session", "after_label": "After this session"},
    {"id": "relevance", "label": "Relevance", "label_full": "How relevant was this training to your work role?"}
  ]
}') ON CONFLICT (key) DO NOTHING;

-- Feedback email automation settings
CREATE TABLE IF NOT EXISTS public.feedback_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT false,
  minutes_before_end INT DEFAULT 30,
  email_subject TEXT DEFAULT 'Feedback for {{course_name}}',
  email_body TEXT DEFAULT 'Hi {{staff_name}},\n\nThank you for attending {{course_name}} today. We would love to hear your feedback.\n\nPlease click here to provide your feedback: {{feedback_link}}\n\nBest regards,\nThe Training Team',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize one row for settings if it doesn't exist
INSERT INTO public.feedback_automation_settings (is_enabled)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.feedback_automation_settings LIMIT 1);

-- Add tracking for feedback emails sent to training_events
ALTER TABLE public.training_events ADD COLUMN IF NOT EXISTS feedback_sent_at TIMESTAMPTZ;

-- RLS for feedback_settings
ALTER TABLE public.feedback_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "App authenticated read feedback_settings" ON public.feedback_settings;
CREATE POLICY "App authenticated read feedback_settings" ON public.feedback_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "App admin write feedback_settings" ON public.feedback_settings;
CREATE POLICY "App admin write feedback_settings" ON public.feedback_settings FOR ALL USING (public.current_user_role_tier() = 'admin');

-- RLS for feedback_automation_settings
ALTER TABLE public.feedback_automation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "App scheduler admin read feedback_automation_settings" ON public.feedback_automation_settings;
CREATE POLICY "App scheduler admin read feedback_automation_settings" ON public.feedback_automation_settings FOR SELECT USING (public.current_user_role_tier() IN ('scheduler', 'admin'));
DROP POLICY IF EXISTS "App admin write feedback_automation_settings" ON public.feedback_automation_settings;
CREATE POLICY "App admin write feedback_automation_settings" ON public.feedback_automation_settings FOR ALL USING (public.current_user_role_tier() = 'admin');
