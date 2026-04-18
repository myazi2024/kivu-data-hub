import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
  admin_name: string | null;
  user_email?: string | null;
}

export interface AuditFilters {
  action?: string;
  table_name?: string;
  user_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const useAuditLogsPaginated = (initialPageSize = 25) => {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({});

  const fetchPage = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.action) query = query.eq('action', filters.action);
    if (filters.table_name) query = query.eq('table_name', filters.table_name);
    if (filters.user_id) query = query.eq('user_id', filters.user_id);
    if (filters.search) {
      query = query.or(`record_id.ilike.%${filters.search}%,table_name.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
    }
    if (filters.date_from) query = query.gte('created_at', filters.date_from);
    if (filters.date_to) query = query.lte('created_at', filters.date_to);

    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (!error && data) {
      // Resolve user emails in batch from profiles
      const userIds = Array.from(new Set(data.map((d: any) => d.user_id).filter(Boolean))) as string[];
      let userMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);
        (profiles || []).forEach((p: any) => {
          userMap[p.id] = p.full_name || p.email || p.id;
        });
      }
      setLogs(
        (data as any[]).map((l) => ({ ...l, user_email: l.user_id ? userMap[l.user_id] || null : null }))
      );
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [page, pageSize, filters]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    logs, loading, page, pageSize, totalCount, totalPages, filters,
    setPage, setPageSize, setFilters,
    refetch: fetchPage,
  };
};

export default useAuditLogsPaginated;
