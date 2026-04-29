-- Table to track background test data generation jobs
CREATE TABLE public.test_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','error','cancelled')),
  current_step_key TEXT,
  current_step_index INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 14,
  steps_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  failed_substeps TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  suffix TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active job at a time (queued or running)
CREATE UNIQUE INDEX uniq_active_test_generation_job
  ON public.test_generation_jobs ((1))
  WHERE status IN ('queued','running');

CREATE INDEX idx_test_generation_jobs_status ON public.test_generation_jobs(status);
CREATE INDEX idx_test_generation_jobs_created_at ON public.test_generation_jobs(created_at DESC);

ALTER TABLE public.test_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Admin / super_admin can read all jobs
CREATE POLICY "Admins can view test generation jobs"
ON public.test_generation_jobs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Admins can cancel a job (UPDATE status='cancelled')
CREATE POLICY "Admins can update test generation jobs"
ON public.test_generation_jobs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

-- Inserts/deletes happen via SERVICE_ROLE in edge functions; no client policy needed.

-- Enable realtime
ALTER TABLE public.test_generation_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_generation_jobs;
