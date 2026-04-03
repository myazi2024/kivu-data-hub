import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, ExternalLink, Save, RefreshCw, Mail, Building2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DEFAULT_SLIDES = [
  { id: 'cover', title: 'Couverture', sort_order: 0 },
  { id: 'context', title: 'Le Contexte', sort_order: 1 },
  { id: 'solution', title: 'La Solution', sort_order: 2 },
  { id: 'map', title: 'Carte interactive', sort_order: 3 },
  { id: 'services', title: 'Services', sort_order: 4 },
  { id: 'service-recherche', title: 'Service: Recherche', sort_order: 5 },
  { id: 'service-carte', title: 'Service: Carte', sort_order: 6 },
  { id: 'service-titre', title: 'Service: Titre foncier', sort_order: 7 },
  { id: 'service-expertise', title: 'Service: Expertise', sort_order: 8 },
  { id: 'service-mutation', title: 'Service: Mutation', sort_order: 9 },
  { id: 'service-litiges', title: 'Service: Litiges', sort_order: 10 },
  { id: 'service-hypotheque', title: 'Service: Hypothèque', sort_order: 11 },
  { id: 'service-historique', title: 'Service: Historique fiscal', sort_order: 12 },
  { id: 'how-it-works', title: 'Comment ça marche', sort_order: 13 },
  { id: 'search', title: 'Recherche', sort_order: 14 },
  { id: 'fiche', title: 'Fiche Cadastrale', sort_order: 7 },
  { id: 'verification', title: 'Vérification', sort_order: 8 },
  { id: 'ccc', title: 'Programme CCC', sort_order: 9 },
  { id: 'stats', title: 'Impact & Objectifs', sort_order: 10 },
  { id: 'business', title: 'Business Model', sort_order: 11 },
  { id: 'roadmap', title: 'Roadmap', sort_order: 12 },
  { id: 'team', title: 'Équipe', sort_order: 13 },
  { id: 'pricing', title: 'Tarification', sort_order: 14 },
  { id: 'security', title: 'Sécurité', sort_order: 15 },
  { id: 'partners', title: 'Partenaires', sort_order: 16 },
  { id: 'testimonials', title: 'Témoignages', sort_order: 17 },
  { id: 'demo', title: 'Démo', sort_order: 18 },
  { id: 'why-now', title: 'Pourquoi maintenant', sort_order: 19 },
  { id: 'contact', title: 'Contact', sort_order: 20 },
];

interface SlideConfig {
  id?: string;
  slide_id: string;
  title: string;
  subtitle: string | null;
  enabled: boolean;
  sort_order: number;
}

interface PartnerInquiry {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  message: string;
  status: string;
  created_at: string;
}

