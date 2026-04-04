/**
 * Logique de déduction du type de titre foncier selon le droit foncier congolais
 * Basé sur la Loi n° 73-021 du 20 juillet 1973 portant régime général des biens,
 * régime foncier et immobilier et régime des sûretés
 * 
 * Cette matrice de décision prend en compte :
 * 1. Zone géographique (urbaine/rurale)
 * 2. Nature de la construction (état de mise en valeur)
 * 3. Usage déclaré de la parcelle
 * 4. Nationalité du demandeur
 * 5. Présence d'une autorisation de bâtir délivrée
 * 6. Superficie du terrain
 */

export interface LandTitleDeductionInput {
  sectionType: 'urbaine' | 'rurale' | '';
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
  nationality: 'congolais' | 'etranger' | '';
  hasBuildingPermit: boolean;
  areaSqm?: number;
}

export interface DeducedLandTitle {
  type: string;
  label: string;
  description: string;
  conditions: string[];
  nextSteps: string[];
  legalBasis: string;
  confidence: 'high' | 'medium' | 'low';
  conversionPossible?: {
    targetTitle: string;
    requirements: string[];
  };
}

/**
 * Fonction principale de déduction du type de titre foncier
 * Implémente la logique du droit foncier congolais
 */
export function deduceLandTitleType(input: LandTitleDeductionInput): DeducedLandTitle | null {
  const {
    sectionType,
    constructionType,
    constructionNature,
    declaredUsage,
    nationality,
    hasBuildingPermit,
    areaSqm
  } = input;

  // Validation des données minimales requises
  if (!constructionType || !constructionNature || !declaredUsage) {
    return null;
  }

  const isUrban = sectionType === 'urbaine';
  const isRural = sectionType === 'rurale';
  const isCongolais = nationality === 'congolais';
  const isEtranger = nationality === 'etranger';
  
  // États de mise en valeur
  const hasDurableConstruction = constructionNature === 'Durable';
  const hasSemiDurableConstruction = constructionNature === 'Semi-durable';
  const isPrecaire = constructionNature === 'Précaire';
  const isNonBati = constructionNature === 'Non bâti' || constructionType === 'Terrain nu';
  
  // Types d'usage
  const isResidential = declaredUsage === 'Habitation' || declaredUsage === 'Résidentiel' || declaredUsage === 'Location';
  const isCommercial = declaredUsage === 'Commerce' || declaredUsage === 'Commercial' || declaredUsage === 'Affaires' || declaredUsage === 'Bureau' || declaredUsage === 'Entrepôt';
  const isAgricultural = declaredUsage === 'Agriculture' || declaredUsage === 'Agricole' || declaredUsage === 'Élevage' || declaredUsage === 'Exploitation agricole';
  const isIndustrial = declaredUsage === 'Industrie' || declaredUsage === 'Industriel' || declaredUsage === 'Manufacture';
  const isMixed = declaredUsage === 'Usage mixte' || declaredUsage === 'Mixte';

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 1: CERTIFICAT D'ENREGISTREMENT (CONCESSION PERPÉTUELLE)
  // Congolais + Construction durable + Autorisation de bâtir délivrée
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isCongolais && hasDurableConstruction && !isNonBati && hasBuildingPermit) {
    if (isResidential || isCommercial || isMixed || isIndustrial || isAgricultural) {
      return {
        type: 'Certificat d\'enregistrement',
        label: 'Certificat d\'enregistrement (Concession perpétuelle)',
        description: 'Seul titre foncier DÉFINITIF en RDC. Droit de propriété PERPÉTUEL et INATTAQUABLE, transmissible, cessible et hypothécable. La mise en valeur est prouvée par l\'autorisation de bâtir délivrée.',
        conditions: [
          'Nationalité congolaise OBLIGATOIRE',
          'Mise en valeur COMPLÈTE et effective du terrain',
          'Construction en matériaux durables ACHEVÉE',
          'Autorisation de bâtir délivrée et valide',
          'Enregistrement auprès du Conservateur des Titres Immobiliers'
        ],
        nextSteps: [
          'Obtenir le procès-verbal de constat de mise en valeur',
          'Déposer la demande d\'enregistrement avec l\'autorisation de bâtir',
          'Payer les frais d\'enregistrement définitif',
          'Recevoir le certificat d\'enregistrement - Titre perpétuel'
        ],
        legalBasis: 'Art. 80 et suivants de la Loi n° 73-021 du 20 juillet 1973',
        confidence: 'high'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 2: CONGOLAIS + CONSTRUCTION DURABLE + PAS D'AUTORISATION
  // Concession ordinaire avec chemin vers certificat
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isCongolais && hasDurableConstruction && !isNonBati && !hasBuildingPermit) {
    return {
      type: 'Concession ordinaire',
      label: 'Concession ordinaire (25 ans renouvelables)',
      description: 'Droit de jouissance temporaire. La construction durable est présente mais l\'absence d\'autorisation de bâtir ne permet pas d\'accéder directement au Certificat d\'enregistrement. L\'obtention d\'une autorisation de bâtir permettrait d\'évoluer vers le titre perpétuel.',
      conditions: [
        'Durée fixée par l\'État (généralement 25 ans)',
        'Paiement de la redevance annuelle obligatoire',
        'Mise en valeur effective du terrain',
        'Obtention d\'une autorisation de bâtir recommandée'
      ],
      nextSteps: [
        'Demander une autorisation de bâtir pour régulariser la construction',
        'Obtenir l\'acte de concession ordinaire',
        'Respecter le délai de mise en valeur',
        'Demander la conversion en certificat d\'enregistrement après obtention de l\'autorisation'
      ],
      legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'medium',
      conversionPossible: {
        targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
        requirements: [
          'Obtenir une autorisation de bâtir délivrée',
          'Procès-verbal de constat de mise en valeur',
          'Demander la conversion AVANT expiration des 25 ans',
          'Paiement des frais de conversion'
        ]
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 3: BAIL EMPHYTÉOTIQUE (18-99 ans)
  // Étranger avec construction durable
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isEtranger && hasDurableConstruction && !isNonBati) {
    const hasPermit = hasBuildingPermit;
    return {
      type: 'Bail emphytéotique',
      label: 'Bail emphytéotique (18-99 ans)',
      description: `Bail de longue durée pour les non-nationaux. Confère des droits réels étendus (construire, planter, hypothéquer) mais LIMITÉS DANS LE TEMPS.${hasPermit ? ' La mise en valeur est attestée par l\'autorisation de bâtir.' : ''} Ce n'est pas un titre de propriété définitif.`,
      conditions: [
        'Statut de non-national (étranger ou personne morale étrangère)',
        'Projet de mise en valeur substantiel',
        'Durée minimale de 18 ans, maximale de 99 ans',
        'Paiement du canon emphytéotique annuel',
        '⚠️ Pas de conversion possible en titre perpétuel pour les étrangers'
      ],
      nextSteps: [
        'Constituer le dossier de demande de bail emphytéotique',
        'Soumettre le plan de mise en valeur détaillé',
        'Négocier la durée et le canon avec l\'administration',
        'Signer le contrat de bail emphytéotique',
        'Prévoir le renouvellement avant expiration'
      ],
      legalBasis: 'Art. 110 et suivants de la Loi n° 73-021 du 20 juillet 1973',
      confidence: hasPermit ? 'high' : 'medium'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 4: CONCESSION ORDINAIRE (25 ans renouvelables)
  // Semi-durable ou précaire avec construction
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (hasSemiDurableConstruction || (isPrecaire && !isNonBati)) {
    const conversionInfo = isCongolais ? {
      targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
      requirements: [
        'Achèvement d\'une construction en matériaux durables',
        'Obtention d\'une autorisation de bâtir',
        'Constat de mise en valeur par les services compétents',
        'Demande de conversion AVANT l\'expiration des 25 ans'
      ]
    } : isEtranger ? {
      targetTitle: 'Bail emphytéotique',
      requirements: [
        'Réalisation d\'investissements durables',
        'Obtention d\'une autorisation de bâtir',
        'Demande de conversion en bail emphytéotique'
      ]
    } : undefined;

    return {
      type: 'Concession ordinaire',
      label: 'Concession ordinaire (25 ans renouvelables)',
      description: 'Droit d\'usage TEMPORAIRE accordé pour permettre la mise en valeur progressive. ⚠️ Ce n\'est PAS un titre de propriété définitif. L\'État peut retirer la concession si le terrain n\'est pas valorisé.',
      conditions: [
        'Engagement de mise en valeur dans un délai défini',
        'Paiement de la redevance annuelle obligatoire',
        'Respect du plan de mise en valeur approuvé',
        'Risque de retrait si non valorisé dans les délais'
      ],
      nextSteps: [
        'Déposer le plan de mise en valeur auprès du cadastre',
        'Évoluer vers une construction en matériaux durables',
        'Demander une autorisation de bâtir',
        'Demander la conversion AVANT expiration des 25 ans'
      ],
      legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'medium',
      conversionPossible: conversionInfo
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 5: PERMIS D'OCCUPATION
  // Pour terrains non bâtis
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isNonBati) {
    if (isUrban) {
      return {
        type: 'Permis d\'occupation urbain',
        label: 'Permis d\'occupation urbain',
        description: 'Autorisation administrative d\'occuper un terrain en zone urbaine. Titre PRÉCAIRE - première étape vers un titre plus stable. Impose une mise en valeur dans les délais fixés.',
        conditions: [
          'Terrain situé en zone urbaine lotie',
          'Pas de litige foncier en cours',
          'Conformité avec le plan d\'urbanisme',
          'Paiement des frais d\'attribution',
          'Délai de mise en valeur imposé'
        ],
        nextSteps: [
          'Obtenir le permis d\'occupation auprès de la commune',
          'Respecter le délai de mise en valeur imposé',
          'Construire selon les normes urbanistiques',
          'Obtenir une autorisation de bâtir',
          'Demander la concession après mise en valeur'
        ],
        legalBasis: 'Ordonnance n° 74-148 relative aux mesures d\'exécution de la loi foncière',
        confidence: 'high',
        conversionPossible: {
          targetTitle: isCongolais ? 'Certificat d\'enregistrement (via concession)' : 'Bail emphytéotique',
          requirements: [
            'Construction en matériaux durables',
            'Obtention d\'une autorisation de bâtir',
            'Passage par la concession ordinaire',
            'Enregistrement auprès du Conservateur'
          ]
        }
      };
    } else if (isRural) {
      return {
        type: 'Permis d\'occupation rural',
        label: 'Permis d\'occupation rural',
        description: 'Permet l\'occupation et l\'exploitation d\'une terre en zone rurale. Titre PRÉCAIRE reconnaissant les droits d\'usage tout en maintenant le domaine de l\'État.',
        conditions: [
          'Terrain en zone rurale',
          'Accord des autorités coutumières locales',
          'Projet d\'exploitation agricole ou d\'habitation',
          'Pas de conflit avec les droits coutumiers existants'
        ],
        nextSteps: [
          'Obtenir l\'attestation des autorités coutumières',
          'Demander le permis auprès de l\'administration territoriale',
          'Mettre en valeur le terrain (agriculture ou construction)',
          'Évoluer vers une concession ordinaire',
          'Puis vers un titre perpétuel (si Congolais)'
        ],
        legalBasis: 'Art. 387-389 de la Loi n° 73-021 et textes d\'application',
        confidence: 'high',
        conversionPossible: {
          targetTitle: 'Concession ordinaire puis perpétuelle (si Congolais)',
          requirements: [
            'Mise en valeur agricole ou construction',
            'Obtention d\'une autorisation de bâtir',
            'Bornage officiel du terrain',
            'Demande formelle de concession'
          ]
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 6: ÉTRANGER SANS CONSTRUCTION DURABLE
  // Bail foncier
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isEtranger && !hasDurableConstruction) {
    return {
      type: 'Bail foncier',
      label: 'Bail foncier (9-25 ans)',
      description: 'Contrat de location du domaine privé de l\'État ou d\'un particulier. Ce n\'est PAS un droit réel de propriété mais un droit personnel de jouissance.',
      conditions: [
        'Contrat de location avec l\'État ou le propriétaire',
        'Durée déterminée de la location (9-25 ans)',
        'Enregistrement du contrat obligatoire',
        'Paiement du loyer foncier convenu'
      ],
      nextSteps: [
        'Négocier un contrat de bail foncier',
        'Faire enregistrer le contrat auprès des services compétents',
        'Investir dans une construction durable pour accéder au bail emphytéotique',
        'Obtenir une autorisation de bâtir pour sécuriser l\'investissement'
      ],
      legalBasis: 'Code civil congolais et Loi foncière n° 73-021',
      confidence: 'high'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 7: AUTORISATION D'OCCUPATION PROVISOIRE (AOP)
  // Pour construction précaire
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isPrecaire) {
    return {
      type: 'Autorisation d\'occupation provisoire',
      label: 'Autorisation d\'occupation provisoire (AOP)',
      description: 'Titre TRÈS PRÉCAIRE accordé temporairement. ⚠️ Impose au titulaire d\'entreprendre la régularisation et la mise en valeur dans les délais fixés sous peine de retrait.',
      conditions: [
        'Occupation de fait d\'un terrain',
        'Construction précaire (matériaux non durables)',
        'Engagement de régularisation obligatoire',
        'Paiement de la redevance provisoire',
        'Risque de retrait imminent si non régularisé'
      ],
      nextSteps: [
        'Régulariser la situation foncière en urgence',
        'Entreprendre la mise en valeur (construction semi-durable ou durable)',
        'Demander une autorisation de bâtir',
        'Demander la conversion en concession ordinaire'
      ],
      legalBasis: 'Pratique administrative découlant de la Loi foncière',
      confidence: 'medium',
      conversionPossible: {
        targetTitle: 'Concession ordinaire',
        requirements: [
          'Construction semi-durable ou durable',
          'Obtention d\'une autorisation de bâtir',
          'Demande formelle de concession',
          'Paiement des arriérés de redevance'
        ]
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK: CONCESSION ORDINAIRE
  // Quand les informations ne permettent pas une déduction précise
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    type: 'Concession ordinaire',
    label: 'Concession ordinaire (à préciser)',
    description: 'En l\'absence d\'informations complètes, la concession ordinaire est recommandée comme point de départ. Elle permet de sécuriser vos droits tout en préparant l\'évolution vers un titre plus stable.',
    conditions: [
      'Dossier complet à soumettre',
      'Vérification de la situation foncière',
      'Plan de mise en valeur à établir',
      'Examen par les services cadastraux'
    ],
    nextSteps: [
      'Compléter les informations manquantes ci-dessus',
      'Soumettre le dossier aux services cadastraux',
      'Obtenir les recommandations officielles',
      'Évoluer vers le titre approprié selon votre situation'
    ],
    legalBasis: 'Loi n° 73-021 du 20 juillet 1973',
    confidence: 'low',
    conversionPossible: isCongolais ? {
      targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
      requirements: [
        'Mise en valeur complète',
        'Construction durable achevée',
        'Autorisation de bâtir délivrée',
        'Enregistrement auprès du Conservateur'
      ]
    } : undefined
  };
}

/**
 * Obtenir les options de nationalité
 */
export const NATIONALITY_OPTIONS = [
  { value: 'congolais', label: 'Congolais(e)', description: 'Nationalité de la RDC' },
  { value: 'etranger', label: 'Étranger(ère)', description: 'Autre nationalité' }
];

/**
 * Valider si les données sont suffisantes pour une déduction fiable
 */
export function validateDeductionInput(input: Partial<LandTitleDeductionInput>): {
  isValid: boolean;
  missingFields: string[];
  recommendations: string[];
} {
  const missingFields: string[] = [];
  const recommendations: string[] = [];

  if (!input.constructionType) missingFields.push('Type de construction');
  if (!input.constructionNature) missingFields.push('Nature de la construction');
  if (!input.declaredUsage) missingFields.push('Usage déclaré');
  
  if (!input.sectionType) {
    recommendations.push('Préciser la zone (urbaine/rurale) améliorerait la précision');
  }
  if (!input.nationality) {
    recommendations.push('La nationalité détermine les types de titres accessibles');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    recommendations
  };
}
