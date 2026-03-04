import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, FileText, Settings, Loader2, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CERTIFICATE_TYPE_LABELS } from '@/types/certificate';
import type { CertificateType } from '@/types/certificate';
import { CertificateTemplateEditor } from './certificates/CertificateTemplateEditor';
import {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
} from '@/components/ui/responsive-table';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface GeneratedCertificate {
  id: string;
  certificate_type: string;
  reference_number: string;
  recipient_name: string;
  parcel_number: string;
  certificate_url: string | null;
  status: string;
  generated_at: string;
  generated_by: string | null;
}

const AdminCertificates: React.FC = () => {
  const [generatedCerts, setGeneratedCerts] = useState<GeneratedCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchGeneratedCertificates();
    fetchStats();
  }, []);

  const fetchGeneratedCertificates = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('generated_certificates')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setGeneratedCerts((data || []) as GeneratedCertificate[]);
    } catch {
      // Table may not exist yet, that's ok
      setGeneratedCerts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count by type from generated_certificates
      const { data, error } = await (supabase as any)
        .from('generated_certificates')
        .select('certificate_type');
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        counts[c.certificate_type] = (counts[c.certificate_type] || 0) + 1;
      });
      setStats(counts);
    } catch {
      setStats({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Gestion des Certificats
          </h2>
          <p className="text-xs text-muted-foreground">
            Modèles, génération automatique et historique des certificats
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(CERTIFICATE_TYPE_LABELS).map(([key, label]) => (
          <Card key={key} className="rounded-xl">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{stats[key] || 0}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="templates" className="text-xs gap-1">
            <Settings className="h-3.5 w-3.5" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <CertificateTemplateEditor />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Certificats générés</h3>
                <Button variant="outline" size="sm" onClick={fetchGeneratedCertificates}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Actualiser
                </Button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : generatedCerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun certificat généré</p>
                  <p className="text-xs">Les certificats apparaîtront ici après génération</p>
                </div>
              ) : (
                <ResponsiveTable>
                  <ResponsiveTableHeader>
                    <ResponsiveTableRow>
                      <ResponsiveTableHead priority="high">Référence</ResponsiveTableHead>
                      <ResponsiveTableHead priority="high">Type</ResponsiveTableHead>
                      <ResponsiveTableHead priority="medium">Bénéficiaire</ResponsiveTableHead>
                      <ResponsiveTableHead priority="low">Parcelle</ResponsiveTableHead>
                      <ResponsiveTableHead priority="medium">Date</ResponsiveTableHead>
                      <ResponsiveTableHead priority="high">Actions</ResponsiveTableHead>
                    </ResponsiveTableRow>
                  </ResponsiveTableHeader>
                  <ResponsiveTableBody>
                    {generatedCerts.map(cert => (
                      <ResponsiveTableRow key={cert.id}>
                        <ResponsiveTableCell priority="high">
                          <span className="font-mono text-xs">{cert.reference_number}</span>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="high">
                          <Badge variant="secondary" className="text-[10px]">
                            {CERTIFICATE_TYPE_LABELS[cert.certificate_type as CertificateType] || cert.certificate_type}
                          </Badge>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="medium">
                          <span className="text-xs">{cert.recipient_name}</span>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="low">
                          <span className="text-xs">{cert.parcel_number}</span>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="medium">
                          <span className="text-xs">{format(new Date(cert.generated_at), 'dd/MM/yyyy HH:mm')}</span>
                        </ResponsiveTableCell>
                        <ResponsiveTableCell priority="high">
                          {cert.certificate_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => window.open(cert.certificate_url!, '_blank')}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          )}
                        </ResponsiveTableCell>
                      </ResponsiveTableRow>
                    ))}
                  </ResponsiveTableBody>
                </ResponsiveTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCertificates;
