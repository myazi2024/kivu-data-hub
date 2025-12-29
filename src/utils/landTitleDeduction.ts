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
 * 5. Durée d'occupation souhaitée
 * 6. Superficie du terrain
 */

export interface LandTitleDeductionInput {
  sectionType: 'urbaine' | 'rurale' | '';
  constructionType: string;
  constructionNature: string;
  declaredUsage: string;
  nationality: 'congolais' | 'etranger' | '';
  occupationDuration: 'perpetuel' | 'long_terme' | 'temporaire' | '';
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

// Constantes pour les superficies
const SURFACE_THRESHOLDS = {
  PETIT_TERRAIN: 500,      // < 500 m²
  MOYEN_TERRAIN: 2000,     // 500 - 2000 m²
  GRAND_TERRAIN: 10000,    // 2000 - 10000 m² (1 ha)
  TRES_GRAND: 100000       // > 10000 m² (> 1 ha) - généralement agricole/industriel
};

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
    occupationDuration,
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
  const isResidential = declaredUsage === 'Habitation' || declaredUsage === 'Résidentiel';
  const isCommercial = declaredUsage === 'Commercial' || declaredUsage === 'Affaires';
  const isAgricultural = declaredUsage === 'Agriculture' || declaredUsage === 'Élevage' || declaredUsage === 'Exploitation agricole';
  const isIndustrial = declaredUsage === 'Industriel' || declaredUsage === 'Manufacture';
  const isMixed = declaredUsage === 'Mixte';
  
