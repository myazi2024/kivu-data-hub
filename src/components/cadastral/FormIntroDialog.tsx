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
    title: 'Demande de mutation de propriété',
    subtitle: 'Transfert légal de propriété foncière',
    estimatedTime: '1 à 3 minutes',
    processingTime: '5 à 10 jours ouvrables',
    requiredInfo: [
      'Identité complète du bénéficiaire (nom, prénom, adresse, téléphone)',
      'Nature de la mutation : vente, donation, succession, échange ou autre',
      'Justificatif de la transaction (acte de vente, attestation notariée, etc.)',
      'Certificat d\'expertise immobilière établissant la valeur vénale du bien'
    ],
    userResponsibility: 'En soumettant cette demande, vous certifiez sur l\'honneur que l\'ensemble des informations renseignées sont exactes, complètes et conformes à la réalité. Toute déclaration inexacte, incomplète ou frauduleuse expose le demandeur au rejet définitif de sa demande ainsi qu\'à d\'éventuelles poursuites judiciaires conformément à la législation foncière en vigueur.',
    helpInfo: [
      'Des bulles d\'information contextuelle vous guident à chaque étape du formulaire',
      'Un récapitulatif complet vous est présenté avant la soumission définitive',
      'Notre équipe d\'assistance est disponible 24h/24 via WhatsApp pour répondre à vos questions'
    ],
    buttonLabel: 'Démarrer ma demande'
  },
  mortgage_add: {
    title: 'Enregistrement d\'hypothèque',
    subtitle: 'Constitution d\'une garantie hypothécaire sur votre bien',
    estimatedTime: '1 à 3 minutes',
    processingTime: '3 à 7 jours ouvrables',
    requiredInfo: [
      'Montant exact de l\'hypothèque en dollars américains (USD)',
      'Identité complète du créancier (établissement financier ou personne physique)',
      'Date de signature du contrat de prêt ou de la convention hypothécaire',
      'Document officiel de la convention (contrat notarié, accord de prêt bancaire)'
    ],
    userResponsibility: 'En procédant à cet enregistrement, vous certifiez être le propriétaire légitime du bien concerné ou disposer d\'une procuration valide vous autorisant à constituer une hypothèque. Vous attestez également que les informations relatives au créancier et au montant de la garantie sont exactes et conformes aux documents contractuels.',
    helpInfo: [
      'Un guide détaillé vous accompagne pour chaque champ obligatoire',
      'Le système vérifie automatiquement la cohérence des informations saisies',
      'Un conseiller est disponible 24h/24 via WhatsApp en cas de difficulté'
    ],
    buttonLabel: 'Enregistrer l\'hypothèque'
  },
  mortgage_remove: {
    title: 'Radiation d\'hypothèque',
    subtitle: 'Demande officielle de mainlevée hypothécaire',
    estimatedTime: '1 à 3 minutes',
    processingTime: '7 à 14 jours ouvrables',
    requiredInfo: [
      'Référence exacte de l\'hypothèque à radier (numéro d\'inscription)',
      'Motif de la demande de radiation (remboursement intégral, accord amiable, décision judiciaire)',
      'Attestation écrite du créancier confirmant son accord pour la mainlevée',
      'Documents justifiant le règlement intégral de la dette ou l\'accord de désengagement'
    ],
    userResponsibility: 'Vous attestez sur l\'honneur que la dette garantie par cette hypothèque a été intégralement remboursée ou qu\'un accord formel a été conclu avec le créancier pour procéder à la mainlevée. Toute déclaration mensongère engage votre responsabilité civile et pénale.',
    helpInfo: [
      'La liste des hypothèques actives sur votre bien est disponible dans votre espace',
      'Le calcul des frais de radiation est effectué automatiquement selon le barème en vigueur',
      'Notre équipe d\'assistance reste joignable 24h/24 via WhatsApp'
    ],
    buttonLabel: 'Soumettre la demande de radiation'
  },
  permit_add: {
    title: 'Enregistrement d\'un permis de construire',
    subtitle: 'Ajout d\'un permis de construire existant à votre dossier parcellaire',
    estimatedTime: '1 à 3 minutes',
    processingTime: '2 à 5 jours ouvrables',
    requiredInfo: [
      'Numéro officiel du permis de construire tel qu\'indiqué sur le document',
      'Date exacte de délivrance du permis par l\'autorité compétente',
      'Nom du service émetteur (Mairie, Division de l\'Urbanisme, etc.)',
      'Scan ou photo lisible du document original du permis'
    ],
    userResponsibility: 'Vous certifiez être détenteur d\'un permis de construire authentique et valide, délivré par l\'autorité administrative compétente. L\'enregistrement de faux documents ou de permis falsifiés constitue un délit passible de sanctions pénales.',
    helpInfo: [
      'Le système vérifie automatiquement le format et la validité des informations saisies',
      'Vous pouvez prévisualiser votre saisie avant confirmation',
      'Une assistance technique est disponible 24h/24 via WhatsApp'
    ],
    buttonLabel: 'Enregistrer le permis'
  },
  permit_regularization: {
    title: 'Permis de régularisation',
    subtitle: 'Régularisation administrative d\'une construction existante',
    estimatedTime: '1 à 3 minutes',
    processingTime: '10 à 20 jours ouvrables',
    requiredInfo: [
      'Numéro du permis de régularisation obtenu auprès de l\'administration',
      'Date de délivrance du permis de régularisation',
      'Identification du service ayant procédé à la régularisation',
      'Documents justificatifs (procès-verbal de constatation, attestation de conformité)'
    ],
    userResponsibility: 'Vous reconnaissez que la construction concernée a été réalisée antérieurement à l\'obtention d\'un permis et sollicitez sa régularisation administrative. Vous vous engagez à vous conformer aux prescriptions éventuelles formulées par l\'administration dans le cadre de cette régularisation.',
    helpInfo: [
      'Un guide complet vous explique la procédure de régularisation étape par étape',
      'Le calcul des éventuelles pénalités est effectué selon le barème officiel',
      'Notre équipe d\'accompagnement est joignable 24h/24 via WhatsApp'
    ],
    buttonLabel: 'Soumettre la régularisation'
  },
  tax: {
    title: 'Enregistrement de taxe foncière',
    subtitle: 'Ajout d\'un paiement fiscal à votre historique parcellaire',
    estimatedTime: '1 à 3 minutes',
    processingTime: '1 à 3 jours ouvrables',
    requiredInfo: [
      'Année fiscale concernée par le paiement (exercice budgétaire)',
      'Montant exact versé en dollars américains (USD)',
      'Date précise du règlement auprès de l\'administration fiscale',
      'Scan ou photo du reçu de paiement délivré par le percepteur'
    ],
    userResponsibility: 'Vous certifiez avoir effectivement acquitté cette taxe foncière auprès de l\'administration fiscale compétente et que le reçu fourni est authentique. L\'enregistrement de faux justificatifs de paiement est susceptible de poursuites pour fraude fiscale.',
    helpInfo: [
      'Le montant théorique de votre taxe peut être calculé automatiquement selon la superficie',
      'L\'historique complet de vos paiements est consultable dans votre espace personnel',
      'Pour toute question, notre support WhatsApp est disponible 24h/24'
    ],
    buttonLabel: 'Enregistrer le paiement'
  },
  permit_request: {
    title: 'Demande de permis de construire',
    subtitle: 'Soumission d\'une nouvelle demande de permis de construire',
    estimatedTime: '1 à 3 minutes',
    processingTime: '15 à 30 jours ouvrables',
    requiredInfo: [
      'Nature et type de construction projetée (habitation, commerce, industrie)',
      'Plans architecturaux détaillés du projet (façades, coupes, implantation)',
      'Étude d\'impact environnemental le cas échéant',
      'Coordonnées complètes du demandeur et du maître d\'œuvre'
    ],
    userResponsibility: 'En déposant cette demande, vous vous engagez formellement à respecter l\'ensemble des normes de construction, d\'urbanisme et de sécurité en vigueur en République Démocratique du Congo. Le permis obtenu vous lie au respect strict des conditions et prescriptions qui y sont mentionnées.',
    helpInfo: [
      'Un assistant pas-à-pas vous guide tout au long de la procédure de demande',
      'Le système vérifie la complétude de votre dossier avant soumission',
      'Notre service d\'accompagnement est accessible 24h/24 via WhatsApp'
    ],
    buttonLabel: 'Déposer ma demande'
  },
  subdivision: {
    title: 'Demande de lotissement',
    subtitle: 'Division d\'une parcelle mère en plusieurs lots distincts',
    estimatedTime: '1 à 3 minutes',
    processingTime: '30 à 60 jours ouvrables',
    requiredInfo: [
      'Dimensions exactes et superficie de la parcelle mère à lotir',
      'Plan de lotissement détaillé avec numérotation des lots',
      'Caractéristiques de chaque lot (superficie, dimensions, usage prévu)',
      'Tracé des voies d\'accès internes et espaces communs'
    ],
    userResponsibility: 'Vous certifiez être le propriétaire légitime et exclusif de la parcelle concernée et disposer de tous les droits nécessaires pour procéder à son lotissement. Vous vous engagez à respecter les règles d\'urbanisme applicables en matière de lotissement, notamment concernant les surfaces minimales, les voiries et les équipements collectifs.',
    helpInfo: [
      'Un assistant interactif vous aide à configurer le découpage de vos lots',
      'Une prévisualisation graphique du plan de lotissement est générée en temps réel',
      'Notre équipe technique est disponible 24h/24 via WhatsApp pour vous accompagner'
    ],
    buttonLabel: 'Créer le lotissement'
  },
  expertise: {
    title: 'Demande d\'expertise immobilière',
    subtitle: 'Évaluation professionnelle de la valeur vénale de votre bien',
    estimatedTime: '1 à 3 minutes',
    processingTime: '7 à 14 jours ouvrables',
    requiredInfo: [
      'Description détaillée du bien : type de construction, année, superficie bâtie',
      'Caractéristiques des matériaux de construction (murs, toiture, revêtements)',
      'Inventaire des équipements et commodités (eau, électricité, sécurité, annexes)',
      'Photographies récentes de la construction (extérieur, intérieur, environnement)'
    ],
    userResponsibility: 'Les informations que vous fournissez constituent la base sur laquelle l\'expert immobilier définira les facteurs clés d\'évaluation et organisera la visite technique de votre bien. Toute information inexacte, incomplète ou trompeuse peut fausser significativement l\'estimation et engager votre responsabilité en cas de litige ultérieur.',
    helpInfo: [
      'Le formulaire est organisé en onglets thématiques pour une saisie structurée',
      'Des conseils et exemples vous sont proposés pour chaque section du formulaire',
      'Notre équipe d\'assistance est joignable 24h/24 via WhatsApp pour vous guider'
    ],
    buttonLabel: 'Démarrer ma demande d\'expertise'
  }
};

export default FormIntroDialog;
