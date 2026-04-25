import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldCheck, ShieldX, Search, FileText, MapPin, Calendar, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet';
import { useAppAppearance } from '@/hooks/useAppAppearance';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  report: 'Rapport Cadastral',
  invoice: 'Justificatif de Paiement',
  permit: 'Permis de Bâtir',
  certificate: 'Certificat',
  expertise: "Rapport d'Expertise",
  mortgage_receipt: 'Reçu Hypothécaire',
  subdivision_plan: 'Plan de Lotissement',
};

interface VerificationResult {
  verification_code: string;
  document_type: string;
  parcel_number: string;
  generated_at: string;
  is_valid: boolean;
  client_name: string | null;
  metadata: any;
  invalidated_at: string | null;
  invalidation_reason: string | null;
}

const VerifyDocument: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { config } = useAppAppearance();
  const [searchCode, setSearchCode] = useState(code || '');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const appName = config.app_name ? String(config.app_name) : 'BIC';

  useEffect(() => {
    if (code) {
      verifyCode(code);
    }
  }, [code]);

  const verifyCode = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('verify_document_by_code', { p_code: trimmed });

      if (error) throw error;
      setResult(data as unknown as VerificationResult | null);
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/verify/${searchCode.trim().toUpperCase()}`, { replace: true });
      verifyCode(searchCode);
    }
  };

  return (
    <>
      <Helmet>
        <title>Vérification de Document | {appName}</title>
        <meta name="description" content={`Vérifiez l'authenticité d'un document cadastral ${appName} en entrant son code de vérification.`} />
      </Helmet>

      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {config.logo_url ? (
                <img
                  src={String(config.logo_url)}
                  alt={appName}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
              <h1 className="text-2xl font-bold text-foreground">Vérification {appName}</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Entrez le code de vérification imprimé sur votre document cadastral
            </p>
          </div>

          {/* Search form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  value={searchCode}
                  onChange={e => setSearchCode(e.target.value)}
                  placeholder="Ex: BIC-2026-A3F9K2"
                  className="font-mono uppercase"
                />
                <Button type="submit" disabled={loading || !searchCode.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Result */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {searched && !loading && !result && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6 text-center space-y-3">
                <ShieldX className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-lg font-bold text-destructive">Document Non Reconnu</h2>
                <p className="text-sm text-muted-foreground">
                  Aucun document ne correspond à ce code de vérification. Vérifiez que le code est correct ou contactez {appName}.
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card className={result.is_valid ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-destructive/50 bg-destructive/5'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-center gap-2">
                  {result.is_valid ? (
                    <ShieldCheck className="h-10 w-10 text-green-600" />
                  ) : (
                    <ShieldX className="h-10 w-10 text-destructive" />
                  )}
                </div>
                <CardTitle className={`text-center text-lg ${result.is_valid ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                  {result.is_valid ? 'Document Authentique' : 'Document Invalidé'}
                </CardTitle>
                {!result.is_valid && result.invalidation_reason && (
                  <p className="text-center text-sm text-destructive/80">
                    Raison : {result.invalidation_reason}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Type :</span>
                    <Badge variant="secondary">{DOCUMENT_TYPE_LABELS[result.document_type] || result.document_type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Parcelle :</span>
                    <span className="font-mono font-medium">{result.parcel_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Généré le :</span>
                    <span>{new Date(result.generated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {result.client_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Bénéficiaire :</span>
                      <span>{result.client_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Code :</span>
                    <span className="font-mono text-xs">{result.verification_code}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Bureau d'Informations Cadastrales — Goma, RDC
          </p>
        </div>
      </div>
    </>
  );
};

export default VerifyDocument;
