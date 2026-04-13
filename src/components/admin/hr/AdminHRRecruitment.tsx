import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Briefcase, MapPin, Clock, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';
import { departments } from './hrData';
import type { HRJobPosition } from '@/hooks/useHRJobPositions';
import type { HRCandidate } from '@/hooks/useHRCandidates';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminHRCandidatePipeline from './AdminHRCandidatePipeline';

interface Props {
  hook: {
    positions: HRJobPosition[];
    addPosition: (j: Partial<HRJobPosition>) => Promise<any>;
    updatePosition: (j: Partial<HRJobPosition> & { id: string }) => Promise<void>;
    deletePosition: (id: string) => Promise<void>;
    isAdding: boolean;
  };
  candidatesHook: {
    candidates: HRCandidate[];
    addCandidate: (c: Partial<HRCandidate>) => Promise<any>;
    updateCandidate: (c: Partial<HRCandidate> & { id: string }) => Promise<void>;
    deleteCandidate: (id: string) => Promise<void>;
    isAdding: boolean;
  };
  onConvertToEmployee: (candidate: HRCandidate) => void;
}

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = { open: 'default', closed: 'secondary', draft: 'outline' };
const statusLabels: Record<string, string> = { open: 'Ouvert', closed: 'Fermé', draft: 'Brouillon' };

const emptyForm = { title: '', department: '', contract_type: 'CDI', status: 'open' as const, description: '', requirements: '', salary_range: '', location: 'Goma' };

export default function AdminHRRecruitment({ hook, candidatesHook, onConvertToEmployee }: Props) {
  const { positions, addPosition, updatePosition, deletePosition, isAdding } = hook;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<HRJobPosition | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editJob, setEditJob] = useState<HRJobPosition | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState('offers');

  const filtered = positions.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAdd = async () => {
    if (!form.title || !form.department) return;
    await addPosition(form);
    setDialogOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = async () => {
    if (!editJob) return;
    await updatePosition({
      id: editJob.id,
      title: editJob.title,
      department: editJob.department,
      contract_type: editJob.contract_type,
      status: editJob.status,
      description: editJob.description,
      requirements: editJob.requirements,
      salary_range: editJob.salary_range,
      location: editJob.location,
      closes_at: editJob.closes_at,
    });
    setEditJob(null);
  };

  const renderJobForm = (data: any, setData: (d: any) => void) => (
    <div className="space-y-3">
      <div><Label>Titre du poste *</Label><Input value={data.title} onChange={e => setData({ ...data, title: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Département *</Label>
          <Select value={data.department} onValueChange={v => setData({ ...data, department: v })}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type de contrat</Label>
          <Select value={data.contract_type} onValueChange={v => setData({ ...data, contract_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CDI">CDI</SelectItem>
              <SelectItem value="CDD">CDD</SelectItem>
              <SelectItem value="Stage">Stage</SelectItem>
              <SelectItem value="Freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Fourchette salariale</Label><Input value={data.salary_range || ''} onChange={e => setData({ ...data, salary_range: e.target.value })} placeholder="ex: 1500 - 2500 USD" /></div>
        <div><Label>Localisation</Label><Input value={data.location || ''} onChange={e => setData({ ...data, location: e.target.value })} /></div>
      </div>
      <div>
        <Label>Statut</Label>
        <Select value={data.status} onValueChange={v => setData({ ...data, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Ouvert</SelectItem>
            <SelectItem value="closed">Fermé</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Description</Label><Textarea value={data.description || ''} onChange={e => setData({ ...data, description: e.target.value })} rows={3} /></div>
      <div><Label>Prérequis</Label><Textarea value={data.requirements || ''} onChange={e => setData({ ...data, requirements: e.target.value })} rows={3} /></div>
      <div><Label>Date de clôture</Label><Input type="date" value={data.closes_at || ''} onChange={e => setData({ ...data, closes_at: e.target.value || null })} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="offers">Offres d'emploi</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline candidats</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Recrutement</h2>
                <p className="text-sm text-muted-foreground">{positions.filter(j => j.status === 'open').length} poste(s) ouvert(s) sur {positions.length}</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle offre</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Nouvelle offre d'emploi</DialogTitle></DialogHeader>
                  {renderJobForm(form, setForm)}
                  <DialogFooter>
                    <Button onClick={handleAdd} disabled={isAdding}>{isAdding ? 'Création...' : 'Créer'}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un poste..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Tabs value={filterStatus} onValueChange={setFilterStatus}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="open">Ouverts</TabsTrigger>
                  <TabsTrigger value="closed">Fermés</TabsTrigger>
                  <TabsTrigger value="draft">Brouillon</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-3">
              {filtered.map(job => {
                const dept = departments.find(d => d.id === job.department);
                return (
                  <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(job)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{job.title}</h3>
                            <Badge variant={statusColors[job.status]} className="text-[10px]">{statusLabels[job.status]}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{dept?.name || job.department}</span>
                            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.contract_type}</span>
                            {job.salary_range && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary_range}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditJob({ ...job })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette offre ?</AlertDialogTitle>
                                <AlertDialogDescription>L'offre "{job.title}" sera définitivement supprimée.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePosition(job.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucune offre trouvée</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <AdminHRCandidatePipeline hook={candidatesHook} positions={positions} onConvertToEmployee={onConvertToEmployee} />
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.title}
                <Badge variant={statusColors[selected.status]} className="text-xs">{statusLabels[selected.status]}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{departments.find(d => d.id === selected.department)?.name || selected.department}</span>
                {selected.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{selected.location}</span>}
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{selected.contract_type}</span>
                {selected.salary_range && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{selected.salary_range}</span>}
              </div>
              {selected.description && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.description}</p>
                </div>
              )}
              {selected.requirements && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Prérequis</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.requirements}</p>
                </div>
              )}
              {selected.closes_at && (
                <p className="text-xs text-muted-foreground">Date de clôture : {selected.closes_at}</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editJob} onOpenChange={() => setEditJob(null)}>
        {editJob && (
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Modifier l'offre</DialogTitle></DialogHeader>
            {renderJobForm(editJob, setEditJob)}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditJob(null)}>Annuler</Button>
              <Button onClick={handleEdit}>Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
