import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  tableName: string;
  onAfterImport?: () => void;
}

/**
 * Export/Import JSON générique d'une table de configuration.
 * - Export : télécharge toutes les lignes de la table.
 * - Import : insère les lignes (upsert via id si présent).
 */
export const ConfigJsonExportImport: React.FC<Props> = ({ tableName, onAfterImport }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const { data, error } = await (supabase as any).from(tableName).select('*');
    if (error) {
      toast.error(`Export échoué: ${error.message}`);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export "${tableName}" : ${(data || []).length} lignes`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const rows = JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error('JSON doit être un tableau');
      const { error } = await (supabase as any).from(tableName).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      toast.success(`Import : ${rows.length} lignes`);
      onAfterImport?.();
    } catch (err: any) {
      toast.error(`Import échoué : ${err.message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="h-3 w-3 mr-1" /> Export JSON
      </Button>
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3 w-3 mr-1" /> Import JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />
    </div>
  );
};
