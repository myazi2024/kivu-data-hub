import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ACTIVE_JOB_KEY = 'test-mode:active-job';

export interface TestGenerationStepRecord {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

export interface TestGenerationJob {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled';
  current_step_index: number;
  current_step_key: string | null;
  total_steps: number;
  steps_state: TestGenerationStepRecord[];
  counts: { parcels?: number; contributions?: number; invoices?: number };
  error: string | null;
  failed_substeps: string[];
  started_at: string | null;
  finished_at: string | null;
  heartbeat_at: string | null;
  created_at: string;
}

const FINISHED = new Set(['done', 'error', 'cancelled']);

/**
 * Subscribes to a `test_generation_jobs` row via Realtime (with a polling
 * fallback) and persists the active job id in localStorage so the UI can
 * resume tracking after a tab close / refresh.
 */
export function useTestGenerationJob(initialJobId?: string | null) {
  const [jobId, setJobId] = useState<string | null>(
    initialJobId ?? (typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_JOB_KEY) : null),
  );
  const [job, setJob] = useState<TestGenerationJob | null>(null);
  const [loading, setLoading] = useState(false);

  // Persist jobId
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (jobId) localStorage.setItem(ACTIVE_JOB_KEY, jobId);
    else localStorage.removeItem(ACTIVE_JOB_KEY);
  }, [jobId]);

  // Fetch + subscribe
  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('test_generation_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        // Job no longer exists — clear it
        setJob(null);
        setJobId(null);
        setLoading(false);
        return;
      }
      const j = data as unknown as TestGenerationJob;
      setJob(j);
      setLoading(false);
      if (FINISHED.has(j.status)) {
        // Keep the job visible (caller will display final state) but stop tracking
        // active state in localStorage so a refresh shows the empty state.
        if (typeof window !== 'undefined') localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    };

    fetchJob();

    const channel = supabase
      .channel(`test-gen-job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'test_generation_jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const j = payload.new as unknown as TestGenerationJob;
          setJob(j);
          if (FINISHED.has(j.status) && typeof window !== 'undefined') {
            localStorage.removeItem(ACTIVE_JOB_KEY);
          }
        },
      )
      .subscribe();

    // Polling fallback every 4s — covers cases where Realtime is delayed
    const pollId = window.setInterval(() => {
      if (job && FINISHED.has(job.status)) return;
      fetchJob();
    }, 4000);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const startJob = useCallback(async (): Promise<{ ok: boolean; jobId?: string; error?: string }> => {
    const { data, error } = await supabase.functions.invoke('generate-test-data');
    if (error) {
      // Some 4xx (409 already-running) come back via data; surface either
      const body = (data ?? {}) as { error?: string; active_job_id?: string };
      if (body?.active_job_id) {
        setJobId(body.active_job_id);
        return { ok: false, error: body.error ?? 'Un job est déjà en cours', jobId: body.active_job_id };
      }
      return { ok: false, error: error.message };
    }
    const body = (data ?? {}) as { ok?: boolean; job_id?: string; error?: string; active_job_id?: string };
    if (body?.active_job_id && !body?.job_id) {
      setJobId(body.active_job_id);
      return { ok: false, error: body.error ?? 'Un job est déjà en cours', jobId: body.active_job_id };
    }
    if (!body?.job_id) {
      return { ok: false, error: body?.error ?? 'Réponse invalide du serveur' };
    }
    setJobId(body.job_id);
    return { ok: true, jobId: body.job_id };
  }, []);

  const cancelJob = useCallback(async () => {
    if (!jobId) return;
    await supabase
      .from('test_generation_jobs')
      .update({ status: 'cancelled', finished_at: new Date().toISOString() })
      .eq('id', jobId);
  }, [jobId]);

  const clearJob = useCallback(() => {
    setJobId(null);
    setJob(null);
  }, []);

  const forceUnlock = useCallback(async (): Promise<{ ok: boolean; purged?: number; error?: string }> => {
    const { data, error } = await supabase.rpc('_purge_stale_test_generation_jobs');
    if (error) return { ok: false, error: error.message };
    setJobId(null);
    setJob(null);
    return { ok: true, purged: (data as number) ?? 0 };
  }, []);

  // Detect a stale job from the client (heartbeat older than 3 minutes)
  const isStale = !!job && !FINISHED.has(job.status) && (() => {
    const hb = job.heartbeat_at ?? job.started_at ?? job.created_at;
    if (!hb) return false;
    return Date.now() - new Date(hb).getTime() > 3 * 60 * 1000;
  })();

  return {
    jobId,
    job,
    loading,
    startJob,
    cancelJob,
    clearJob,
    forceUnlock,
    isActive: !!job && !FINISHED.has(job.status),
    isStale,
  };
}
