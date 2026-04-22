import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  FileSearch, User, Building, DollarSign, AlertTriangle,
  FileText, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  QUALITY_LABELS, CONDITION_LABELS, CONSTRUCTION_TYPE_LABELS,
  WALL_LABELS, ROOF_LABELS, ROAD_LABELS, SOUND_LABELS,
  WINDOW_LABELS, FLOOR_LABELS, FACADE_ORIENTATION_LABELS,
  BUILDING_POSITION_LABELS, ACCESSIBILITY_LABELS,
} from '@/constants/expertiseLabels';
import type { ExpertiseRequest } from '@/types/expertise';
import { getExtendedData } from './expertiseHelpers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ExpertiseRequest | null;
}

const ExpertiseDetailsDialog: React.FC<Props> = ({ open, onOpenChange, request }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Détails de la demande
          </DialogTitle>
          <DialogDescription>
            Référence: {request?.reference_number}
          </DialogDescription>
        </DialogHeader>

        {request && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Infos générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Parcelle</Label>
                  <p className="font-mono font-bold">{request.parcel_number}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Statut</Label>
                  <StatusBadge status={request.status as any} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Paiement</Label>
                  <Badge variant={request.payment_status === 'paid' ? 'default' : request.payment_status === 'failed' ? 'destructive' : 'secondary'}>
                    {request.payment_status === 'paid' ? 'Payé' : request.payment_status === 'failed' ? 'Échoué' : 'En attente'}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Demandeur */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Demandeur
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nom</Label>
                    <p>{request.requester_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p>{request.requester_email || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {(() => {
                const { userNotes, extendedData } = getExtendedData(request);
                return (
                  <>
                    {/* Bien */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Informations du bien
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {extendedData.construction_type && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Type de construction</Label>
                            <p>{CONSTRUCTION_TYPE_LABELS[extendedData.construction_type] || extendedData.construction_type}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-xs text-muted-foreground">Année de construction</Label>
                          <p>{request.construction_year || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Surface bâtie</Label>
                          <p>{request.total_built_area_sqm ? `${request.total_built_area_sqm} m²` : '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">État</Label>
                          <p>{CONDITION_LABELS[request.property_condition || ''] || request.property_condition || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Qualité</Label>
                          <p>{QUALITY_LABELS[request.construction_quality || ''] || request.construction_quality || '-'}</p>
                        </div>
                        {extendedData.number_of_rooms && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Nombre de pièces</Label>
                            <p>{extendedData.number_of_rooms}</p>
                          </div>
                        )}
                        {extendedData.number_of_bedrooms && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Chambres</Label>
                            <p>{extendedData.number_of_bedrooms}</p>
                          </div>
                        )}
                        {extendedData.number_of_bathrooms && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Salles de bain</Label>
                            <p>{extendedData.number_of_bathrooms}</p>
                          </div>
                        )}
                      </div>
                      {request.property_description && (
                        <div className="mt-2">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm">{request.property_description}</p>
                        </div>
                      )}
                    </div>

                    {/* Matériaux & emplacement */}
                    {(extendedData.wall_material || extendedData.roof_material || extendedData.building_position || extendedData.window_type || extendedData.floor_material) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Matériaux & Emplacement</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {extendedData.wall_material && (<div><Label className="text-xs text-muted-foreground">Murs</Label><p>{WALL_LABELS[extendedData.wall_material] || extendedData.wall_material}</p></div>)}
                            {extendedData.roof_material && (<div><Label className="text-xs text-muted-foreground">Toiture</Label><p>{ROOF_LABELS[extendedData.roof_material] || extendedData.roof_material}</p></div>)}
                            {extendedData.window_type && (<div><Label className="text-xs text-muted-foreground">Fenêtres</Label><p>{WINDOW_LABELS[extendedData.window_type] || extendedData.window_type}</p></div>)}
                            {extendedData.floor_material && (<div><Label className="text-xs text-muted-foreground">Sol</Label><p>{FLOOR_LABELS[extendedData.floor_material] || extendedData.floor_material}</p></div>)}
                            {extendedData.sound_environment && (<div><Label className="text-xs text-muted-foreground">Environnement sonore</Label><p>{SOUND_LABELS[extendedData.sound_environment] || extendedData.sound_environment}</p></div>)}
                            {request.road_access_type && (<div><Label className="text-xs text-muted-foreground">Accès routier</Label><p>{ROAD_LABELS[request.road_access_type] || request.road_access_type}</p></div>)}
                            {extendedData.building_position && (<div><Label className="text-xs text-muted-foreground">Position du bâtiment</Label><p>{BUILDING_POSITION_LABELS[extendedData.building_position] || extendedData.building_position}</p></div>)}
                            {extendedData.facade_orientation && (<div><Label className="text-xs text-muted-foreground">Orientation façade</Label><p>{FACADE_ORIENTATION_LABELS[extendedData.facade_orientation] || extendedData.facade_orientation}</p></div>)}
                            {extendedData.accessibility && (<div><Label className="text-xs text-muted-foreground">Accessibilité</Label><p>{ACCESSIBILITY_LABELS[extendedData.accessibility] || extendedData.accessibility}</p></div>)}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Finitions */}
                    {(extendedData.has_plaster !== undefined || extendedData.has_painting !== undefined || extendedData.has_ceiling !== undefined || extendedData.has_double_glazing) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Finitions</h4>
                          <div className="flex flex-wrap gap-2">
                            {extendedData.has_plaster && <Badge variant="secondary">Crépi</Badge>}
                            {extendedData.has_painting && <Badge variant="secondary">Peinture</Badge>}
                            {extendedData.has_ceiling && <Badge variant="secondary">Faux plafond</Badge>}
                            {extendedData.has_double_glazing && <Badge variant="secondary">Double vitrage</Badge>}
                            {extendedData.is_corner_plot && <Badge variant="secondary">Parcelle en coin</Badge>}
                            {extendedData.has_direct_street_access && <Badge variant="secondary">Accès direct route</Badge>}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Équipements */}
                    {(extendedData.has_pool || extendedData.has_air_conditioning || extendedData.has_solar_panels || extendedData.has_water_tank || extendedData.has_generator || extendedData.has_borehole || extendedData.has_electric_fence || extendedData.has_garage || extendedData.has_cellar || extendedData.has_automatic_gate) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Équipements supplémentaires</h4>
                          <div className="flex flex-wrap gap-2">
                            {extendedData.has_pool && <Badge variant="outline">Piscine</Badge>}
                            {extendedData.has_air_conditioning && <Badge variant="outline">Climatisation</Badge>}
                            {extendedData.has_solar_panels && <Badge variant="outline">Panneaux solaires</Badge>}
                            {extendedData.has_water_tank && <Badge variant="outline">Citerne d'eau</Badge>}
                            {extendedData.has_generator && <Badge variant="outline">Groupe électrogène</Badge>}
                            {extendedData.has_borehole && <Badge variant="outline">Forage</Badge>}
                            {extendedData.has_electric_fence && <Badge variant="outline">Clôture électrique</Badge>}
                            {extendedData.has_garage && <Badge variant="outline">Garage</Badge>}
                            {extendedData.has_cellar && <Badge variant="outline">Cave</Badge>}
                            {extendedData.has_automatic_gate && <Badge variant="outline">Portail automatique</Badge>}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Appartement */}
                    {(extendedData.floor_number || extendedData.apartment_number || extendedData.monthly_charges) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Détails appartement</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {extendedData.floor_number && (<div><Label className="text-xs text-muted-foreground">Étage</Label><p>{extendedData.floor_number} / {extendedData.total_building_floors || '?'}</p></div>)}
                            {extendedData.apartment_number && (<div><Label className="text-xs text-muted-foreground">N° Appartement</Label><p>{extendedData.apartment_number}</p></div>)}
                            {extendedData.monthly_charges && (<div><Label className="text-xs text-muted-foreground">Charges mensuelles</Label><p>${extendedData.monthly_charges}</p></div>)}
                            {extendedData.has_common_areas && (<div><Label className="text-xs text-muted-foreground">Parties communes</Label><p>Oui</p></div>)}
                          </div>
                        </div>
                      </>
                    )}

                    {extendedData.nearby_amenities && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Commodités à proximité</Label>
                          <p className="text-sm mt-1">{extendedData.nearby_amenities}</p>
                        </div>
                      </>
                    )}

                    {extendedData.nearby_noise_sources && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Sources de bruit</Label>
                        <p className="text-sm mt-1">{extendedData.nearby_noise_sources}</p>
                      </div>
                    )}

                    {userNotes && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Notes de l'utilisateur</Label>
                          <p className="text-sm mt-1 bg-muted/50 p-2 rounded-lg">{userNotes}</p>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* Documents joints */}
              {request.supporting_documents && request.supporting_documents.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documents & Photos ({request.supporting_documents.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {request.supporting_documents.map((url, idx) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                        return (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
                          >
                            {isImage ? (
                              <img src={url} alt={`Document ${idx + 1}`} className="w-full h-20 object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-20 bg-muted">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Résultat */}
              {request.status === 'completed' && (
                <>
                  <Separator />
                  <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-700 dark:text-green-400">
                      <DollarSign className="h-4 w-4" />
                      Résultat de l'expertise
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Valeur vénale</Label>
                        <p className="text-lg font-bold text-green-600">
                          ${request.market_value_usd?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Date d'émission</Label>
                        <p>{request.certificate_issue_date ? format(new Date(request.certificate_issue_date), 'dd/MM/yyyy') : '-'}</p>
                      </div>
                    </div>
                    {request.certificate_url && (
                      <Button variant="outline" size="sm" className="mt-2" asChild>
                        <a href={request.certificate_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger le certificat
                        </a>
                      </Button>
                    )}
                  </div>
                </>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <>
                  <Separator />
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      <strong>Motif du rejet:</strong> {request.rejection_reason}
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExpertiseDetailsDialog;
