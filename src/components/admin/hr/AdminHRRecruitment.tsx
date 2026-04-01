import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Briefcase, MapPin, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { defaultJobOffers, departments } from './hrData';
import type { JobPosition } from './hrData';

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  open: 'default',
  filled: 'secondary',
  paused: 'outline',
};
const statusLabels: Record<string, string> = { open: 'Ouvert', filled: 'Pourvu', paused: 'En pause' };

export default function AdminHRRecruitment() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<JobPosition | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = defaultJobOffers.filter(j => {
    const matchSearch = j.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || j.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Recrutement</h2>
        <p className="text-sm text-muted-foreground">{defaultJobOffers.filter(j => j.status === 'open').length} poste(s) ouvert(s) sur {defaultJobOffers.length}</p>
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
            <TabsTrigger value="filled">Pourvus</TabsTrigger>
            <TabsTrigger value="paused">En pause</TabsTrigger>
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
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{job.title}</h3>
                      <Badge variant={statusColors[job.status]} className="text-[10px]">{statusLabels[job.status]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{dept?.name}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.contractType}</span>
                      <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{departments.find(d => d.id === selected.department)?.name}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{selected.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{selected.contractType}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{selected.salary}</span>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Description du poste</h4>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Missions principales</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selected.missions.map((m, i) => <li key={i} className="text-sm text-muted-foreground">{m}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Compétences requises</h4>
                <ul className="list-disc list-inside space-y-1">
                  {selected.skills.map((s, i) => <li key={i} className="text-sm text-muted-foreground">{s}</li>)}
                </ul>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Expérience : {selected.experience}</span>
                <span>·</span>
                <span>Publié le {selected.publishedAt}</span>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