const SlidesTab = () => {
  const [slides, setSlides] = useState<SlideConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSlides = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pitch_slides_config')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error(error);
      setSlides(DEFAULT_SLIDES.map(s => ({ slide_id: s.id, title: s.title, sort_order: s.sort_order, subtitle: null, enabled: true })));
    } else if (!data || data.length === 0) {
      setSlides(DEFAULT_SLIDES.map(s => ({ slide_id: s.id, title: s.title, sort_order: s.sort_order, subtitle: null, enabled: true })));
    } else {
      // Merge with defaults to catch any new slides
      const merged = DEFAULT_SLIDES.map(def => {
        const saved = data.find(d => d.slide_id === def.id);
        return saved
          ? { id: saved.id, slide_id: saved.slide_id, title: saved.title, subtitle: saved.subtitle, enabled: saved.enabled, sort_order: saved.sort_order }
          : { slide_id: def.id, title: def.title, subtitle: null, enabled: true, sort_order: def.sort_order };
      });
      merged.sort((a, b) => a.sort_order - b.sort_order);
      setSlides(merged);
    }
    setLoading(false);
    setHasChanges(false);
  };

  useEffect(() => { loadSlides(); }, []);

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newSlides.length) return;
    [newSlides[index], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[index]];
    newSlides.forEach((s, i) => s.sort_order = i);
    setSlides(newSlides);
    setHasChanges(true);
  };

  const toggleSlide = (index: number) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], enabled: !newSlides[index].enabled };
    setSlides(newSlides);
    setHasChanges(true);
  };

  const updateTitle = (index: number, title: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], title };
    setSlides(newSlides);
    setHasChanges(true);
  };

  const updateSubtitle = (index: number, subtitle: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], subtitle: subtitle || null };
    setSlides(newSlides);
    setHasChanges(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const slide of slides) {
        const row = {
          slide_id: slide.slide_id,
          title: slide.title,
          subtitle: slide.subtitle,
          enabled: slide.enabled,
          sort_order: slide.sort_order,
        };
        if (slide.id) {
          await supabase.from('pitch_slides_config').update(row).eq('id', slide.id);
        } else {
          await supabase.from('pitch_slides_config').upsert(row, { onConflict: 'slide_id' });
        }
      }
      toast.success('Configuration sauvegardée');
      await loadSlides();
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{slides.length} slides • {slides.filter(s => s.enabled).length} activés</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/pitch-partenaires', '_blank')}>
            <Eye className="h-4 w-4 mr-1" /> Prévisualiser
          </Button>
          <Button size="sm" onClick={saveAll} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Sous-titre</TableHead>
              <TableHead className="w-20 text-center">Actif</TableHead>
              <TableHead className="w-24 text-center">Ordre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slides.map((slide, idx) => (
              <TableRow key={slide.slide_id} className={!slide.enabled ? 'opacity-50' : ''}>
                <TableCell className="font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <Input
                    value={slide.title}
                    onChange={e => updateTitle(idx, e.target.value)}
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={slide.subtitle || ''}
                    onChange={e => updateSubtitle(idx, e.target.value)}
                    placeholder="Optionnel"
                    className="h-8 text-sm"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch checked={slide.enabled} onCheckedChange={() => toggleSlide(idx)} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(idx, 'up')} disabled={idx === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(idx, 'down')} disabled={idx === slides.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const InquiriesTab = () => {
  const [inquiries, setInquiries] = useState<PartnerInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadInquiries = async () => {
    setLoading(true);
    let query = supabase.from('partner_inquiries').select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data, error } = await query;
    if (error) { console.error(error); }
    setInquiries((data as PartnerInquiry[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadInquiries(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('partner_inquiries').update({ status }).eq('id', id);
    if (error) { toast.error('Erreur'); return; }
    toast.success(`Statut mis à jour : ${status}`);
    loadInquiries();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="destructive">Nouveau</Badge>;
      case 'read': return <Badge variant="secondary">Lu</Badge>;
      case 'processed': return <Badge className="bg-primary text-primary-foreground">Traité</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{inquiries.length} demande(s)</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="new">Nouveaux</SelectItem>
            <SelectItem value="read">Lus</SelectItem>
            <SelectItem value="processed">Traités</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>Aucune demande de partenaire</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map(inq => (
                <TableRow key={inq.id}>
                  <TableCell className="font-medium">{inq.name}</TableCell>
                  <TableCell>{inq.organization || '—'}</TableCell>
                  <TableCell>
                    <a href={`mailto:${inq.email}`} className="text-primary hover:underline text-sm">{inq.email}</a>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{inq.message}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(inq.created_at), 'dd MMM yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>{statusBadge(inq.status)}</TableCell>
                  <TableCell>
                    <Select value={inq.status} onValueChange={(v) => updateStatus(inq.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Nouveau</SelectItem>
                        <SelectItem value="read">Lu</SelectItem>
                        <SelectItem value="processed">Traité</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const AdminPitchConfig = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Présentation BIC</h2>
          <p className="text-sm text-muted-foreground">Gérez les slides et les demandes de partenaires</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open('/pitch-partenaires', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-1" /> Ouvrir la présentation
        </Button>
      </div>

      <Tabs defaultValue="slides">
        <TabsList>
          <TabsTrigger value="slides">Slides</TabsTrigger>
          <TabsTrigger value="inquiries">
            <Mail className="h-4 w-4 mr-1" /> Demandes partenaires
          </TabsTrigger>
        </TabsList>
        <TabsContent value="slides">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration des slides</CardTitle>
              <CardDescription>Activez, désactivez ou réordonnez les slides de la présentation.</CardDescription>
            </CardHeader>
            <CardContent>
              <SlidesTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inquiries">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demandes de partenaires</CardTitle>
              <CardDescription>Suivez et traitez les demandes reçues via le formulaire de contact.</CardDescription>
            </CardHeader>
            <CardContent>
              <InquiriesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPitchConfig;
