import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { useConfigSnapshots } from '@/hooks/useConfigSnapshots';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface Props {
  tableName: string;
  title?: string;
}

export const ConfigSnapshotPanel: React.FC<Props> = ({ tableName, title }) => {
  const { snapshots, loading, createSnapshot, deleteSnapshot } = useConfigSnapshots(tableName);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const ok = await createSnapshot(name.trim(), desc.trim() || undefined);
    setBusy(false);
    if (ok) {
      setName('');
      setDesc('');
      setOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" /> Snapshots {title || tableName}
            </CardTitle>
            <CardDescription className="text-xs">
              Sauvegarde l'état complet de la table pour restauration manuelle ultérieure.
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Camera className="h-3 w-3 mr-1" /> Capturer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau snapshot</DialogTitle>
                <DialogDescription>Capture l'état actuel de "{tableName}".</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Nom (ex: avant-modif-tarifs)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optionnel)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
                <Button onClick={handleCreate} disabled={!name.trim() || busy}>
                  {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Capturer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : snapshots.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun snapshot</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {snapshots.map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-2 p-2 border rounded-lg">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.snapshot_name}</span>
                    <Badge variant="outline" className="text-xs">{s.row_count} lignes</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.created_by_name || 'Admin'} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true, locale: fr })}
                  </p>
                  {s.description && <p className="text-xs">{s.description}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteSnapshot(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
