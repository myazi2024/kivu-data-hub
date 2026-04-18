import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import { ResponsiveTable, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from '@/components/ui/responsive-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface RoleHistoryItem {
  id: string;
  action: string;
  created_at: string;
  old_values: any;
  new_values: any;
}

export const RoleHistoryDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<RoleHistoryItem[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('audit_logs').select('id, action, created_at, old_values, new_values')
        .eq('table_name', 'user_roles').order('created_at', { ascending: false }).limit(50);
      setHistory((data as RoleHistoryItem[]) || []);
    })();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-xs h-7">
          <History className="w-3 h-3" /><span className="hidden sm:inline">Historique</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-base md:text-lg">Historique des modifications</DialogTitle></DialogHeader>
        <div className="overflow-x-auto">
          <ResponsiveTable className="border-none">
            <ResponsiveTableHeader>
              <ResponsiveTableRow>
                <ResponsiveTableHead priority="high">Date</ResponsiveTableHead>
                <ResponsiveTableHead priority="medium">Action</ResponsiveTableHead>
                <ResponsiveTableHead priority="high">Détails</ResponsiveTableHead>
              </ResponsiveTableRow>
            </ResponsiveTableHeader>
            <ResponsiveTableBody>
              {history.map((log) => (
                <ResponsiveTableRow key={log.id}>
                  <ResponsiveTableCell priority="high" label="Date">
                    <span className="text-xs">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell priority="medium" label="Action">
                    <Badge variant={log.action === 'DELETE' ? 'destructive' : 'default'} className="text-xs">{log.action}</Badge>
                  </ResponsiveTableCell>
                  <ResponsiveTableCell priority="high" label="Détails">
                    <span className="text-xs">
                      {log.new_values?.role && `Rôle ajouté: ${log.new_values.role}`}
                      {log.old_values?.role && `Rôle retiré: ${log.old_values.role}`}
                    </span>
                  </ResponsiveTableCell>
                </ResponsiveTableRow>
              ))}
            </ResponsiveTableBody>
          </ResponsiveTable>
        </div>
      </DialogContent>
    </Dialog>
  );
};