  // Classification par superficie
  const isLargeArea = areaSqm && areaSqm > SURFACE_THRESHOLDS.GRAND_TERRAIN;

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 1: CONCESSION PERPÉTUELLE
  // Conditions: Nationalité congolaise + Mise en valeur complète (construction durable)
  // + Respect des conditions de la concession provisoire
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCongolais && hasDurableConstruction && !isNonBati) {
    if (isResidential || isCommercial || isMixed) {
      return {
        type: 'Concession perpétuelle',
        label: 'Concession perpétuelle',
        description: 'Droit de jouissance perpétuel sur le sol, accordé exclusivement aux Congolais ayant effectivement mis en valeur le terrain avec une construction en matériaux durables.',
        conditions: [
          'Nationalité congolaise obligatoire',
          'Mise en valeur effective et complète du terrain',
          'Construction en matériaux durables achevée',
          'Respect des délais de mise en valeur fixés',
          'Enregistrement auprès du Conservateur des Titres Immobiliers'
        ],
        nextSteps: [
          'Obtenir le procès-verbal de constat de mise en valeur',
          'Déposer la demande de conversion auprès du Conservateur',
          'Payer les frais d\'enregistrement et de conversion',
          'Recevoir le certificat d\'enregistrement de la concession perpétuelle'
        ],
        legalBasis: 'Art. 80 et suivants de la Loi n° 73-021 du 20 juillet 1973',
        confidence: 'high'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 2: BAIL EMPHYTÉOTIQUE (18-99 ans)
  // Cas 1: Étrangers avec construction durable
  // Cas 2: Terrains agricoles ou industriels de grande superficie
  // Cas 3: Projets commerciaux/industriels majeurs
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Cas 2a: Étranger avec construction durable - bail emphytéotique obligatoire
  if (isEtranger && hasDurableConstruction) {
    return {
      type: 'Bail emphytéotique',
      label: 'Bail emphytéotique (18-99 ans)',
      description: 'Bail de longue durée accordé aux personnes non congolaises. Confère des droits réels étendus incluant la possibilité de construire, planter et hypothéquer.',
      conditions: [
        'Statut de non-national (étranger ou personne morale étrangère)',
        'Projet de mise en valeur substantiel',
        'Durée minimale de 18 ans, maximale de 99 ans',
        'Paiement du canon emphytéotique annuel'
      ],
      nextSteps: [
        'Constituer le dossier de demande de bail emphytéotique',
        'Soumettre le plan de mise en valeur',
        'Négocier la durée et le canon avec l\'administration',
        'Signer le contrat de bail emphytéotique'
      ],
      legalBasis: 'Art. 110 et suivants de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'high'
    };
  }

  // Cas 2b: Terrain agricole de grande superficie
  if (isAgricultural && (isLargeArea || isRural)) {
    if (hasDurableConstruction || hasSemiDurableConstruction) {
      return {
        type: 'Bail emphytéotique',
        label: 'Bail emphytéotique agricole',
        description: 'Bail de longue durée pour l\'exploitation agricole. Permet l\'installation d\'infrastructures durables et la transformation progressive du terrain.',
        conditions: [
          'Usage agricole ou d\'élevage démontré',
          'Plan d\'exploitation agricole validé',
          'Superficie justifiant un bail de longue durée',
          'Engagement de mise en valeur agricole continue'
        ],
        nextSteps: [
          'Présenter le projet d\'exploitation agricole',
          'Obtenir l\'avis technique des services agricoles',
          'Négocier la durée du bail (18-99 ans)',
          'Procéder à l\'enregistrement'
        ],
        legalBasis: 'Art. 110-114 de la Loi n° 73-021 modifiée',
        confidence: 'high',
        conversionPossible: isCongolais ? {
          targetTitle: 'Concession perpétuelle',
          requirements: [
            'Mise en valeur agricole complète',
            'Construction d\'infrastructures durables',
            'Nationalité congolaise'
          ]
        } : undefined
      };
    }
  }

  // Cas 2c: Terrain industriel/commercial de grande envergure
  if (isIndustrial && hasDurableConstruction) {
    return {
      type: 'Bail emphytéotique',
      label: 'Bail emphytéotique industriel',
      description: 'Bail de longue durée pour projet industriel ou manufacture. Adapté aux investissements nécessitant une stabilité juridique sur plusieurs décennies.',
      conditions: [
        'Projet industriel ou commercial d\'envergure',
        'Plan d\'investissement validé',
        'Étude d\'impact environnemental (si requise)',
        'Capacité financière démontrée'
      ],
      nextSteps: [
        'Soumettre le business plan et les projections',
        'Obtenir les autorisations sectorielles',
        'Négocier les termes du bail emphytéotique',
        'Procéder à l\'enregistrement auprès du Conservateur'
      ],
      legalBasis: 'Art. 110-114 de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'high'
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 3: CONCESSION ORDINAIRE (25 ans renouvelables)
  // Pour terrains en cours de mise en valeur (construction semi-durable ou précaire)
  // Ou terrains non bâtis avec engagement de mise en valeur
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (hasSemiDurableConstruction || (isPrecaire && !isNonBati)) {
    const conversionInfo = isCongolais ? {
      targetTitle: 'Concession perpétuelle',
      requirements: [
        'Achèvement d\'une construction en matériaux durables',
        'Constat de mise en valeur par les services compétents',
        'Demande de conversion avant l\'expiration du délai'
      ]
    } : {
      targetTitle: 'Bail emphytéotique',
      requirements: [
        'Réalisation d\'investissements durables',
        'Demande de conversion en bail emphytéotique'
      ]
    };

    return {
      type: 'Concession ordinaire',
      label: 'Concession ordinaire (25 ans renouvelables)',
      description: 'Droit d\'usage temporaire accordé pour permettre la mise en valeur progressive du terrain. Convertible en titre plus stable après achèvement des travaux.',
      conditions: [
        'Engagement de mise en valeur dans un délai défini',
        'Paiement de la redevance annuelle',
        'Respect du plan de mise en valeur approuvé',
        'Construction semi-durable ou en cours'
      ],
      nextSteps: [
        'Déposer le plan de mise en valeur auprès du cadastre',
        'Obtenir l\'approbation du plan',
        'Commencer les travaux de mise en valeur',
        'Demander la conversion après achèvement'
      ],
      legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'medium',
      conversionPossible: conversionInfo
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 4: PERMIS D'OCCUPATION
  // Pour terrains non bâtis selon la zone (urbaine ou rurale)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isNonBati) {
    if (isUrban) {
      return {
        type: 'Permis d\'occupation urbain',
        label: 'Permis d\'occupation urbain',
        description: 'Autorisation administrative d\'occuper un terrain en zone urbaine. Constitue la première étape vers l\'obtention d\'un titre foncier définitif.',
        conditions: [
          'Terrain situé en zone urbaine lotie',
          'Pas de litige foncier en cours',
          'Conformité avec le plan d\'urbanisme',
          'Paiement des frais d\'attribution'
        ],
        nextSteps: [
          'Obtenir le permis d\'occupation auprès de la commune',
          'Respecter le délai de mise en valeur imposé',
          'Construire selon les normes urbanistiques',
          'Demander la concession après mise en valeur'
        ],
        legalBasis: 'Ordonnance n° 74-148 relative aux mesures d\'exécution de la loi foncière',
        confidence: 'high',
        conversionPossible: {
          targetTitle: isCongolais ? 'Concession perpétuelle' : 'Bail emphytéotique',
          requirements: [
            'Construction en matériaux durables',
            'Respect des délais de mise en valeur',
            'Enregistrement auprès du Conservateur'
          ]
        }
      };
    } else if (isRural) {
      return {
        type: 'Permis d\'occupation rural',
        label: 'Permis d\'occupation rural',
        description: 'Permet l\'occupation et l\'exploitation d\'une terre en zone rurale. Reconnaît les droits d\'usage tout en maintenant le domaine de l\'État.',
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
          'Évoluer vers un titre plus stable si nécessaire'
        ],
        legalBasis: 'Art. 387-389 de la Loi n° 73-021 et textes d\'application',
        confidence: 'high',
        conversionPossible: {
          targetTitle: 'Concession ordinaire puis perpétuelle (si congolais)',
          requirements: [
            'Mise en valeur agricole ou construction',
            'Bornage officiel du terrain',
            'Demande formelle de concession'
          ]
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 5: AUTORISATION D'OCCUPATION PROVISOIRE (AOP)
  // Pour construction précaire sans mise en valeur substantielle
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isPrecaire) {
    return {
      type: 'Autorisation d\'occupation provisoire',
      label: 'Autorisation d\'occupation provisoire (AOP)',
      description: 'Titre précaire accordé temporairement. Impose au titulaire d\'entreprendre la régularisation et la mise en valeur dans les délais fixés.',
      conditions: [
        'Occupation de fait d\'un terrain',
        'Construction précaire (matériaux non durables)',
        'Engagement de régularisation',
        'Paiement de la redevance provisoire'
      ],
      nextSteps: [
        'Régulariser la situation foncière',
        'Entreprendre la mise en valeur (construction semi-durable ou durable)',
        'Demander la conversion en concession ordinaire',
        'Évoluer vers un titre définitif'
      ],
      legalBasis: 'Pratique administrative découlant de la Loi foncière',
      confidence: 'medium',
      conversionPossible: {
        targetTitle: 'Concession ordinaire',
        requirements: [
          'Construction semi-durable ou durable',
          'Demande formelle de concession',
          'Paiement des arriérés de redevance'
        ]
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 6: ÉTRANGER SANS CONSTRUCTION DURABLE
  // Droit d'usage limité via certificat de location ou AOP
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isEtranger && !hasDurableConstruction) {
    if (occupationDuration === 'long_terme') {
      return {
        type: 'Bail emphytéotique',
        label: 'Bail emphytéotique (projet)',
        description: 'Bail de longue durée recommandé pour sécuriser votre investissement. Vous devrez présenter un plan de mise en valeur substantiel.',
        conditions: [
          'Projet de mise en valeur documenté',
          'Capacité financière démontrée',
          'Engagement de construction durable',
          'Paiement du canon emphytéotique'
        ],
        nextSteps: [
          'Préparer le plan d\'investissement détaillé',
          'Soumettre la demande de bail emphytéotique',
          'Négocier les termes avec l\'administration',
          'Procéder à l\'enregistrement après signature'
        ],
        legalBasis: 'Art. 110 et suivants de la Loi n° 73-021',
        confidence: 'medium'
      };
    } else {
      return {
        type: 'Certificat de location',
        label: 'Certificat de location',
        description: 'Document attestant d\'un contrat de location régulier. Adapté pour une occupation temporaire sans engagement de mise en valeur majeure.',
        conditions: [
          'Contrat de location avec le concessionnaire',
          'Durée déterminée de la location',
          'Enregistrement du contrat',
          'Paiement du loyer convenu'
        ],
        nextSteps: [
          'Négocier un contrat de location avec le propriétaire',
          'Faire enregistrer le contrat auprès des services compétents',
          'Obtenir le certificat de location',
          'Envisager un bail emphytéotique pour plus de stabilité'
        ],
        legalBasis: 'Code civil congolais et pratique administrative',
        confidence: 'medium'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK: CERTIFICAT D'ENREGISTREMENT
  // Quand les informations ne permettent pas une déduction précise
  // ═══════════════════════════════════════════════════════════════════════════
  
  return {
    type: 'Certificat d\'enregistrement',
    label: 'Certificat d\'enregistrement',
    description: 'Document administratif attestant l\'enregistrement de votre droit. Le type exact de titre sera déterminé après examen complet de votre dossier par les services cadastraux.',
    conditions: [
      'Dossier complet à soumettre',
      'Vérification de la situation foncière',
      'Examen par le Conservateur des Titres Immobiliers'
    ],
    nextSteps: [
      'Compléter les informations manquantes',
      'Soumettre le dossier aux services cadastraux',
      'Attendre l\'analyse et la recommandation officielle',
      'Recevoir le certificat d\'enregistrement approprié'
    ],
    legalBasis: 'Loi n° 73-021 du 20 juillet 1973',
    confidence: 'low'
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
 * Obtenir les options de durée d'occupation
 */
export const OCCUPATION_DURATION_OPTIONS = [
  { value: 'perpetuel', label: 'Perpétuel', description: 'Droit transmissible sans limite de durée' },
  { value: 'long_terme', label: 'Long terme (18-99 ans)', description: 'Bail emphytéotique ou concession longue durée' },
  { value: 'temporaire', label: 'Temporaire (≤25 ans)', description: 'Concession ordinaire ou location' }
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
  if (!input.occupationDuration) {
    recommendations.push('La durée souhaitée aide à choisir le titre approprié');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    recommendations
  };
}
