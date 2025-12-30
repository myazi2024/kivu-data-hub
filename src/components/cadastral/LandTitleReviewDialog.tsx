import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  User, 
  MapPin, 
  Home, 
  FileText, 
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Edit
} from 'lucide-react';

interface ReviewSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: ReviewItem[];
  isComplete: boolean;
}

interface ReviewItem {
  label: string;
  value: string | null | undefined;
  isRequired: boolean;
}

interface LandTitleReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onEdit: (tabId: string) => void;
  formData: {
    requesterType: string;
    requesterLastName: string;
    requesterFirstName: string;
    requesterMiddleName?: string;
    requesterPhone: string;
    requesterEmail?: string;
    isOwnerSameAsRequester: boolean;
    ownerLastName?: string;
    ownerFirstName?: string;
    ownerMiddleName?: string;
    ownerPhone?: string;
    ownerLegalStatus?: string;
    sectionType: string;
    province: string;
    ville?: string;
    commune?: string;
    quartier?: string;
    avenue?: string;
    territoire?: string;
    collectivite?: string;
    groupement?: string;
    village?: string;
    areaSqm?: number;
    selectedFees: string[];
  };
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
  nationality: string;
  occupationDuration: string;
  requesterIdFile: File | null;
  ownerIdFile: File | null;
  proofOfOwnershipFile: File | null;
  gpsCoordinates: Array<{ borne: string; lat: string; lng: string }>;
  parcelSides: Array<{ name: string; length: string }>;
  totalAmount: number;
  deducedTitleType: { label: string; description: string } | null;
}

