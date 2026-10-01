import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Info, CreditCard, AlertCircle, ClipboardCheck, TrendingUp } from 'lucide-react';
import SectionHelpPopover from '../SectionHelpPopover';

interface PaymentTabProps {
  formData: any;
  deducedTitleType: { label: string } | null | undefined;
  valorisationValidated: boolean;
  loadingDynamicFees: boolean;
  calculatedFeesResult: any;
  totalAmount: number;
  loading: boolean;
  setActiveTab: (tab: string) => void;
}

const PaymentTab: React.FC<PaymentTabProps> = ({
  formData, deducedTitleType, valorisationValidated, loadingDynamicFees,
  calculatedFeesResult, totalAmount, loading, setActiveTab,
}) => (
                <TabsContent value="payment" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <CreditCard className="h-4 w-4 text-primary" />
                        </div>
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          Frais de dossier
                          <SectionHelpPopover
                            title="Frais de dossier"
                            description="Les frais de dossier sont calculés automatiquement en fonction du type de titre déduit, de la zone (urbaine/rurale) et de la superficie. Les frais obligatoires ne peuvent pas être désélectionnés."
                          />
                        </Label>
                        {deducedTitleType && (
                          <span className="ml-auto text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                            {deducedTitleType.label}
                          </span>
                        )}
                      </div>

                      {!valorisationValidated ? (
                        <div className="flex flex-col items-center py-6 text-center">
                          <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Veuillez d'abord valider l'éligibilité dans l'onglet "Mise en valeur"
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3 rounded-xl"
                            onClick={() => setActiveTab('valorisation')}
                          >
                            Aller à Mise en valeur
                          </Button>
                        </div>
                      ) : loadingDynamicFees ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : calculatedFeesResult.fees.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center">
                          <Info className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Aucun frais configuré pour ce type de titre
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Info sur le calcul */}
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium">Frais calculés selon :</span>
                              <ul className="mt-1 space-y-0.5 text-blue-600 dark:text-blue-500">
                                <li>• Type de titre : <strong>{deducedTitleType?.label}</strong></li>
                                <li>• Zone : <strong>{formData.sectionType === 'urbaine' ? 'Urbaine' : formData.sectionType === 'rurale' ? 'Rurale' : 'Non spécifiée'}</strong></li>
                                {formData.areaSqm && <li>• Superficie : <strong>{formData.areaSqm} m²</strong></li>}
                              </ul>
                            </div>
                          </div>

                          {/* Liste des frais */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase">Détail des frais</p>
                            {calculatedFeesResult.fees.map(fee => (
                              <div key={fee.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{fee.fee_name}</p>
                                  {fee.description && (
                                    <p className="text-xs text-muted-foreground">{fee.description}</p>
                                  )}
                                  {fee.zone_adjustment !== 0 && (
                                    <p className={cn(
                                      "text-[10px] mt-0.5",
                                      fee.zone_adjustment > 0 ? "text-amber-600" : "text-green-600"
                                    )}>
                                      {fee.zone_adjustment > 0 ? '+' : ''}{fee.zone_adjustment}$ (zone {formData.sectionType})
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  {fee.zone_adjustment !== 0 && (
                                    <p className="text-xs text-muted-foreground line-through">${fee.base_amount}</p>
                                  )}
                                  <p className="text-sm font-semibold whitespace-nowrap">${fee.final_amount}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Résumé */}
                          {calculatedFeesResult.breakdown.zoneAdjustment !== 0 && (
                            <div className="p-2 bg-muted/30 rounded-lg text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Frais de base</span>
                                <span>${calculatedFeesResult.breakdown.baseFees}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Ajustement zone</span>
                                <span className={calculatedFeesResult.breakdown.zoneAdjustment > 0 ? "text-amber-600" : "text-green-600"}>
                                  {calculatedFeesResult.breakdown.zoneAdjustment > 0 ? '+' : ''}{calculatedFeesResult.breakdown.zoneAdjustment}$
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Total */}
                  <Card className="border rounded-lg">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <span className="font-semibold text-sm">Total à payer</span>
                        <span className="text-lg font-bold text-primary">${totalAmount}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('documents')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button
                      onClick={() => setActiveTab('review')}
                      disabled={loading}
                      className="flex-1 h-8 text-xs rounded-xl"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Réviser
                        </>
                      )}
                    </Button>
                  </div>
                  </TabsContent>
);

export default PaymentTab;
