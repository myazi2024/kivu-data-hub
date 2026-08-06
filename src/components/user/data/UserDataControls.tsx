import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, ShieldCheck, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserAssets } from '@/hooks/useUserAssets';

const toCsv = (rows: any[]): string => {
  if (!rows.length) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
};

const download = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Réglages « Mes données » : export, visibilité des annonces, suppression. */
export const UserDataControls: React.FC = () => {
  const { user } = useAuth();
  const { rows, listings, refetch } = useUserAssets();
  const [exporting, setExporting] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const allHidden =
    listings.length > 0 &&
    rows.every((r) =>
      (Array.isArray(r.market_listings) ? r.market_listings : []).every(
        (l: any) => l?.isPublished === false,
      ),
    );

  const exportData = async (format: 'json' | 'csv') => {
    if (!user) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_user_data', { target_user_id: user.id });
      if (error) throw error;
      const date = new Date().toISOString().split('T')[0];
      if (format === 'json') {
        download(JSON.stringify(data, null, 2), `mes-donnees-${date}.json`, 'application/json');
      } else {
        const payload: any = data;
        const flat = Array.isArray(payload)
          ? payload
          : Object.entries(payload || {}).flatMap(([section, value]) =>
              Array.isArray(value)
                ? (value as any[]).map((v) => ({ section, ...v }))
                : [{ section, value: JSON.stringify(value) }],
            );
        download(toCsv(flat), `mes-donnees-${date}.csv`, 'text/csv;charset=utf-8');
      }
      toast.success('Export téléchargé');
    } catch (e) {
      console.error('export_user_data', e);
      toast.error("Échec de l'export de vos données");
    } finally {
      setExporting(false);
    }
  };

  const setAllListingsVisibility = async (visible: boolean) => {
    setHiding(true);
    try {
      const targets = rows.filter(
        (r) => Array.isArray(r.market_listings) && r.market_listings.length > 0,
      );
      for (const row of targets) {
        const next = (row.market_listings as any[]).map((l) => ({ ...l, isPublished: visible }));
        const { error } = await supabase
          .from('cadastral_contributions')
          .update({ market_listings: next })
          .eq('id', row.id);
        if (error) throw error;
      }
      toast.success(visible ? 'Toutes vos annonces sont visibles' : 'Toutes vos annonces sont masquées');
      await refetch();
    } catch (e) {
      console.error('bulk listing visibility', e);
      toast.error('Impossible de mettre à jour la visibilité de vos annonces');
    } finally {
      setHiding(false);
    }
  };

  const requestDeletion = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        title: 'Demande de suppression de données',
        message:
          "Votre demande de suppression de vos données déclarées a été enregistrée. Notre équipe la traite sous 30 jours.",
        type: 'info',
      } as any);
      if (error) throw error;
      toast.success('Demande de suppression enregistrée');
      setDeleteOpen(false);
    } catch (e) {
      console.error('deletion request', e);
      toast.error("Impossible d'enregistrer votre demande");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Mes données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium mb-2">Exporter mes données</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={exporting} onClick={() => exportData('json')}>
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              JSON
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={exporting} onClick={() => exportData('csv')}>
              {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-start gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <Label className="text-xs font-medium">Masquer toutes mes annonces</Label>
              <p className="text-[10px] text-muted-foreground">
                Retire vos {listings.length} annonce(s) de la visibilité publique.
              </p>
            </div>
          </div>
          <Switch
            checked={allHidden}
            disabled={hiding || listings.length === 0}
            onCheckedChange={(v) => setAllListingsVisibility(!v)}
            aria-label="Masquer toutes mes annonces"
          />
        </div>

        <div className="pt-3 border-t">
          <Button variant="destructive" size="sm" className="h-8 text-xs gap-1" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3 w-3" />
            Demander la suppression de mes données
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demander la suppression de vos données ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vos déclarations cadastrales approuvées peuvent être conservées pour des raisons
              légales. Votre demande sera examinée par notre équipe sous 30 jours. Cette action
              n'entraîne pas la suppression immédiate de votre compte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={requesting} onClick={(e) => { e.preventDefault(); requestDeletion(); }}>
              {requesting ? 'Envoi…' : 'Confirmer la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserDataControls;
