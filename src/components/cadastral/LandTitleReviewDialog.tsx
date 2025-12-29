import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle,
  ArrowRight,
  User,
  MapPin,
  Home,
  FileText,
  CreditCard,
  AlertCircle,
  Edit
} from 'lucide-react';
import { LandTitleRequestData, LandTitleFee } from '@/hooks/useLandTitleRequest';

interface LandTitleReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onEdit: (tab: string) => void;
  formData: LandTitleRequestData;
  fees: LandTitleFee[];
  totalAmount: number;
  requesterIdFile: File | null;
  ownerIdFile: File | null;
  proofOfOwnershipFile: File | null;
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
}

const LandTitleReviewDialog: React.FC<LandTitleReviewDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onEdit,
  formData,
  fees,
  totalAmount,
  requesterIdFile,
  ownerIdFile,
  proofOfOwnershipFile,
  constructionType,
  constructionNature,
  declaredUsage,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      const timer = setTimeout(() => {
        setHasScrolledToBottom(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 50;
    
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  const getMandatoryFees = () => fees.filter(f => f.is_mandatory);
  const getSelectedOptionalFees = () => fees.filter(f => !f.is_mandatory && formData.selectedFees.includes(f.id));

  const getLocationSummary = () => {
    if (formData.sectionType === 'urbaine') {
      const parts = [formData.province, formData.ville, formData.commune, formData.quartier, formData.avenue].filter(Boolean);
      return parts.join(', ') || 'Non renseigné';
    } else {
      const parts = [formData.province, formData.territoire, formData.collectivite, formData.groupement, formData.village].filter(Boolean);
      return parts.join(', ') || 'Non renseigné';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9998]" />
        <DialogContent className="max-w-[340px] max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999]">
          <div className="px-4 pt-8 pb-2">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold text-center text-primary">
                Récapitulatif de la demande
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                Vérifiez les informations avant de procéder au paiement
              </p>
            </DialogHeader>
          </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2.5 px-3 pb-28 overflow-y-auto max-h-[calc(90vh-180px)]"
        >
          {/* Informations du demandeur */}
          <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Demandeur</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onOpenChange(false); onEdit('requester'); }}
                    className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Nom complet:</strong> {formData.requesterLastName} {formData.requesterFirstName} {formData.requesterMiddleName || ''}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Type:</strong> {formData.requesterType === 'owner' ? 'Propriétaire' : 'Mandataire'}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Téléphone:</strong> {formData.requesterPhone || 'Non renseigné'}</span>
                  </div>
                  {formData.requesterEmail && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Email:</strong> {formData.requesterEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Propriétaire (si différent du demandeur) */}
          {formData.requesterType === 'representative' && (
            <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                  <User className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">Propriétaire</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { onOpenChange(false); onEdit('requester'); }}
                      className="h-6 px-2 text-xs text-blue-500 hover:text-blue-500/80"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-foreground/80">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Nom complet:</strong> {formData.ownerLastName} {formData.ownerFirstName} {formData.ownerMiddleName || ''}</span>
                    </div>
                    {formData.ownerPhone && (
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-foreground">Téléphone:</strong> {formData.ownerPhone}</span>
                      </div>
                    )}
                    {formData.ownerLegalStatus && (
                      <div className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span><strong className="text-foreground">Statut:</strong> {formData.ownerLegalStatus}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Localisation */}
          <Card className="p-3 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <MapPin className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Localisation</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onOpenChange(false); onEdit('location'); }}
                    className="h-6 px-2 text-xs text-green-600 hover:text-green-600/80"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Section:</strong> {formData.sectionType === 'urbaine' ? 'Urbaine (SU)' : 'Rurale (SR)'}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Adresse:</strong> {getLocationSummary()}</span>
                  </div>
                  {formData.areaSqm && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Superficie:</strong> {formData.areaSqm} m²</span>
                    </div>
                  )}
                  {formData.circonscriptionFonciere && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Circonscription:</strong> {formData.circonscriptionFonciere}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Mise en valeur */}
          <Card className="p-3 rounded-xl border-accent/20 bg-accent/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
                <Home className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Mise en valeur</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onOpenChange(false); onEdit('valorisation'); }}
                    className="h-6 px-2 text-xs text-accent-foreground hover:text-accent-foreground/80"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-foreground/80">
                  {constructionType && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Type:</strong> {constructionType}</span>
                    </div>
                  )}
                  {constructionNature && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Nature:</strong> {constructionNature}</span>
                    </div>
                  )}
                  {declaredUsage && (
                    <div className="flex items-start gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-foreground">Usage:</strong> {declaredUsage}</span>
                    </div>
                  )}
                  {!constructionType && !constructionNature && !declaredUsage && (
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground italic">Non renseigné</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Documents */}
          <Card className="p-3 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Documents</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onOpenChange(false); onEdit('documents'); }}
                    className="h-6 px-2 text-xs text-blue-500 hover:text-blue-500/80"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="space-y-1 text-sm text-foreground/80">
                  <div className="flex items-start gap-1.5">
                    {requesterIdFile ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span>
                      <strong className="text-foreground">Pièce d'identité:</strong>{' '}
                      {requesterIdFile ? requesterIdFile.name : <span className="italic text-muted-foreground">Non fourni</span>}
                    </span>
                  </div>
                  {formData.requesterType === 'representative' && (
                    <div className="flex items-start gap-1.5">
                      {ownerIdFile ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span>
                        <strong className="text-foreground">ID Propriétaire:</strong>{' '}
                        {ownerIdFile ? ownerIdFile.name : <span className="italic text-muted-foreground">Non fourni</span>}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-1.5">
                    {proofOfOwnershipFile ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                    )}
                    <span>
                      <strong className="text-foreground">Preuve de propriété:</strong>{' '}
                      {proofOfOwnershipFile ? proofOfOwnershipFile.name : <span className="italic text-muted-foreground">Non fourni</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Frais */}
          <Card className="p-3 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-green-500/20 rounded-lg flex-shrink-0">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">Frais de dossier</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { onOpenChange(false); onEdit('payment'); }}
                    className="h-6 px-2 text-xs text-green-600 hover:text-green-600/80"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="space-y-2 text-sm">
                  {/* Frais obligatoires */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Obligatoires</p>
                    {getMandatoryFees().map(fee => (
                      <div key={fee.id} className="flex items-center justify-between text-foreground/80">
                        <span>{fee.fee_name}</span>
                        <span className="font-medium">${fee.amount_usd}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Frais optionnels sélectionnés */}
                  {getSelectedOptionalFees().length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Optionnels</p>
                      {getSelectedOptionalFees().map(fee => (
                        <div key={fee.id} className="flex items-center justify-between text-foreground/80">
                          <span>{fee.fee_name}</span>
                          <span className="font-medium">${fee.amount_usd}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Total */}
                  <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                    <span className="font-semibold text-foreground">Total à payer</span>
                    <span className="text-lg font-bold text-primary">${totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Avertissement */}
          <Card className="p-3 rounded-xl border-amber-500/30 bg-amber-500/5 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 text-amber-700">Important</h3>
                <p className="text-sm leading-relaxed text-foreground/80">
                  En confirmant, vous certifiez que <strong className="text-foreground">toutes les informations fournies sont exactes</strong>. Toute fausse déclaration peut entraîner le rejet de votre demande et des poursuites judiciaires.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2 rounded-b-2xl">
          <Button 
            onClick={handleConfirm}
            disabled={!hasScrolledToBottom}
            className={`w-full h-10 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              hasScrolledToBottom 
                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            <CreditCard className="h-4 w-4 mr-1.5" />
            <span>Confirmer et payer ${totalAmount}</span>
            <ArrowRight className={`h-4 w-4 ml-1.5 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">
              Veuillez défiler vers le bas ou patienter 2 secondes
            </p>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            Vos données sont traitées de manière confidentielle
          </p>
        </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default LandTitleReviewDialog;
