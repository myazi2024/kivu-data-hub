import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Grid3X3, MapPin, User, Phone, Mail, Paperclip, FileText, Square,
  Route, TreePine, Shield, AlertTriangle, Download, FileCheck2, Loader2, Award, DollarSign, ChevronDown,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatusBadge } from '@/components/shared/StatusBadge';
import SubdivisionMiniMap from '@/components/cadastral/subdivision/SubdivisionMiniMap';
import {
  SUBDIVISION_STATUS_MAP, PURPOSE_LABELS, REQUESTER_TYPE_LABELS, USAGE_LABELS,
  type SubdivisionRequest,
} from './types';
import { getPlanCommonSpaces, getPlanRoads, getPlanServitudes } from './helpers';
import { exportSubdivisionDossier } from './exportDossier';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { openSubdivisionCertificate } from '@/utils/subdivisionCertificateUrl';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: SubdivisionRequest | null;
  onOpenDocument: (path: string | null | undefined) => void;
}

export function RequestDetailsDialog({ open, onOpenChange, request, onOpenDocument }: Props) {
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  const handleOpenCertificate = async () => {
    if (!request) return;
    setDownloadingCert(true);
    try {
      await openSubdivisionCertificate(request.id);
    } catch (e: any) {
      const msg = e?.message || '';
      toast({
        title: 'Certificat indisponible',
        description: /CERT_NOT_GENERATED/.test(msg)
          ? "Aucun certificat n'a été généré pour cette demande."
          : msg || 'Erreur',
        variant: 'destructive',
      });
    } finally {
      setDownloadingCert(false);
    }
  };

  const handleGenerate = async () => {
    if (!request) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-subdivision-plan', {
        body: { request_id: request.id },
      });
      if (error) throw error;
      toast({ title: 'Plan officiel généré', description: `Version v${(data as any)?.version}` });
    } catch (e: any) {
      toast({ title: 'Échec génération', description: e?.message || 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadOfficial = async () => {
    if (!request) return;
    setDownloading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_signed_subdivision_plan', { p_request_id: request.id });
      if (error) throw error;
      if (typeof data === 'string' && data) window.open(data, '_blank', 'noopener,noreferrer');
      else throw new Error('URL signée indisponible');
    } catch (e: any) {
      toast({ title: 'Téléchargement impossible', description: e?.message || 'Erreur', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const isApproved = request?.status === 'approved';
  const officialPath = (request as any)?.official_plan_path as string | null | undefined;
  const officialVersion = (request as any)?.official_plan_version as number | null | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2"><Grid3X3 className="h-5 w-5 text-primary" /> Détails</DialogTitle>
              <DialogDescription>{request?.reference_number}</DialogDescription>
            </div>
            {request && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {isApproved && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-2">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                      {officialPath ? `Régénérer (v${(officialVersion ?? 0) + 1})` : 'Générer plan officiel'}
                    </Button>
                    {officialPath && (
                      <Button variant="default" size="sm" onClick={handleDownloadOfficial} disabled={downloading} className="gap-2">
                        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Plan officiel v{officialVersion}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleOpenCertificate} disabled={downloadingCert} className="gap-2">
                      {downloadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                      Certificat
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={() => exportSubdivisionDossier(request)} className="gap-2">
                  <Download className="h-4 w-4" /> Dossier PDF
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>
        {request && (
          <ScrollArea className="max-h-[calc(90vh-150px)]">
            <div className="space-y-4 p-1">
              <div className="flex items-center justify-between">
                <StatusBadge status={SUBDIVISION_STATUS_MAP[request.status] || 'pending'} />
                <span className="text-sm text-muted-foreground">{format(new Date(request.created_at), 'PPP', { locale: fr })}</span>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Parcelle mère</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Parcelle:</span> <span className="font-mono ml-1">{request.parcel_number}</span></div>
                  <div><span className="text-muted-foreground">Surface:</span> <span className="ml-1">{request.parent_parcel_area_sqm?.toLocaleString()} m²</span></div>
                  <div><span className="text-muted-foreground">Propriétaire:</span> <span className="ml-1">{request.parent_parcel_owner_name}</span></div>
                  <div><span className="text-muted-foreground">Localisation:</span> <span className="ml-1">{request.parent_parcel_location || '—'}</span></div>
                  {request.parent_parcel_title_reference && (
                    <div><span className="text-muted-foreground">Réf. titre:</span> <span className="ml-1">{request.parent_parcel_title_reference}</span></div>
                  )}
                  {(request as any).parent_parcel_title_type && (
                    <div><span className="text-muted-foreground">Type titre:</span> <span className="ml-1">{(request as any).parent_parcel_title_type}</span></div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Demandeur</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  {request.requester_legal_status && (
                    <div className="col-span-2"><span className="text-muted-foreground">Statut juridique:</span> <span className="ml-1 font-medium">{request.requester_legal_status}</span></div>
                  )}
                  {request.requester_legal_status === 'Personne morale' ? (
                    <>
                      <div className="col-span-2"><span className="text-muted-foreground">Dénomination:</span> <span className="ml-1">{request.requester_last_name}</span></div>
                      {request.requester_entity_type && (
                        <div><span className="text-muted-foreground">Type d'entité:</span> <span className="ml-1">{request.requester_entity_type}{request.requester_entity_subtype ? ` — ${request.requester_entity_subtype}` : ''}</span></div>
                      )}
                      {request.requester_rccm_number && (
                        <div><span className="text-muted-foreground">RCCM / Arrêté:</span> <span className="ml-1">{request.requester_rccm_number}</span></div>
                      )}
                    </>
                  ) : request.requester_legal_status === 'État' ? (
                    <>
                      {request.requester_right_type && (
                        <div><span className="text-muted-foreground">Type de droit:</span> <span className="ml-1">{request.requester_right_type}</span></div>
                      )}
                      {request.requester_state_exploited_by && (
                        <div className="col-span-2"><span className="text-muted-foreground">Exploitée par:</span> <span className="ml-1">{request.requester_state_exploited_by}</span></div>
                      )}
                    </>
                  ) : (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Nom:</span>{' '}
                      <span className="ml-1">{request.requester_last_name} {request.requester_middle_name || ''} {request.requester_first_name}</span>
                      {request.requester_gender && <span className="text-muted-foreground ml-2">({request.requester_gender})</span>}
                    </div>
                  )}
                  {request.requester_nationality && (
                    <div><span className="text-muted-foreground">Nationalité:</span> <span className="ml-1">{request.requester_nationality}</span></div>
                  )}
                  <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span>{request.requester_phone}</span></div>
                  {request.requester_email && (
                    <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span>{request.requester_email}</span></div>
                  )}
                  {request.requester_type && (
                    <div><span className="text-muted-foreground">Qualité:</span> <span className="ml-1">{REQUESTER_TYPE_LABELS[request.requester_type] || request.requester_type}</span></div>
                  )}
                </CardContent>
              </Card>

              {(request.requester_id_document_url || request.proof_of_ownership_url || request.subdivision_sketch_url) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Paperclip className="h-4 w-4" /> Pièces justificatives</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {request.requester_id_document_url && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => onOpenDocument(request.requester_id_document_url)}>
                        <FileText className="h-3.5 w-3.5" /> Pièce d'identité du demandeur
                      </Button>
                    )}
                    {request.proof_of_ownership_url && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => onOpenDocument(request.proof_of_ownership_url)}>
                        <FileText className="h-3.5 w-3.5" /> Preuve de propriété
                      </Button>
                    )}
                    {request.subdivision_sketch_url && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => onOpenDocument(request.subdivision_sketch_url)}>
                        <FileText className="h-3.5 w-3.5" /> Croquis annexe
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" /> Frais &amp; détail</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  {request.purpose_of_subdivision && (
                    <div className="col-span-2"><span className="text-muted-foreground">Motif:</span> <span className="ml-1">{PURPOSE_LABELS[request.purpose_of_subdivision] || request.purpose_of_subdivision}</span></div>
                  )}
                  <div><span className="text-muted-foreground">Frais soumission:</span> <span className="ml-1 font-mono">${Number(request.submission_fee_usd || 0).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Frais instruction:</span> <span className="ml-1 font-mono">${Number(request.processing_fee_usd || 0).toFixed(2)}</span></div>
                  {(request as any).infrastructure_fee_usd != null && (
                    <div><span className="text-muted-foreground">Frais infrastructure:</span> <span className="ml-1 font-mono">${Number((request as any).infrastructure_fee_usd).toFixed(2)}</span></div>
                  )}
                  {(request as any).road_surface_fee_usd != null && Number((request as any).road_surface_fee_usd) > 0 && (
                    <div><span className="text-muted-foreground">Revêtement voirie:</span> <span className="ml-1 font-mono">${Number((request as any).road_surface_fee_usd).toFixed(2)}</span></div>
                  )}
                  <div className="col-span-2 border-t pt-2"><span className="text-muted-foreground">Total:</span> <span className="ml-1 font-bold text-primary">${Number(request.total_amount_usd || 0).toFixed(2)}</span></div>

                  {(() => {
                    const fi: any = (request as any).fee_items;
                    const bd = fi && typeof fi === 'object' ? (fi.breakdown || fi) : null;
                    if (!bd) return null;
                    const rows: Array<[string, any]> = ([
                      ['Lots × tarif', bd.lotsTotal],
                      ['Voirie facturée (ml)', bd.road_length_billable_m],
                      ['Voirie couverte par infrastructure (ml)', bd.road_length_covered_by_infra_m],
                      ['Voirie (linéaire) $', bd.roadTotal],
                      ['Espaces communs $', bd.commonTotal],
                      ['Infrastructures total $', bd.infrastructure_total],
                    ] as Array<[string, any]>).filter(([, v]) => v !== undefined && v !== null);
                    if (rows.length === 0) return null;
                    return (
                      <div className="col-span-2 mt-2 rounded-md bg-muted/30 p-2 space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Décomposition serveur</div>
                        {rows.map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{k}</span>
                            <span className="font-mono">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> Aperçu du plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <SubdivisionMiniMap
                    parentVertices={request.subdivision_plan_data?.parentVertices}
                    lots={request.lots_data || []}
                    roads={getPlanRoads(request)}
                    commonSpaces={getPlanCommonSpaces(request)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Grid3X3 className="h-4 w-4" /> {request.number_of_lots} Lots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {(request.lots_data || []).map((lot: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: lot.color || '#22c55e' }} />
                          <span>Lot {lot.lotNumber || i + 1}</span>
                          {lot.intendedUse && <Badge variant="outline" className="text-[10px] px-1.5">{USAGE_LABELS[lot.intendedUse] || lot.intendedUse}</Badge>}
                        </div>
                        <Badge variant="outline"><Square className="h-3 w-3 mr-1" />{(lot.areaSqm || 0).toLocaleString()} m²</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {getPlanRoads(request).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Route className="h-4 w-4" /> Voies internes ({getPlanRoads(request).length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {getPlanRoads(request).map((road: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <span>{road.name || `Voie ${i + 1}`}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{road.widthM || '?'} m</Badge>
                            <Badge variant="outline">{road.surfaceType || '—'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {getPlanCommonSpaces(request).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><TreePine className="h-4 w-4" /> Espaces communs ({getPlanCommonSpaces(request).length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {getPlanCommonSpaces(request).map((space: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <span>{space.name || space.type}</span>
                          <Badge variant="outline">{(space.areaSqm || 0).toLocaleString()} m²</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {getPlanServitudes(request).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Servitudes ({getPlanServitudes(request).length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {getPlanServitudes(request).map((srv: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm">
                          <span>{srv.description || srv.type}</span>
                          {srv.widthM && <Badge variant="outline">{srv.widthM} m</Badge>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {request.rejection_reason && (
                <Alert variant={request.status === 'returned' ? 'default' : 'destructive'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{request.status === 'returned' ? 'Motif du renvoi:' : 'Motif du rejet:'}</strong> {request.rejection_reason}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
