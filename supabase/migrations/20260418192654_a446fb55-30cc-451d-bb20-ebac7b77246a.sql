DROP VIEW IF EXISTS public.cadastral_orphan_codes;
CREATE VIEW public.cadastral_orphan_codes
WITH (security_invoker = true) AS
SELECT c.*
FROM public.cadastral_contributor_codes c
LEFT JOIN public.cadastral_contributions ct ON ct.id = c.contribution_id
WHERE ct.id IS NULL OR ct.status <> 'approved';