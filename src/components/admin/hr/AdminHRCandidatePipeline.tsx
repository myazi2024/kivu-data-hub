import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronRight, Trash2, UserPlus, Star } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { HRCandidate } from '@/hooks/useHRCandidates';
import type { HRJobPosition } from '@/hooks/useHRJobPositions';

const stages = [
  { key: 'applied', label: 'Candidature', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { key: 'screening', label: 'Présélection', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { key: 'interview', label: 'Entretien', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { key: 'offer', label: 'Offre', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  { key: 'hired', label: 'Embauché', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { key: 'rejected', label: 'Rejeté', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
];

interface Props {
  hook: {
    candidates: HRCandidate[];
    addCandidate: (c: Partial<HRCandidate>) => Promise<any>;
    updateCandidate: (c: Partial<HRCandidate> & { id: string }) => Promise<void>;
    deleteCandidate: (id: string) => Promise<void>;
    isAdding: boolean;
  };
  positions: HRJobPosition[];
  onConvertToEmployee?: (candidate: HRCandidate) => void;
}

const emptyForm = { first_name: '', last_name: '', email: '', phone: '', position_id: '', score: '', notes: '' };

export default function AdminHRCandidatePipeline({ hook, positions, onConvertToEmployee }: Props) {
  const { candidates, addCandidate, updateCandidate, deleteCandidate, isAdding } = hook;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleAdd = async () => {
    if (!form.first_name || !form.last_name) return;
    await addCandidate({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      position_id: form.position_id || null,
      score: form.score ? parseInt(form.score) : null,
      notes: form.notes || null,
    });
    setDialogOpen(false);
    setForm(emptyForm);
  };

  const moveToStage = async (id: string, stage: string) => {
    await updateCandidate({ id, pipeline_stage: stage });
  };

  const getPositionTitle = (id: string | null) => {
    if (!id) return '—';
    return positions.find(p => p.id === id)?.title || '—';
  };

  const activeStages = stages.filter(s => s.key !== 'rejected');
  const rejectedCandidates = candidates.filter(c => c.pipeline_stage === 'rejected');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Pipeline de recrutement</h3>
          <p className="text-sm text-muted-foreground">{candidates.length} candidat(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter candidat</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau candidat</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Prénom *</Label><Input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>Nom *</Label><Input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div>
                <Label>Poste visé</Label>
                <Select value={form.position_id} onValueChange={v => setForm({ ...form, position_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{positions.filter(p => p.status === 'open').map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Score (0-10)</Label><Input type="number" min="0" max="10" value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Ajout...' : 'Ajouter'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {activeStages.map(stage => {
          const stageCandidates = candidates.filter(c => c.pipeline_stage === stage.key);
          return (
            <Card key={stage.key}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center justify-between">
                  <span>{stage.label}</span>
                  <Badge variant="outline" className="text-[10px]">{stageCandidates.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-2 space-y-2 min-h-[100px]">
                {stageCandidates.map(candidate => (
                  <Card key={candidate.id} className="shadow-sm">
                    <CardContent className="p-2">
                      <p className="text-xs font-medium">{candidate.first_name} {candidate.last_name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{getPositionTitle(candidate.position_id)}</p>
                      {candidate.score !== null && (
                        <div className="flex items-center gap-0.5 mt-1">
                          <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-medium">{candidate.score}/10</span>
                        </div>
                      )}
                      <div className="flex gap-0.5 mt-1 flex-wrap">
                        {stages.filter(s => s.key !== stage.key && s.key !== 'rejected').map(s => (
                          <Button key={s.key} size="sm" variant="ghost" className="h-5 px-1 text-[9px]" onClick={() => moveToStage(candidate.id, s.key)}>
                            {s.label.slice(0, 3)}
                          </Button>
                        ))}
                        {stage.key === 'hired' && onConvertToEmployee && (
                          <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px] text-green-600" onClick={() => onConvertToEmployee(candidate)}>
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-5 px-1 text-[9px] text-destructive" onClick={() => moveToStage(candidate.id, 'rejected')}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rejected */}
      {rejectedCandidates.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3"><CardTitle className="text-xs text-destructive">Rejetés ({rejectedCandidates.length})</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="flex flex-wrap gap-2">
              {rejectedCandidates.map(c => (
                <div key={c.id} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {c.first_name} {c.last_name}
                  <Button size="sm" variant="ghost" className="h-4 px-1 text-[9px]" onClick={() => moveToStage(c.id, 'applied')}>↩</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-4 px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                        <AlertDialogDescription>{c.first_name} {c.last_name} sera supprimé.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteCandidate(c.id)}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
