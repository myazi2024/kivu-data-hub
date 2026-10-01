import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { MapPin, Info, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import SectionHelpPopover from '../SectionHelpPopover';
import { getAllProvinces } from '@/lib/geographicData';
import { LandTitleRequestData } from '@/hooks/useLandTitleRequest';
import { ParcelLocationData, GpsCoordinateEntry, ParcelSideEntry } from './types';
import { ParcelMapPreview } from '../ParcelMapPreview';

export interface LocationTabProps {
  isParcelLinkedMode: boolean;
  parcelValidated: boolean;
  parcelLocationData: ParcelLocationData | null;
  formData: LandTitleRequestData;
  handleInputChange: (field: keyof LandTitleRequestData, value: any) => void;
  availableVilles: string[];
  availableCommunes: string[];
  availableQuartiers: string[];
  availableTerritoires: string[];
  availableCollectivites: string[];
  gpsCoordinates: GpsCoordinateEntry[];
  setGpsCoordinates: (coords: GpsCoordinateEntry[]) => void;
  mapConfig: any;
  parcelSides: ParcelSideEntry[];
  setParcelSides: (sides: ParcelSideEntry[]) => void;
  roadSides: any[];
  setRoadSides: (sides: any[]) => void;
  setActiveTab: (tab: string) => void;
}

const LocationTab: React.FC<LocationTabProps> = ({
  isParcelLinkedMode,
  parcelValidated,
  parcelLocationData,
  formData,
  handleInputChange,
  availableVilles,
  availableCommunes,
  availableQuartiers,
  availableTerritoires,
  availableCollectivites,
  gpsCoordinates,
  setGpsCoordinates,
  mapConfig,
  parcelSides,
  setParcelSides,
  roadSides,
  setRoadSides,
  setActiveTab,
}) => {
  return (
                <TabsContent value="location" className="space-y-4">
                  {/* PARCEL-LINKED MODE: Masked location display (renewal or initial with fiche) */}
                  {isParcelLinkedMode && parcelValidated && parcelLocationData ? (
                    <>
                      <Card className="border-2 rounded-lg">
                        <CardContent className="p-3 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <Label className="text-sm font-semibold">
                              Localisation de la parcelle
                            </Label>
                          </div>

                          <Alert className="border-primary/20 bg-primary/5">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertDescription className="text-xs text-muted-foreground">
                              Les données de localisation ont été chargées depuis la base de données. Ces informations sont masquées car leur accès détaillé est un service payant.
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Province :</span>
                              <p className="font-medium">{parcelLocationData.province || '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Zone :</span>
                              <p className="font-medium">{parcelLocationData.sectionType === 'urbaine' ? 'SU - Urbaine' : 'SR - Rurale'}</p>
                            </div>

                            {parcelLocationData.sectionType === 'urbaine' ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground text-xs">Ville :</span>
                                  <p className="font-medium">{parcelLocationData.ville ? parcelLocationData.ville.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Commune :</span>
                                  <p className="font-medium">{parcelLocationData.commune ? parcelLocationData.commune.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Quartier :</span>
                                  <p className="font-medium">{parcelLocationData.quartier ? parcelLocationData.quartier.charAt(0) + '***' : '—'}</p>
                                </div>
                                {parcelLocationData.avenue && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Avenue :</span>
                                    <p className="font-medium">{parcelLocationData.avenue.charAt(0) + '***'}</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div>
                                  <span className="text-muted-foreground text-xs">Territoire :</span>
                                  <p className="font-medium">{parcelLocationData.territoire ? parcelLocationData.territoire.charAt(0) + '***' : '—'}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Collectivité :</span>
                                  <p className="font-medium">{parcelLocationData.collectivite ? parcelLocationData.collectivite.charAt(0) + '***' : '—'}</p>
                                </div>
                                {parcelLocationData.groupement && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Groupement :</span>
                                    <p className="font-medium">{parcelLocationData.groupement.charAt(0) + '***'}</p>
                                  </div>
                                )}
                                {parcelLocationData.village && (
                                  <div>
                                    <span className="text-muted-foreground text-xs">Village :</span>
                                    <p className="font-medium">{parcelLocationData.village.charAt(0) + '***'}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Croquis de la parcelle - accès gratuit */}
                      {parcelLocationData.gpsCoordinates && parcelLocationData.gpsCoordinates.length >= 3 && (
                        <Card className="border-2 rounded-lg">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-primary/10 rounded-lg">
                                <MapPin className="h-4 w-4 text-primary" />
                              </div>
                              <Label className="text-sm font-semibold">
                                Croquis de la parcelle
                              </Label>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center">
                              {(() => {
                                const coords = parcelLocationData.gpsCoordinates!;
                                const sides = parcelLocationData.parcelSides || [];
                                const lats = coords.map((c: any) => c.lat);
                                const lngs = coords.map((c: any) => c.lng);
                                const minLat = Math.min(...lats);
                                const maxLat = Math.max(...lats);
                                const minLng = Math.min(...lngs);
                                const maxLng = Math.max(...lngs);
                                const padding = 30;
                                const svgW = 280;
                                const svgH = 220;
                                const rangeX = maxLng - minLng || 0.0001;
                                const rangeY = maxLat - minLat || 0.0001;
                                const scale = Math.min((svgW - padding * 2) / rangeX, (svgH - padding * 2) / rangeY);
                                
                                const points = coords.map((c: any) => {
                                  const x = padding + (c.lng - minLng) * scale;
                                  const y = svgH - padding - (c.lat - minLat) * scale;
                                  return { x, y };
                                });
                                
                                const polygonPoints = points.map((p: any) => `${p.x},${p.y}`).join(' ');
                                
                                // Compass rose position (top-right)
                                const compassX = svgW - 28;
                                const compassY = 28;
                                const compassR = 16;
                                
                                return (
                                  <svg width={svgW} height={svgH} className="border border-border rounded bg-background">
                                    {/* Compass rose */}
                                    <g>
                                      {/* Circle */}
                                      <circle cx={compassX} cy={compassY} r={compassR} fill="hsl(var(--muted) / 0.5)" stroke="hsl(var(--border))" strokeWidth="1" />
                                      {/* North arrow */}
                                      <polygon points={`${compassX},${compassY - compassR + 2} ${compassX - 4},${compassY - 2} ${compassX + 4},${compassY - 2}`} fill="hsl(var(--destructive))" />
                                      {/* South arrow */}
                                      <polygon points={`${compassX},${compassY + compassR - 2} ${compassX - 4},${compassY + 2} ${compassX + 4},${compassY + 2}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* East arrow */}
                                      <polygon points={`${compassX + compassR - 2},${compassY} ${compassX + 2},${compassY - 4} ${compassX + 2},${compassY + 4}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* West arrow */}
                                      <polygon points={`${compassX - compassR + 2},${compassY} ${compassX - 2},${compassY - 4} ${compassX - 2},${compassY + 4}`} fill="hsl(var(--muted-foreground) / 0.4)" />
                                      {/* Labels */}
                                      <text x={compassX} y={compassY - compassR - 3} fontSize="8" fill="hsl(var(--destructive))" textAnchor="middle" fontWeight="bold">N</text>
                                      <text x={compassX} y={compassY + compassR + 9} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">S</text>
                                      <text x={compassX + compassR + 6} y={compassY + 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">E</text>
                                      <text x={compassX - compassR - 6} y={compassY + 3} fontSize="7" fill="hsl(var(--muted-foreground))" textAnchor="middle">O</text>
                                    </g>
                                    {/* Parcel polygon */}
                                    <polygon
                                      points={polygonPoints}
                                      fill="hsl(var(--primary) / 0.1)"
                                      stroke="hsl(var(--primary))"
                                      strokeWidth="2"
                                    />
                                    {points.map((p: any, i: number) => (
                                      <g key={i}>
                                        <circle cx={p.x} cy={p.y} r="4" fill="hsl(var(--destructive))" />
                                        <text x={p.x + 6} y={p.y - 6} fontSize="9" fill="hsl(var(--foreground))" fontWeight="bold">
                                          B{i + 1}
                                        </text>
                                        {sides[i]?.length && (
                                          <text
                                            x={(p.x + points[(i + 1) % points.length].x) / 2}
                                            y={(p.y + points[(i + 1) % points.length].y) / 2 - 5}
                                            fontSize="8"
                                            fill="hsl(var(--muted-foreground))"
                                            textAnchor="middle"
                                          >
                                            {sides[i].length}m
                                          </text>
                                        )}
                                      </g>
                                    ))}
                                  </svg>
                                );
                              })()}
                            </div>

                            {parcelLocationData.parcelSides && parcelLocationData.parcelSides.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {parcelLocationData.parcelSides.map((side: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-muted/50 rounded">
                                    <span className="font-medium">{side.name || `Côté ${idx + 1}`}:</span>
                                    <span className="text-muted-foreground">{side.length ? `${side.length}m` : '—'}</span>
                                    {side.borderType === 'route' && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-300 text-blue-700">Route</Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button variant="outline" onClick={() => setActiveTab('requester')} className="flex-1 h-8 text-xs rounded-xl">
                          Précédent
                        </Button>
                        <Button onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl gap-2">
                          Suivant <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Localisation de la parcelle
                          <SectionHelpPopover
                            title="Localisation de la parcelle"
                            description="Précisez l'emplacement exact de la parcelle : province, ville/territoire, commune/collectivité et quartier/village. Choisissez d'abord si la parcelle est en zone urbaine ou rurale."
                          />
                        </Label>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Province *</Label>
                        <Select
                          value={formData.province}
                          onValueChange={(value) => handleInputChange('province', value)}
                        >
                          <SelectTrigger className="h-9 text-sm rounded-xl border">
                            <SelectValue placeholder="Sélectionner la province" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-48 overflow-y-auto w-56">
                            {getAllProvinces().map(province => (
                              <SelectItem key={province} value={province} className="text-sm py-2 rounded-lg">{province}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.province && (
                        <div className="space-y-2 animate-fade-in">
                          <Label className="text-sm">Zone urbaine ou Zone rurale ? *</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleInputChange('sectionType', 'urbaine')}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                formData.sectionType === 'urbaine'
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              )}
                            >
                              SU - Urbaine
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInputChange('sectionType', 'rurale')}
                              className={cn(
                                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                                formData.sectionType === 'rurale'
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              )}
                            >
                              SR - Rurale
                            </button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {formData.sectionType === 'urbaine' && formData.province && (
                    <Card className="border-2 rounded-lg animate-fade-in">
                      <CardContent className="p-3 space-y-3">
                        <Label className="text-sm font-semibold">Section Urbaine (SU)</Label>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Ville *</Label>
                            <Select
                              value={formData.ville}
                              onValueChange={(value) => handleInputChange('ville', value)}
                              disabled={availableVilles.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableVilles.map(ville => (
                                  <SelectItem key={ville} value={ville} className="text-sm py-2">{ville}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Commune *</Label>
                            <Select
                              value={formData.commune}
                              onValueChange={(value) => handleInputChange('commune', value)}
                              disabled={!formData.ville || availableCommunes.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableCommunes.map(commune => (
                                  <SelectItem key={commune} value={commune} className="text-sm py-2">{commune}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Quartier *</Label>
                            <Select
                              value={formData.quartier}
                              onValueChange={(value) => handleInputChange('quartier', value)}
                              disabled={!formData.commune}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableQuartiers.map(quartier => (
                                  <SelectItem key={quartier} value={quartier} className="text-sm py-2">{quartier}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Avenue</Label>
                            <Input
                              value={formData.avenue || ''}
                              onChange={(e) => handleInputChange('avenue', e.target.value)}
                              placeholder="Nom de l'avenue"
                              className="h-9 text-sm rounded-lg border"
                              disabled={!formData.quartier}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {formData.sectionType === 'rurale' && formData.province && (
                    <Card className="border-2 rounded-lg animate-fade-in">
                      <CardContent className="p-3 space-y-3">
                        <Label className="text-sm font-semibold">Section Rurale (SR)</Label>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Territoire *</Label>
                            <Select
                              value={formData.territoire}
                              onValueChange={(value) => handleInputChange('territoire', value)}
                              disabled={availableTerritoires.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableTerritoires.map(territoire => (
                                  <SelectItem key={territoire} value={territoire} className="text-sm py-2">{territoire}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Collectivité *</Label>
                            <Select
                              value={formData.collectivite}
                              onValueChange={(value) => handleInputChange('collectivite', value)}
                              disabled={!formData.territoire || availableCollectivites.length === 0}
                            >
                              <SelectTrigger className="h-9 text-sm rounded-xl border">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {availableCollectivites.map(collectivite => (
                                  <SelectItem key={collectivite} value={collectivite} className="text-sm py-2">{collectivite}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Groupement</Label>
                            <Input
                              value={formData.groupement || ''}
                              onChange={(e) => handleInputChange('groupement', e.target.value)}
                              placeholder="Nom du groupement"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Village</Label>
                            <Input
                              value={formData.village || ''}
                              onChange={(e) => handleInputChange('village', e.target.value)}
                              placeholder="Nom du village"
                              className="h-9 text-sm rounded-lg border"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Map preview for GPS */}
                  {formData.sectionType && formData.province && (
                    <div className="space-y-3 pt-2">
                      <ParcelMapPreview
                        coordinates={gpsCoordinates}
                        onCoordinatesUpdate={setGpsCoordinates}
                        config={mapConfig}
                        enableDrawingMode={true}
                        parcelSides={parcelSides}
                        onParcelSidesUpdate={setParcelSides}
                        onSurfaceChange={(surface) => handleInputChange('areaSqm', surface)}
                        roadSides={roadSides}
                        onRoadSidesChange={setRoadSides}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('requester')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                    </>
                  )}
                </TabsContent>
  );
};

export default LocationTab;