const LandTitleReviewDialog: React.FC<LandTitleReviewDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onEdit,
  formData,
  constructionType,
  constructionNature,
  declaredUsage,
  nationality,
  occupationDuration,
  requesterIdFile,
  ownerIdFile,
  proofOfOwnershipFile,
  gpsCoordinates,
  parcelSides,
  totalAmount,
  deducedTitleType
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

  const formatRequesterType = (type: string) => {
    return type === 'owner' ? 'Propriétaire' : 'Mandataire';
  };

  const formatSectionType = (type: string) => {
    return type === 'urbaine' ? 'Section Urbaine (SU)' : type === 'rurale' ? 'Section Rurale (SR)' : '';
  };

  const formatNationality = (nat: string) => {
    return nat === 'congolais' ? 'Congolais(e)' : nat === 'etranger' ? 'Étranger(ère)' : '';
  };

  const formatOccupationDuration = (dur: string) => {
    switch (dur) {
      case 'perpetuel': return 'Perpétuel';
      case 'long_terme': return 'Long terme (25 ans)';
      case 'temporaire': return 'Temporaire (3 ans)';
      default: return '';
    }
  };

  // Check if GPS coordinates are filled
  const hasGPSCoordinates = gpsCoordinates.some(coord => coord.lat && coord.lng);
  
  // Check if parcel sides are filled
  const hasParcelSides = parcelSides.some(side => side.length);

  // Build review sections
  const sections: ReviewSection[] = [
    {
      id: 'requester',
      title: 'Informations du demandeur',
      icon: <User className="h-4 w-4" />,
      isComplete: !!(formData.requesterLastName && formData.requesterFirstName && formData.requesterPhone),
      items: [
        { label: 'Type de demandeur', value: formatRequesterType(formData.requesterType), isRequired: true },
        { label: 'Nom', value: formData.requesterLastName, isRequired: true },
        { label: 'Prénom', value: formData.requesterFirstName, isRequired: true },
        { label: 'Post-nom', value: formData.requesterMiddleName, isRequired: false },
        { label: 'Téléphone', value: formData.requesterPhone, isRequired: true },
        { label: 'Email', value: formData.requesterEmail, isRequired: false },
        ...(formData.requesterType === 'representative' ? [
          { label: 'Nom du propriétaire', value: formData.ownerLastName, isRequired: true },
          { label: 'Prénom du propriétaire', value: formData.ownerFirstName, isRequired: true },
          { label: 'Statut juridique', value: formData.ownerLegalStatus, isRequired: false },
        ] : [])
      ]
    },
    {
      id: 'location',
      title: 'Localisation de la parcelle',
      icon: <MapPin className="h-4 w-4" />,
      isComplete: !!(formData.sectionType && formData.province && (
        (formData.sectionType === 'urbaine' && formData.ville && formData.commune && formData.quartier) ||
        (formData.sectionType === 'rurale' && formData.territoire && formData.collectivite)
      )),
      items: [
        { label: 'Type de section', value: formatSectionType(formData.sectionType), isRequired: true },
        { label: 'Province', value: formData.province, isRequired: true },
        ...(formData.sectionType === 'urbaine' ? [
          { label: 'Ville', value: formData.ville, isRequired: true },
          { label: 'Commune', value: formData.commune, isRequired: true },
          { label: 'Quartier', value: formData.quartier, isRequired: true },
          { label: 'Avenue', value: formData.avenue, isRequired: false },
        ] : []),
        ...(formData.sectionType === 'rurale' ? [
          { label: 'Territoire', value: formData.territoire, isRequired: true },
          { label: 'Collectivité', value: formData.collectivite, isRequired: true },
          { label: 'Groupement', value: formData.groupement, isRequired: false },
          { label: 'Village', value: formData.village, isRequired: false },
        ] : []),
        { label: 'Superficie', value: formData.areaSqm ? `${formData.areaSqm} m²` : undefined, isRequired: false },
        { label: 'Coordonnées GPS', value: hasGPSCoordinates ? 'Renseignées' : undefined, isRequired: false },
        { label: 'Dimensions des côtés', value: hasParcelSides ? 'Renseignées' : undefined, isRequired: false },
      ]
    },
    {
      id: 'valorisation',
      title: 'Mise en valeur',
      icon: <Home className="h-4 w-4" />,
      isComplete: !!(constructionType && constructionNature && declaredUsage),
      items: [
        { label: 'Type de construction', value: constructionType, isRequired: true },
        { label: 'Nature de construction', value: constructionNature, isRequired: true },
        { label: 'Usage déclaré', value: declaredUsage, isRequired: true },
        { label: 'Nationalité', value: formatNationality(nationality), isRequired: false },
        { label: 'Durée d\'occupation', value: formatOccupationDuration(occupationDuration), isRequired: false },
        { label: 'Type de titre déduit', value: deducedTitleType?.label, isRequired: false },
      ]
    },
    {
      id: 'documents',
      title: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      isComplete: !!requesterIdFile,
      items: [
        { label: 'Pièce d\'identité du demandeur', value: requesterIdFile?.name, isRequired: true },
        ...(formData.requesterType === 'representative' ? [
          { label: 'Pièce d\'identité du propriétaire', value: ownerIdFile?.name, isRequired: false },
        ] : []),
        { label: 'Preuve de propriété', value: proofOfOwnershipFile?.name, isRequired: false },
      ]
    },
    {
      id: 'payment',
      title: 'Frais de dossier',
      icon: <CreditCard className="h-4 w-4" />,
      isComplete: true,
      items: [
        { label: 'Montant total', value: `$${totalAmount}`, isRequired: true },
        { label: 'Frais optionnels sélectionnés', value: formData.selectedFees.length > 0 ? `${formData.selectedFees.length} option(s)` : 'Aucun', isRequired: false },
      ]
    }
  ];

  const allComplete = sections.every(s => s.isComplete);
  const completedCount = sections.filter(s => s.isComplete).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] max-h-[85vh] overflow-hidden p-0 rounded-2xl z-[9999]">
        <div className="px-4 pt-8 pb-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-center text-primary">
              Récapitulatif de la demande
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              Vérifiez vos informations avant le paiement
            </p>
          </DialogHeader>
        </div>

        {/* Progress indicator */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center gap-2">
            <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${
              allComplete 
                ? 'bg-green-500/10 text-green-600' 
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {allComplete ? (
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Formulaire complet
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {completedCount}/{sections.length} sections complètes
                </span>
              )}
            </div>
          </div>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2.5 px-3 pb-28 overflow-y-auto max-h-[calc(90vh-220px)]"
        >
          {sections.map((section) => (
            <Card 
              key={section.id}
              className={`p-3 rounded-xl shadow-sm ${
                section.isComplete 
                  ? 'border-green-500/20 bg-green-500/5' 
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    section.isComplete ? 'bg-green-500/20' : 'bg-amber-500/20'
                  }`}>
                    <div className={section.isComplete ? 'text-green-600' : 'text-amber-600'}>
                      {section.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{section.title}</h3>
                      {section.isComplete ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs">
                          <span className="text-muted-foreground min-w-0 flex-shrink-0">
                            {item.label}:
                          </span>
                          {item.value ? (
                            <span className="font-medium text-foreground truncate">
                              {item.value}
                            </span>
                          ) : (
                            <span className={`italic ${item.isRequired ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {item.isRequired ? 'Requis' : 'Non renseigné'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(section.id);
                  }}
                  className="h-7 w-7 rounded-lg hover:bg-primary/10 flex-shrink-0"
                >
                  <Edit className="h-3.5 w-3.5 text-primary" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Warning if incomplete */}
          {!allComplete && (
            <Card className="p-3 rounded-xl border-destructive/30 bg-destructive/5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-destructive/20 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1 text-destructive">Formulaire incomplet</h3>
                  <p className="text-xs leading-relaxed text-foreground/80">
                    Certains champs obligatoires ne sont pas remplis. Veuillez compléter toutes les sections avant de procéder au paiement.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Confirmation notice */}
          {allComplete && (
            <Card className="p-3 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-primary/20 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm mb-1">Prêt pour le paiement</h3>
                  <p className="text-xs leading-relaxed text-foreground/80">
                    Votre formulaire est complet. Cliquez sur le bouton ci-dessous pour procéder au paiement de <strong className="text-primary">${totalAmount}</strong>.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Fixed footer */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-2 rounded-b-2xl">
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 text-sm font-semibold rounded-xl"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              Retour
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={!hasScrolledToBottom || !allComplete}
              className={`flex-1 h-10 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
                hasScrolledToBottom && allComplete
                  ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-muted cursor-not-allowed opacity-60'
              }`}
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Payer ${totalAmount}
            </Button>
          </div>
          
          {!hasScrolledToBottom && (
            <p className="text-xs text-center text-muted-foreground">
              Veuillez défiler vers le bas pour vérifier toutes les informations
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LandTitleReviewDialog;
