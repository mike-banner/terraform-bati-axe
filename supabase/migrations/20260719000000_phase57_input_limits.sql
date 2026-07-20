-- Phase 05.7 : durcissement input validation — CHECK constraints DB
-- Reflète les bornes .max() Zod côté serveur (100/254/500/1000) au niveau SQL,
-- en dernier rempart si un endpoint futur oublie la validation applicative.
-- NOT VALID + VALIDATE séparés : évite un scan bloquant si des lignes existantes
-- dépassent la limite (le check n'est vérifié que pour les futurs writes tant que
-- non validé, puis validé explicitement une fois les données confirmées propres).

-- professionals
ALTER TABLE professionals
  ADD CONSTRAINT professionals_company_name_len CHECK (char_length(company_name) <= 100) NOT VALID;
ALTER TABLE professionals
  ADD CONSTRAINT professionals_full_name_len CHECK (char_length(full_name) <= 100) NOT VALID;
ALTER TABLE professionals
  ADD CONSTRAINT professionals_email_len CHECK (char_length(email) <= 254) NOT VALID;

ALTER TABLE professionals VALIDATE CONSTRAINT professionals_company_name_len;
ALTER TABLE professionals VALIDATE CONSTRAINT professionals_full_name_len;
ALTER TABLE professionals VALIDATE CONSTRAINT professionals_email_len;

-- projects
ALTER TABLE projects
  ADD CONSTRAINT projects_customer_name_len CHECK (char_length(customer_name) <= 100) NOT VALID;
ALTER TABLE projects
  ADD CONSTRAINT projects_customer_email_len CHECK (char_length(customer_email) <= 254) NOT VALID;
ALTER TABLE projects
  ADD CONSTRAINT projects_description_len CHECK (char_length(description) <= 1000) NOT VALID;

ALTER TABLE projects VALIDATE CONSTRAINT projects_customer_name_len;
ALTER TABLE projects VALIDATE CONSTRAINT projects_customer_email_len;
ALTER TABLE projects VALIDATE CONSTRAINT projects_description_len;

-- messages
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_len CHECK (char_length(content) <= 1000) NOT VALID;

ALTER TABLE public.messages VALIDATE CONSTRAINT messages_content_len;

-- completed_projects (réalisations pro)
ALTER TABLE public.completed_projects
  ADD CONSTRAINT completed_projects_title_len CHECK (char_length(title) <= 100) NOT VALID;
ALTER TABLE public.completed_projects
  ADD CONSTRAINT completed_projects_description_len CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID;
ALTER TABLE public.completed_projects
  ADD CONSTRAINT completed_projects_city_len CHECK (city IS NULL OR char_length(city) <= 100) NOT VALID;

ALTER TABLE public.completed_projects VALIDATE CONSTRAINT completed_projects_title_len;
ALTER TABLE public.completed_projects VALIDATE CONSTRAINT completed_projects_description_len;
ALTER TABLE public.completed_projects VALIDATE CONSTRAINT completed_projects_city_len;
