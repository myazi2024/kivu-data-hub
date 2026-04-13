import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Star, Trash2 } from 'lucide-react';
import type { HREmployee } from '@/hooks/useHREmployees';
import type { HRReview } from '@/hooks/useHRReviews';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Props {
  hook: {
    reviews: HRReview[];
    addReview: (r: Partial<HRReview>) => Promise<any>;
    deleteReview: (id: string) => Promise<void>;
    isAdding: boolean;
  };
  employees: HREmployee[];
}

export default function AdminHRPerformance({ hook, employees }: Props) {
  const { reviews, addReview, deleteReview, isAdding } = hook;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', review_period: '', score: '3', reviewer_name: '', comments: '', strengths: '', improvements: '' });

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
    });
    setDialogOpen(false);
    setForm({ employee_id: '', review_period: '', score: '3', reviewer_name: '', comments: '', strengths: '', improvements: '' });
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Inconnu';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Évaluations</h2>
          <p className="text-sm text-muted-foreground">{reviews.length} évaluation(s)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle évaluation</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Employé</Label>
                <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Période</Label><Input placeholder="ex: Q1 2026" value={form.review_period} onChange={e => setForm({ ...form, review_period: e.target.value })} /></div>
              <div>
                <Label>Note globale (1-5)</Label>
                <Select value={form.score} onValueChange={v => setForm({ ...form, score: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Évaluateur</Label><Input value={form.reviewer_name} onChange={e => setForm({ ...form, reviewer_name: e.target.value })} /></div>
              <div><Label>Points forts</Label><Textarea value={form.strengths} onChange={e => setForm({ ...form, strengths: e.target.value })} /></div>
              <div><Label>Axes d'amélioration</Label><Textarea value={form.improvements} onChange={e => setForm({ ...form, improvements: e.target.value })} /></div>
              <div><Label>Commentaires</Label><Textarea value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} /></div>
              <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Ajout...' : 'Enregistrer'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {reviews.map(review => (
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
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune évaluation enregistrée</p>}
      </div>
    </div>
  );
}
