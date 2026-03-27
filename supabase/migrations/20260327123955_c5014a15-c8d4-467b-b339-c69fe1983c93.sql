-- Re-add enum values (safe with IF NOT EXISTS)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'notaire';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'geometre';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'urbaniste';