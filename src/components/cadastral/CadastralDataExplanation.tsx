import React from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CadastralDataExplanationProps {
  field: string;
  value: string | number;
  children?: React.ReactNode;
}

const CadastralDataExplanation: React.FC<CadastralDataExplanationProps> = ({ 
  field, 
  value, 
  children 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const explanations: Record<string, string> = {
    // Informations générales
    'property_title_type': "Le type de titre de propriété indique la nature juridique du document qui confère les droits de propriété sur la parcelle. Un 'Certificat d'enregistrement' est un titre provisoire, tandis qu'un 'Titre foncier' est un titre définitif et inattaquable.",
    'area_sqm': "La superficie en mètres carrés représente la surface exacte de la parcelle telle que mesurée lors du bornage officiel. Cette mesure fait foi pour tous les actes juridiques et fiscaux.",
    'area_hectares': "La superficie en hectares est la conversion de la surface en unité plus grande (1 hectare = 10 000 m²). Elle est souvent utilisée pour les grandes propriétés rurales.",
    'current_owner_name': "Le nom du propriétaire actuel tel qu'inscrit dans les registres fonciers. Cette information est officielle et fait foi pour tous les actes juridiques.",
    'current_owner_legal_status': "Le statut juridique précise si le propriétaire est une 'Personne physique' (individu) ou une 'Personne morale' (société, association, etc.). Cela détermine les obligations fiscales et juridiques.",
    'current_owner_since': "La date depuis laquelle la personne ou entité est propriétaire de la parcelle. Cette date correspond à l'enregistrement de l'acte de cession ou d'attribution.",

    // Localisation
    'province': "La province est la division administrative de premier niveau où se situe la parcelle. Elle détermine la juridiction fiscale et administrative compétente.",
    'ville': "La ville est l'entité administrative urbaine de rattachement pour les parcelles en section urbaine (SU).",
    'territoire': "Le territoire est l'entité administrative de rattachement pour les parcelles en section rurale (SR).",
    'commune': "La commune est une subdivision administrative de la ville, utilisée pour l'organisation locale et la taxation.",
    'collectivite': "La collectivité est une subdivision administrative du territoire en milieu rural, équivalente à la commune en milieu urbain.",
    'quartier': "Le quartier est une subdivision de la commune en milieu urbain, utilisée pour l'adressage et l'organisation locale.",
    'groupement': "Le groupement est une subdivision de la collectivité en milieu rural, équivalente au quartier en milieu urbain.",
    'avenue': "L'avenue indique la voie de circulation principale la plus proche de la parcelle en milieu urbain.",
    'village': "Le village est l'entité de base en milieu rural où se situe la parcelle.",
    'parcel_type': "Le type de section détermine le régime juridique applicable : Section Urbaine (SU) pour les zones urbaines, Section Rurale (SR) pour les zones rurales.",

    // Bornage
    'pv_reference_number': "Le numéro de référence du Procès-Verbal de bornage est l'identifiant unique du document officiel établi par un géomètre expert lors de la délimitation de la parcelle.",
    'boundary_purpose': "L'objet du bornage précise la raison pour laquelle l'opération de délimitation a été effectuée (première immatriculation, vérification, résolution de conflit, etc.).",
    'surveyor_name': "Le nom du géomètre expert qui a effectué l'opération de bornage. Ce professionnel agréé est responsable de l'exactitude des mesures.",
    'survey_date': "La date du levé topographique correspond au moment où les mesures et la délimitation physique ont été effectuées sur le terrain.",

    // Historique de propriété
    'owner_name': "Le nom de l'ancien propriétaire tel qu'inscrit dans les registres fonciers au moment de la transaction.",
    'legal_status': "Le statut juridique de l'ancien propriétaire au moment où il possédait la parcelle.",
    'ownership_start_date': "La date de début de propriété correspond au moment où cette personne a acquis la parcelle.",
    'ownership_end_date': "La date de fin de propriété correspond au moment où cette personne a cédé ou perdu ses droits sur la parcelle.",
    'mutation_type': "Le type de mutation indique la nature juridique de la transmission de propriété (vente, donation, succession, expropriation, etc.).",

    // Taxes foncières
    'tax_year': "L'année fiscale pour laquelle la taxe foncière est due. Cette taxe annuelle est calculée sur la valeur locative cadastrale de la propriété.",
    'tax_amount': "Le montant de la taxe foncière en dollars américains, calculé selon les barèmes officiels en vigueur pour l'année concernée.",
    'payment_status': "Le statut de paiement indique si la taxe a été 'Payée', est 'En attente' ou 'En retard'. Un retard peut entraîner des pénalités et des poursuites.",
    'payment_date': "La date effective du paiement de la taxe foncière auprès de l'administration fiscale compétente.",

    // Hypothèques
    'mortgage_amount': "Le montant initial de l'hypothèque en dollars américains, représentant la somme garantie par la parcelle.",
    'creditor_name': "Le nom de l'établissement ou de la personne créancière qui détient l'hypothèque sur la parcelle.",
    'creditor_type': "Le type de créancier (Banque, Institution de microfinance, Particulier, etc.) qui influence les conditions de remboursement.",
    'duration_months': "La durée de l'hypothèque en mois, correspondant à la période pendant laquelle la garantie est maintenue.",
    'contract_date': "La date de signature du contrat d'hypothèque, qui marque le début des obligations pour les parties.",
    'mortgage_status': "Le statut de l'hypothèque : 'Active' (en cours), 'Éteinte' (remboursée), ou 'Défaillante' (en impayé).",
    'payment_amount': "Le montant d'un versement effectué pour le remboursement de l'hypothèque.",
    'payment_type': "Le type de paiement : 'partial' (acompte), 'full' (remboursement total), ou 'interest' (intérêts uniquement)."
  };

  const getExplanation = (field: string): string => {
    return explanations[field] || "Information cadastrale officielle extraite des registres fonciers.";
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center">
        {children}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-primary transition-colors duration-200 ml-1"
            >
              <Info className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="absolute right-0 top-full z-10 mt-1 w-80 max-w-[90vw]">
            <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs leading-relaxed">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-primary mb-1">Explication</p>
                  <p className="text-muted-foreground">
                    {getExplanation(field)}
                  </p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 text-xs text-muted-foreground hover:text-primary"
                >
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Fermer
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default CadastralDataExplanation;