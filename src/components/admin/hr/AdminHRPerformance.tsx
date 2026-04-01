import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Star } from 'lucide-react';
import type { PerformanceReview, Employee } from './hrData';
import { useToast } from '@/hooks/use-toast';

interface Props {
  reviews: PerformanceReview[];
  setReviews: (r: PerformanceReview[]) => void;
  employees: Employee[];
}

export default function AdminHRPerformance({ reviews, setReviews, employees }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ employeeId: '', period: '', rating: '3', comments: '', reviewer: '' });

  const handleAdd = () => {
    if (!form.employeeId || !form.period) {
      toast({ title: 'Erreur', description: 'Remplissez les champs obligatoires', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    const newReview: PerformanceReview = {
      id: crypto.randomUUID(),
      employeeId: form.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Inconnu',
      reviewDate: new Date().toISOString().split('T')[0],
      period: form.period,
      overallRating: parseInt(form.rating),
      objectives: [],
      comments: form.comments,
      reviewer: form.reviewer,
    };
    setReviews([...reviews, newReview]);
    setDialogOpen(false);
    setForm({ employeeId: '', period: '', rating: '3', comments: '', reviewer: '' });
    toast({ title: 'Évaluation ajoutée' });
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
                <Select value={form.employeeId} onValueChange={v => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{employees.filter(e => e.status === 'active').map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Période</Label><Input placeholder="ex: Q1 2026" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} /></div>
              <div>
                <Label>Note globale (1-5)</Label>
                <Select value={form.rating} onValueChange={v => setForm({ ...form, rating: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}/5</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Évaluateur</Label><Input value={form.reviewer} onChange={e => setForm({ ...form, reviewer: e.target.value })} /></div>
              <div><Label>Commentaires</Label><Textarea value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} /></div>
              <Button onClick={handleAdd}>Enregistrer</Button>
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
                  <p className="font-medium text-sm">{review.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{review.period} · Évalué par {review.reviewer}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < review.overallRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
              </div>
              {review.comments && <p className="text-xs text-muted-foreground">{review.comments}</p>}
            </CardContent>
          </Card>
        ))}
        {reviews.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune évaluation enregistrée</p>}
      </div>
    </div>
  );
}
