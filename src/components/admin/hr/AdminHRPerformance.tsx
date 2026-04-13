import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Star, Trash2, Pencil, Target } from 'lucide-react';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRReview } from '@/hooks/useHRReviews';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Objective {
  title: string;
  description: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

interface Props {
  hook: {
    reviews: HRReview[];
    addReview: (r: Partial<HRReview>) => Promise<any>;
    deleteReview: (id: string) => Promise<void>;
    isAdding: boolean;
    updateReview?: (r: Partial<HRReview> & { id: string }) => Promise<void>;
  };
  employees: HREmployee[];
}

const emptyObjective: Objective = { title: '', description: '', progress: 0, status: 'not_started' };

export default function AdminHRPerformance({ hook, employees }: Props) {
  const { reviews, addReview, deleteReview, isAdding, updateReview } = hook;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReview, setEditReview] = useState<HRReview | null>(null);
  const [form, setForm] = useState({
    employee_id: '', review_period: '', score: '3', reviewer_name: '', comments: '', strengths: '', improvements: '',
    objectives: [] as Objective[],
  });

  const resetForm = () => setForm({
    employee_id: '', review_period: '', score: '3', reviewer_name: '', comments: '', strengths: '', improvements: '',
    objectives: [],
  });

  const handleAdd = async () => {
    if (!form.employee_id || !form.review_period) return;
    await addReview({
      employee_id: form.employee_id,
      review_period: form.review_period,
      score: parseInt(form.score),
      reviewer_name: form.reviewer_name || null,
      comments: form.comments || null,
      strengths: form.strengths || null,
      improvements: form.improvements || null,
      objectives: form.objectives,
    });
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!editReview || !updateReview) return;
    await updateReview({
      id: editReview.id,
      review_period: editReview.review_period,
      score: editReview.score,
      reviewer_name: editReview.reviewer_name,
      comments: editReview.comments,
      strengths: editReview.strengths,
      improvements: editReview.improvements,
      objectives: editReview.objectives,
    });
    setEditReview(null);
  };

  const addObjective = (isEdit: boolean) => {
    if (isEdit && editReview) {
      setEditReview({ ...editReview, objectives: [...(editReview.objectives || []), { ...emptyObjective }] });
    } else {
      setForm({ ...form, objectives: [...form.objectives, { ...emptyObjective }] });
    }
  };

  const updateObjective = (index: number, field: string, value: any, isEdit: boolean) => {
    if (isEdit && editReview) {
      const objs = [...(editReview.objectives || [])];
      objs[index] = { ...objs[index], [field]: value };
      setEditReview({ ...editReview, objectives: objs });
    } else {
      const objs = [...form.objectives];
      objs[index] = { ...objs[index], [field]: value };
      setForm({ ...form, objectives: objs });
    }
  };

  const removeObjective = (index: number, isEdit: boolean) => {
    if (isEdit && editReview) {
      setEditReview({ ...editReview, objectives: (editReview.objectives || []).filter((_, i) => i !== index) });
    } else {
      setForm({ ...form, objectives: form.objectives.filter((_, i) => i !== index) });
    }
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Inconnu';
  };

  const objStatusLabel: Record<string, string> = { not_started: 'Non démarré', in_progress: 'En cours', completed: 'Terminé' };

  const renderObjectivesForm = (objectives: Objective[], isEdit: boolean) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Objectifs SMART</Label>
        <Button type="button" size="sm" variant="outline" className="h-6 text-xs" onClick={() => addObjective(isEdit)}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter
        </Button>
      </div>
      {objectives.map((obj, i) => (
        <Card key={i} className="p-2">
          <div className="space-y-1">
            <div className="flex gap-2">
              <Input placeholder="Titre" className="text-xs h-7" value={obj.title} onChange={e => updateObjective(i, 'title', e.target.value, isEdit)} />
              <Select value={obj.status} onValueChange={v => updateObjective(i, 'status', v, isEdit)}>
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Non démarré</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" className="h-7 px-1 text-destructive" onClick={() => removeObjective(i, isEdit)}><Trash2 className="h-3 w-3" /></Button>
            </div>
            <Input placeholder="Description" className="text-xs h-7" value={obj.description} onChange={e => updateObjective(i, 'description', e.target.value, isEdit)} />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8">{obj.progress}%</span>
              <Input type="range" min="0" max="100" step="5" value={obj.progress} onChange={e => updateObjective(i, 'progress', parseInt(e.target.value), isEdit)} className="h-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderFormFields = (data: any, setData: (d: any) => void, isEdit: boolean) => (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {!isEdit && (
        <div>
          <Label>Employé</Label>
          <Select value={data.employee_id} onValueChange={v => setData({ ...data, employee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div><Label>Période</Label><Input placeholder="ex: Q1 2026" value={data.review_period} onChange={e => setData({ ...data, review_period: e.target.value })} /></div>
      <div>
        <Label>Note globale (1-5)</Label>
        <Select value={String(data.score)} onValueChange={v => setData({ ...data, score: isEdit ? parseInt(v) : v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Évaluateur</Label><Input value={data.reviewer_name || ''} onChange={e => setData({ ...data, reviewer_name: e.target.value })} /></div>
      <div><Label>Points forts</Label><Textarea value={data.strengths || ''} onChange={e => setData({ ...data, strengths: e.target.value })} /></div>
      <div><Label>Axes d'amélioration</Label><Textarea value={data.improvements || ''} onChange={e => setData({ ...data, improvements: e.target.value })} /></div>
      <div><Label>Commentaires</Label><Textarea value={data.comments || ''} onChange={e => setData({ ...data, comments: e.target.value })} /></div>
      {renderObjectivesForm(data.objectives || [], isEdit)}
    </div>
  );

  // Group reviews by employee for history
  const employeeScoreHistory = (() => {
    const map = new Map<string, { name: string; reviews: { period: string; score: number }[] }>();
    reviews.forEach(r => {
      if (!map.has(r.employee_id)) map.set(r.employee_id, { name: getEmployeeName(r.employee_id), reviews: [] });
      if (r.score) map.get(r.employee_id)!.reviews.push({ period: r.review_period, score: r.score });
    });
    return Array.from(map.entries()).filter(([, v]) => v.reviews.length >= 2);
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Évaluations</h2>
          <p className="text-sm text-muted-foreground">{reviews.length} évaluation(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle évaluation</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
            {renderFormFields(form, setForm, false)}
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Ajout...' : 'Enregistrer'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Score history */}
      {employeeScoreHistory.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Évolution des scores</p>
            <div className="space-y-2">
              {employeeScoreHistory.map(([id, data]) => (
                <div key={id} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate font-medium">{data.name}</span>
                  <div className="flex items-center gap-1">
                    {data.reviews.map((r, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        <span className="text-muted-foreground">{r.period}:</span>
                        <span className="font-bold">{r.score}/5</span>
                        {i < data.reviews.length - 1 && <span className="text-muted-foreground mx-1">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {reviews.map(review => {
          const objectives = (review.objectives || []) as Objective[];
          return (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{getEmployeeName(review.employee_id)}</p>
                    <p className="text-xs text-muted-foreground">{review.review_period} · Évalué par {review.reviewer_name || '—'} · {review.review_date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < (review.score || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                      ))}
                    </div>
                    {updateReview && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditReview({ ...review })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette évaluation ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteReview(review.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {review.strengths && <p className="text-xs text-green-700 dark:text-green-400">✓ {review.strengths}</p>}
                {review.improvements && <p className="text-xs text-orange-600 dark:text-orange-400">△ {review.improvements}</p>}
                {review.comments && <p className="text-xs text-muted-foreground mt-1">{review.comments}</p>}

                {/* Objectives */}
                {objectives.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-2">
                    <p className="text-xs font-medium flex items-center gap-1"><Target className="h-3 w-3" /> Objectifs ({objectives.length})</p>
                    {objectives.map((obj, i) => (
                      <div key={i} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{obj.title || `Objectif ${i + 1}`}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${obj.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : obj.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}>
                            {objStatusLabel[obj.status] || obj.status}
                          </span>
                        </div>
                        {obj.description && <p className="text-[10px] text-muted-foreground">{obj.description}</p>}
                        <Progress value={obj.progress} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {reviews.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune évaluation enregistrée</p>}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editReview} onOpenChange={() => setEditReview(null)}>
        {editReview && (
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Modifier l'évaluation</DialogTitle></DialogHeader>
            {renderFormFields(editReview, setEditReview, true)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditReview(null)}>Annuler</Button>
              <Button onClick={handleEdit}>Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
