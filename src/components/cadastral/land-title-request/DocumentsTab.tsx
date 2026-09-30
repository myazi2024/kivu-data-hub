import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, ChevronRight } from 'lucide-react';
import SectionHelpPopover from '../SectionHelpPopover';
import { useToast } from '@/hooks/use-toast';
import { LandTitleRequestData } from '@/hooks/useLandTitleRequest';

export interface DocumentsTabProps {
  formData: LandTitleRequestData;
  requesterIdFile: File | null;
  setRequesterIdFile: (file: File | null) => void;
  ownerIdFile: File | null;
  setOwnerIdFile: (file: File | null) => void;
  proofOfOwnershipFile: File | null;
  setProofOfOwnershipFile: (file: File | null) => void;
  procurationFile: File | null;
  setProcurationFile: (file: File | null) => void;
  setActiveTab: (tab: string) => void;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({
  formData,
  requesterIdFile,
  setRequesterIdFile,
  ownerIdFile,
  setOwnerIdFile,
  proofOfOwnershipFile,
  setProofOfOwnershipFile,
  procurationFile,
  setProcurationFile,
  setActiveTab,
}) => {
  const { toast } = useToast();
  return (
                <TabsContent value="documents" className="space-y-4">
                  <Card className="border-2 rounded-lg">
                    <CardContent className="p-3 space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        Documents justificatifs
                        <SectionHelpPopover
                          title="Documents justificatifs"
                          description="Joignez les documents requis : pièce d'identité du demandeur, preuve de propriété (attestation de chef de terre, acte de vente, etc.). Formats acceptés : PDF et images (max 10MB)."
                        />
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pièces d'identité, preuves de propriété (max 10MB/fichier)
                      </p>

                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Pièce d'identité du demandeur</Label>
                          {!requesterIdFile ? (
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
                                  setRequesterIdFile(file);
                                }
                              }}
                              className="h-9 text-sm rounded-lg border"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="flex-1 truncate text-sm">{requesterIdFile.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setRequesterIdFile(null)}
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {(formData.requesterType === 'representative' || formData.requesterType === 'beneficiary') && (
                          <div className="space-y-1.5 animate-fade-in">
                            <Label className="text-sm">Pièce d'identité du propriétaire</Label>
                            {!ownerIdFile ? (
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
                                  setOwnerIdFile(file);
                                }
                              }}
                                className="h-9 text-sm rounded-lg border"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{ownerIdFile.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setOwnerIdFile(null)}
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label className="text-sm">Preuve de propriété (acte de vente, héritage, etc.)</Label>
                          {!proofOfOwnershipFile ? (
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                    return;
                                  }
                                  setProofOfOwnershipFile(file);
                                }
                              }}
                              className="h-9 text-sm rounded-lg border"
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="flex-1 truncate text-sm">{proofOfOwnershipFile.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProofOfOwnershipFile(null)}
                                className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Procuration document for mandataire */}
                        {formData.requesterType === 'representative' && (
                          <div className="space-y-1.5 animate-fade-in">
                            <Label className="text-sm">Procuration (document d'autorisation) *</Label>
                            {!procurationFile ? (
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast({ title: "Fichier trop volumineux", description: "La taille maximale est de 10 MB", variant: "destructive" });
                                      return;
                                    }
                                    setProcurationFile(file);
                                  }
                                }}
                                className="h-9 text-sm rounded-lg border"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                                <span className="flex-1 truncate text-sm">{procurationFile.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setProcurationFile(null)}
                                  className="h-7 w-7 rounded-lg hover:bg-destructive/10"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Document attestant que vous êtes autorisé à agir au nom du propriétaire.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setActiveTab('valorisation')} className="flex-1 h-8 text-xs rounded-xl">
                      Précédent
                    </Button>
                    <Button onClick={() => setActiveTab('payment')} className="flex-1 h-8 text-xs rounded-xl gap-2">
                      Suivant <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
  );
};

export default DocumentsTab;
