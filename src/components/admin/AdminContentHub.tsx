import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText, BookOpen, Users, Tags, Eye, Download, AlertTriangle,
  CalendarClock, Loader2, Archive, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface HubStats {
  published_articles: number;
  draft_articles: number;
  scheduled_articles: number;
  stale_articles: number;
  total_views: number;
  active_themes: number;
  published_publications: number;
  total_downloads: number;
  active_partners: number;
}

const KpiCard: React.FC<{
  icon: React.ReactNode; title: string; value: number | string;
  hint?: string; tone?: 'default' | 'warning' | 'success'; onClick?: () => void;
}> = ({ icon, title, value, hint, tone = 'default', onClick }) => {
  const toneClass =
    tone === 'warning' ? 'border-destructive/40 bg-destructive/5' :
    tone === 'success' ? 'border-primary/30 bg-primary/5' : '';
  return (
    <Card
      className={`${toneClass} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminContentHub: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_hub_stats')
      .select('*')
      .maybeSingle();
    if (error) {
      toast.error('Erreur chargement KPIs');
    } else {
      setStats(data as unknown as HubStats);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const goTab = (tab: string) => navigate(`/admin?tab=${tab}`);

  const runAutoArchive = async () => {
    if (!confirm('Dépublier tous les articles non vus depuis 12 mois ?')) return;
    setArchiving(true);
    const { data, error } = await supabase.rpc('auto_archive_stale_articles');
    if (error) {
      toast.error(error.message);
    } else {
      const n = Array.isArray(data) ? data[0]?.archived_count ?? 0 : 0;
      toast.success(`${n} article(s) archivé(s)`);
      load();
    }
    setArchiving(false);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Hub Contenu
          </CardTitle>
          <CardDescription>
            Vue agrégée des articles, publications, thèmes et partenaires éditoriaux.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<FileText className="h-5 w-5" />}
              title="Articles publiés"
              value={stats.published_articles}
              hint={`${stats.draft_articles} brouillon(s)`}
              onClick={() => goTab('articles')}
            />
            <KpiCard
              icon={<Eye className="h-5 w-5" />}
              title="Vues totales"
              value={stats.total_views.toLocaleString('fr-FR')}
              hint="Tous articles confondus"
            />
            <KpiCard
              icon={<CalendarClock className="h-5 w-5" />}
              title="Articles planifiés"
              value={stats.scheduled_articles}
              hint="En attente de publication"
              tone={stats.scheduled_articles > 0 ? 'success' : 'default'}
              onClick={() => goTab('articles')}
            />
            <KpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Articles obsolètes"
              value={stats.stale_articles}
              hint="Non vus depuis > 90j"
              tone={stats.stale_articles > 5 ? 'warning' : 'default'}
            />
            <KpiCard
              icon={<Tags className="h-5 w-5" />}
              title="Thèmes actifs"
              value={stats.active_themes}
              onClick={() => goTab('article-themes')}
            />
            <KpiCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Publications publiées"
              value={stats.published_publications}
              onClick={() => goTab('publications')}
            />
            <KpiCard
              icon={<Download className="h-5 w-5" />}
              title="Téléchargements"
              value={stats.total_downloads.toLocaleString('fr-FR')}
              hint="Cumul publications"
            />
            <KpiCard
              icon={<Users className="h-5 w-5" />}
              title="Partenaires actifs"
              value={stats.active_partners}
              onClick={() => goTab('partners')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Archive className="h-4 w-4" /> Maintenance éditoriale
          </CardTitle>
          <CardDescription>Actions sur le contenu obsolète ou inactif.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 border rounded-md">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Auto-archivage des articles stagnants</p>
              <p className="text-xs text-muted-foreground">
                Dépublie les articles non consultés depuis plus de 12 mois (cron mensuel automatique le 1er à 03h UTC).
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={runAutoArchive} disabled={archiving}>
              {archiving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Lancer maintenant
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="cursor-pointer" onClick={() => goTab('publication-categories')}>
              Catégories de publications <ArrowRight className="h-3 w-3 ml-1" />
            </Badge>
            <Badge variant="outline" className="cursor-pointer" onClick={() => goTab('articles')}>
              Calendrier éditorial <ArrowRight className="h-3 w-3 ml-1" />
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContentHub;
