-- SQL for bulk inserting courses and linking to locations
-- Assumes you have tables: courses (id SERIAL PRIMARY KEY, name TEXT UNIQUE), locations (id SERIAL PRIMARY KEY, name TEXT UNIQUE), location_courses (location_id INT, course_id INT)

-- Insert locations (if not already present)
INSERT INTO locations (name) VALUES
  ('Banks House School'),
  ('Felix House School')
ON CONFLICT (name) DO NOTHING;

-- Insert courses (if not already present)
INSERT INTO courses (name) VALUES
  ('CYP Safeguarding Children and Young People'),
  ('Safeguarding and Protection of Adults'),
  ('First Aid '),
  ('Fire Safety'),
  ('Food Hygiene'),
  ('GDPR 1'),
  ('Health and Safety'),
  ('Lone Working'),
  ('Infection Control'),
  ('Behaviours That Challenge'),
  ('Communication'),
  ('Diabetes Awareness'),
  ('Dignity in Care'),
  ('Epilepsy Awareness'),
  ('Equality, Diversity, Inclusion'),
  ('LGBTQ+ Aware for Care'),
  ('Medication Practice'),
  ('Mental Capacity & DOL''S'),
  ('Moving and Handling'),
  ('Nutrition and Hydration'),
  ('Oral Care'),
  ('Positive Behaviour Support'),
  ('Personal Care'),
  ('Person Centred Care'),
  ('Prevent Extremism and Radicalisation'),
  ('Recording Information'),
  ('Risk Assessment'),
  ('HM Gov. PREVENT Awareness'),
  ('PEG Training'),
  ('PEG online training'),
  ('Epilepsy Action'),
  ('OFSTED Only Training'),
  ('Safeguarding & Child Protection - The Essentials'),
  ('Online Safety'),
  ('KCSIE'),
  ('Special Educational Needs and Disabilities (SEND) E Training'),
  ('Medication Classroom'),
  ('Team Teach Positive Behaviour Training Level 2'),
  ('Team Teach Positive Behaviour'),
  ('The Oliver McGowan Mandatory Training'),
  ('Anxiety'),
  ('Mental Health'),
  ('Self Harm'),
  ('OFSTED Only Training'),
  ('Safeguarding Children Level 2'),
  ('Online Bullying'),
  ('Pupil Mental Health: Trauma and PTSD'),
  ('Online Self Harm'),
  ('LADO Training'),
  ('Trauma Informed Practices'),
  ('Hull CC Safeguarding Children - A Shared Responsibility'),
  ('Administration of Medication')
ON CONFLICT (name) DO NOTHING;

-- Link courses to locations
INSERT INTO location_courses (location_id, course_id)
SELECT l.id, c.id
FROM locations l
JOIN courses c ON (
  (l.name = 'Banks House School' AND c.name IN ('CYP Safeguarding Children and Young People','Safeguarding and Protection of Adults','First Aid ','Fire Safety','Food Hygiene','GDPR 1','Health and Safety','Lone Working','Infection Control','Behaviours That Challenge','Communication','Diabetes Awareness','Dignity in Care','Epilepsy Awareness','Equality, Diversity, Inclusion','LGBTQ+ Aware for Care','Medication Practice','Mental Capacity & DOL''S','Moving and Handling','Nutrition and Hydration','Oral Care','Positive Behaviour Support','Personal Care','Person Centred Care','Prevent Extremism and Radicalisation','Recording Information','Risk Assessment','HM Gov. PREVENT Awareness','PEG Training','PEG online training','Epilepsy Action','OFSTED Only Training','Safeguarding & Child Protection - The Essentials','Online Safety','KCSIE','Special Educational Needs and Disabilities (SEND) E Training','Medication Classroom','Team Teach Positive Behaviour Training Level 2','Team Teach Positive Behaviour Training Level 2','Team Teach Positive Behaviour'))
  OR
  (l.name = 'Felix House School' AND c.name IN ('CYP Safeguarding Children and Young People','Safeguarding and Protection of Adults','First Aid ','Fire Safety','Food Hygiene','GDPR 1','Health and Safety','Lone Working','Infection Control','The Oliver McGowan Mandatory Training','Anxiety','Behaviours That Challenge','Communication','Dignity in Care','Epilepsy Awareness','Equality, Diversity, Inclusion','LGBTQ+ Aware for Care','Medication Practice','Mental Capacity & DOL''S','Mental Health','Moving and Handling','Nutrition and Hydration','Oral Care','Personal Care','Person Centred Care','Positive Behaviour Support','Prevent Extremism and Radicalisation','Recording Information','Risk Assessment','Self Harm','OFSTED Only Training','Safeguarding Children Level 2','Online Safety','Online Bullying','KCSIE','Pupil Mental Health: Trauma and PTSD','Online Self Harm','LADO Training','Trauma Informed Practices','Hull CC Safeguarding Children - A Shared Responsibility','Administration of Medication','Team Teach Positive Behaviour Training Level 2','Team Teach Positive Behaviour'))
);
