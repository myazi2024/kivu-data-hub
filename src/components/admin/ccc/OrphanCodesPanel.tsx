import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Search, RefreshCw, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logContributionAudit } from '@/utils/contributionAudit';

interface OrphanCode {
  id: string;
  code: string;
  parcel_number: string;
  contribution_id: string;
  value_usd: number;
  is_used: boolean;
  is_valid: boolean;
  created_at: string;
}

export const OrphanCodesPanel: React.FC = () => {
  const [codes, setCodes] = useState<OrphanCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchOrphans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cadastral_orphan_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setCodes((data as unknown as OrphanCode[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Impossible de charger les codes orphelins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrphans(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.parcel_number.toLowerCase().includes(q),
    );
  }, [codes, search]);

  const invalidate = async (code: OrphanCode) => {
    setBusyId(code.id);
    try {
      const { error } = await supabase
        .from('cadastral_contributor_codes')
        .update({
          is_valid: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: 'Code orphelin (contribution non approuvée)',
        })
        .eq('id', code.id);
      if (error) throw error;
      await logContributionAudit({
        contributionId: code.contribution_id,
        action: 'invalidate_code',
        payload: { code_id: code.id, code: code.code },
      });
      toast.success('Code invalidé');
      fetchOrphans();
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            Codes orphelins
            <span className="text-xs font-normal text-muted-foreground">
              ({codes.length} sans contribution approuvée)
            </span>
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Code ou parcelle"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm w-full sm:w-56"
              />
            </div>
            <Button onClick={fetchOrphans} variant="outline" size="sm" className="gap-1">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="p-2">Code</TableHead>
                <TableHead className="p-2 hidden sm:table-cell">Parcelle</TableHead>
                <TableHead className="p-2">Valeur</TableHead>
                <TableHead className="p-2 hidden md:table-cell">Créé</TableHead>
                <TableHead className="p-2">État</TableHead>
                <TableHead className="p-2 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">Chargement…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">Aucun code orphelin 🎉</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id} className="text-xs">
                  <TableCell className="font-mono p-2">{c.code}</TableCell>
                  <TableCell className="hidden sm:table-cell p-2">{c.parcel_number}</TableCell>
                  <TableCell className="p-2 font-semibold">${Number(c.value_usd).toFixed(2)}</TableCell>
                  <TableCell className="hidden md:table-cell p-2 text-muted-foreground">
                    {format(new Date(c.created_at), 'dd/MM/yy', { locale: fr })}
                  </TableCell>
                  <TableCell className="p-2">
                    {c.is_used ? <span className="text-blue-600">Utilisé</span>
                      : c.is_valid ? <span className="text-amber-600">Actif (orphelin)</span>
                      : <span className="text-muted-foreground">Invalidé</span>}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    {c.is_valid && !c.is_used && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === c.id}
                        onClick={() => invalidate(c)}
                        className="h-7 px-2"
                      >
                        <Ban className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrphanCodesPanel;
