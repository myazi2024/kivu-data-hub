import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Mail, Calendar, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  lastGenerated: string;
  status: 'active' | 'paused';
}

interface AutomatedReportsProps {
  reports?: Report[];
  onGenerate?: (reportId: string) => void;
  onSchedule?: (reportId: string) => void;
}

export function AutomatedReports({ 
  reports = [],
  onGenerate = () => {},
  onSchedule = () => {}
}: AutomatedReportsProps) {
  const { toast } = useToast();

  const defaultReports: Report[] = reports.length > 0 ? reports : [
    {
      id: '1',
      name: 'Rapport quotidien revenus',
      type: 'daily',
      lastGenerated: new Date().toISOString(),
      status: 'active'
    },
    {
      id: '2',
      name: 'Rapport hebdomadaire contributions',
      type: 'weekly',
      lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    },
    {
      id: '3',
      name: 'Rapport mensuel performance',
      type: 'monthly',
      lastGenerated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'paused'
    }
  ];

  const handleDownload = (report: Report) => {
    toast({
      title: "Téléchargement en cours",
      description: `Génération de ${report.name}...`
    });
    onGenerate(report.id);
  };

  const handleEmail = (report: Report) => {
    toast({
      title: "Email envoyé",
      description: `${report.name} envoyé par email`
    });
  };

  const handleSchedule = (report: Report) => {
    toast({
      title: "Planification mise à jour",
      description: `${report.name} ${report.status === 'active' ? 'mis en pause' : 'activé'}`
    });
    onSchedule(report.id);
  };

  const getTypeLabel = (type: Report['type']) => {
    switch (type) {
      case 'daily':
        return 'Quotidien';
      case 'weekly':
        return 'Hebdomadaire';
      case 'monthly':
        return 'Mensuel';
    }
  };

  const getTypeColor = (type: Report['type']) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'weekly':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'monthly':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rapports automatisés
          </CardTitle>
          <Button variant="outline" size="sm" className="text-xs h-8">
            <FileText className="h-3 w-3 mr-1" />
            Nouveau rapport
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="space-y-3">
          {defaultReports.map((report) => (
            <div
              key={report.id}
              className="p-3 rounded-lg border bg-card"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs md:text-sm font-semibold truncate">
                    {report.name}
                  </h4>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    Dernière génération: {new Date(report.lastGenerated).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] ${getTypeColor(report.type)}`}
                  >
                    {getTypeLabel(report.type)}
                  </Badge>
                  {report.status === 'active' && (
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] md:text-xs px-2"
                  onClick={() => handleDownload(report)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] md:text-xs px-2"
                  onClick={() => handleEmail(report)}
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Envoyer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] md:text-xs px-2"
                  onClick={() => handleSchedule(report)}
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {report.status === 'active' ? 'Pause' : 'Activer'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
