import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, FileText, MessageCircle, CheckCircle, ArrowRight, 
  AlertTriangle, Shield, Smartphone, Calendar, HelpCircle
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

export interface FormIntroConfig {
  title: string;
  subtitle?: string;
  estimatedTime: string;
  processingTime: string;
  requiredInfo: string[];
  userResponsibility: string;
  helpInfo: string[];
  buttonLabel: string;
  iconColor?: string;
}

interface FormIntroDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  config: FormIntroConfig;
}

const FormIntroDialog: React.FC<FormIntroDialogProps> = ({ 
  open, 
  onOpenChange, 
  onContinue,
  config 
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] max-h-[88vh] overflow-hidden p-0 rounded-2xl z-[1200]">
        <div className="px-4 pt-6 pb-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold text-center text-primary">
              {config.title}
            </DialogTitle>
            {config.subtitle && (
              <p className="text-xs text-muted-foreground text-center">
                {config.subtitle}
              </p>
            )}
          </DialogHeader>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          className="space-y-2 px-3 pb-28 overflow-y-auto max-h-[calc(88vh-160px)]"
        >
          {/* Temps estimé */}
          <Card className="p-2.5 rounded-xl border-primary/20 bg-primary/5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-primary/20 rounded-lg flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs mb-0.5">Durée estimée</h3>
                <p className="text-xs leading-relaxed text-foreground/80">
                  Ce formulaire prend environ <strong className="text-foreground">{config.estimatedTime}</strong> à compléter.
                </p>
              </div>
            </div>
          </Card>

          {/* Délai de traitement */}
          <Card className="p-2.5 rounded-xl border-blue-500/20 bg-blue-500/5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs mb-0.5">Délai de traitement</h3>
                <p className="text-xs leading-relaxed text-foreground/80">
                  Votre demande sera traitée dans un délai de <strong className="text-foreground">{config.processingTime}</strong>.
                </p>
              </div>
            </div>
          </Card>

          {/* Informations requises */}
          <Card className="p-2.5 rounded-xl border-accent/20 bg-accent/5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-accent/20 rounded-lg flex-shrink-0">
                <FileText className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs mb-1">Informations requises</h3>
                <div className="space-y-1 text-xs text-foreground/80">
                  {config.requiredInfo.map((info, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{info}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Responsabilité utilisateur */}
          <Card className="p-2.5 rounded-xl border-amber-500/20 bg-amber-500/5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-amber-500/20 rounded-lg flex-shrink-0">
                <Shield className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs mb-0.5">Votre responsabilité</h3>
                <p className="text-xs leading-relaxed text-foreground/80">
                  {config.userResponsibility}
                </p>
              </div>
            </div>
          </Card>

          {/* Assistance disponible */}
          <Card className="p-2.5 rounded-xl border-green-500/20 bg-green-500/5 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg flex-shrink-0">
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs mb-1">Aide disponible</h3>
                <div className="space-y-1 text-xs text-foreground/80">
                  {config.helpInfo.map((help, index) => (
                    <div key={index} className="flex items-start gap-1.5">
                      {index === config.helpInfo.length - 1 ? (
                        <FaWhatsapp className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <HelpCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{help}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bouton fixé en bas */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-background/80 backdrop-blur-sm border-t border-border/20 p-3 space-y-1.5 rounded-b-2xl">
          <Button 
            onClick={onContinue}
            disabled={!hasScrolledToBottom}
            className={`w-full h-9 text-sm font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              hasScrolledToBottom 
                ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-muted cursor-not-allowed opacity-60'
            }`}
          >
            <span className="mr-1.5">{config.buttonLabel}</span>
            <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hasScrolledToBottom ? 'group-hover:translate-x-1' : ''}`} />
          </Button>
          
          {!hasScrolledToBottom && (
            <p className="text-[10px] text-center text-muted-foreground">
              Défiler vers le bas ou patienter 2 secondes
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Configurations prédéfinies pour chaque type de formulaire
export const FORM_INTRO_CONFIGS: Record<string, FormIntroConfig> = {
  mutation: {
    title: 'Demande de mutation',
    subtitle: 'Transfert de propriété foncière',
    estimatedTime: '5-8 minutes',
    processingTime: '5-10 jours ouvrables',
    requiredInfo: [
      'Informations du bénéficiaire',
      'Type de mutation (vente, donation, etc.)',
      'Documents justificatifs',
      'Certificat d\'expertise immobilière'
    ],
    userResponsibility: 'Vous êtes responsable de l\'exactitude des informations fournies. Toute fausse déclaration peut entraîner le rejet de votre demande et des poursuites légales.',
    helpInfo: [
      'Bulles d\'aide sur chaque champ',
      'Aperçu avant soumission',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Commencer la demande'
  },
  mortgage_add: {
    title: 'Ajout d\'hypothèque',
    subtitle: 'Enregistrement d\'une garantie hypothécaire',
    estimatedTime: '3-5 minutes',
    processingTime: '3-7 jours ouvrables',
    requiredInfo: [
      'Montant de l\'hypothèque',
      'Informations du créancier',
      'Date du contrat',
      'Document de la convention'
    ],
    userResponsibility: 'Vous certifiez que les informations fournies sont exactes et que vous avez l\'autorisation du propriétaire pour enregistrer cette hypothèque.',
    helpInfo: [
      'Guide des champs obligatoires',
      'Vérification automatique',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Enregistrer l\'hypothèque'
  },
  mortgage_remove: {
    title: 'Radiation d\'hypothèque',
    subtitle: 'Demande de mainlevée hypothécaire',
    estimatedTime: '5-7 minutes',
    processingTime: '7-14 jours ouvrables',
    requiredInfo: [
      'Référence de l\'hypothèque',
      'Motif de la radiation',
      'Accord du créancier',
      'Documents de règlement'
    ],
    userResponsibility: 'Vous attestez que la dette a été intégralement réglée ou qu\'un accord a été conclu avec le créancier pour la mainlevée.',
    helpInfo: [
      'Liste des hypothèques actives',
      'Calcul automatique des frais',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Demander la radiation'
  },
  permit_add: {
    title: 'Ajout permis de construire',
    subtitle: 'Enregistrement d\'un permis existant',
    estimatedTime: '3-4 minutes',
    processingTime: '2-5 jours ouvrables',
    requiredInfo: [
      'Numéro du permis',
      'Date de délivrance',
      'Service émetteur',
      'Document du permis'
    ],
    userResponsibility: 'Vous certifiez détenir un permis de construire valide délivré par l\'autorité compétente.',
    helpInfo: [
      'Vérification du format',
      'Aperçu avant soumission',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Ajouter le permis'
  },
  permit_regularization: {
    title: 'Permis de régularisation',
    subtitle: 'Régularisation d\'une construction existante',
    estimatedTime: '4-6 minutes',
    processingTime: '10-20 jours ouvrables',
    requiredInfo: [
      'Numéro du permis',
      'Date de délivrance',
      'Service émetteur',
      'Justificatifs de régularisation'
    ],
    userResponsibility: 'Vous reconnaissez que la construction a été réalisée avant l\'obtention du permis et demandez sa régularisation administrative.',
    helpInfo: [
      'Guide de régularisation',
      'Calcul des pénalités',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Régulariser le permis'
  },
  tax: {
    title: 'Ajout taxe foncière',
    subtitle: 'Enregistrement d\'un paiement fiscal',
    estimatedTime: '2-3 minutes',
    processingTime: '1-3 jours ouvrables',
    requiredInfo: [
      'Année fiscale',
      'Montant payé',
      'Date de paiement',
      'Reçu de paiement'
    ],
    userResponsibility: 'Vous certifiez avoir effectué le paiement de la taxe foncière auprès de l\'administration fiscale compétente.',
    helpInfo: [
      'Calcul automatique',
      'Historique des paiements',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Enregistrer le paiement'
  },
  permit_request: {
    title: 'Demande de permis',
    subtitle: 'Nouvelle demande de permis de construire',
    estimatedTime: '8-12 minutes',
    processingTime: '15-30 jours ouvrables',
    requiredInfo: [
      'Type de construction',
      'Plans architecturaux',
      'Étude d\'impact',
      'Coordonnées du demandeur'
    ],
    userResponsibility: 'Vous vous engagez à respecter les normes de construction en vigueur et les conditions du permis une fois délivré.',
    helpInfo: [
      'Guide étape par étape',
      'Vérification des documents',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Soumettre la demande'
  },
  subdivision: {
    title: 'Demande de lotissement',
    subtitle: 'Division d\'une parcelle en plusieurs lots',
    estimatedTime: '15-25 minutes',
    processingTime: '30-60 jours ouvrables',
    requiredInfo: [
      'Dimensions de la parcelle mère',
      'Plan de lotissement',
      'Nombre et taille des lots',
      'Voies d\'accès internes'
    ],
    userResponsibility: 'Vous certifiez être le propriétaire légitime de la parcelle et respecter les règles d\'urbanisme pour le lotissement.',
    helpInfo: [
      'Assistant de création de lots',
      'Prévisualisation du plan',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Créer le lotissement'
  },
  expertise: {
    title: 'Expertise immobilière',
    subtitle: 'Évaluation professionnelle de votre bien',
    estimatedTime: '10-15 minutes',
    processingTime: '7-14 jours ouvrables',
    requiredInfo: [
      'Description du bien',
      'Matériaux de construction',
      'Équipements et commodités',
      'Photos de la construction'
    ],
    userResponsibility: 'Les informations fournies serviront de base à l\'expert pour organiser la visite terrain et définir la valeur de votre bien. Toute inexactitude peut fausser l\'évaluation.',
    helpInfo: [
      'Formulaire guidé par onglets',
      'Conseils sur chaque section',
      'Support WhatsApp 24h/24'
    ],
    buttonLabel: 'Demander l\'expertise'
  }
};

export default FormIntroDialog;
