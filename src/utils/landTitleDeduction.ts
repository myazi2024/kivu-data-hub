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
  
  // Durée d'occupation
  const wantsPerpetuel = occupationDuration === 'perpetuel';
  const wantsLongTerme = occupationDuration === 'long_terme';
  const wantsTemporaire = occupationDuration === 'temporaire';
  
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
  // RÈGLE FONDAMENTALE: DURÉE TEMPORAIRE (≤25 ANS)
  // ⚠️ En RDC, les titres de 25 ans ou moins NE SONT PAS des titres définitifs
  // Ce sont des concessions temporaires ou des baux fonciers
  // ═══════════════════════════════════════════════════════════════════════════

  if (wantsTemporaire) {
    // ⚠️ RÈGLE STRICTE: Pour une durée ≤25 ans, JAMAIS de certificat d'enregistrement
    // Peu importe la nationalité ou l'état de mise en valeur!
    // Options: Concession ordinaire, Bail foncier, ou Bail emphytéotique court
    
    // Cas 1: Étranger avec durée temporaire
    if (isEtranger) {
      if (hasDurableConstruction || hasSemiDurableConstruction) {
        return {
          type: 'Bail emphytéotique',
          label: 'Bail emphytéotique court (20-25 ans)',
          description: 'Bail de durée limitée pour les non-nationaux. Ce n\'est PAS un titre de propriété définitif mais un droit réel limité dans le temps, renouvelable sous conditions.',
          conditions: [
            'Durée fixée entre 20 et 25 ans',
            'Paiement du canon emphytéotique annuel',
            'Respect du plan de mise en valeur',
            'Possibilité de renouvellement après expiration'
          ],
          nextSteps: [
            'Déposer la demande de bail emphytéotique',
            'Négocier la durée (20-25 ans) et le canon',
            'Signer le contrat de bail emphytéotique',
            'Prévoir le renouvellement avant expiration'
          ],
          legalBasis: 'Art. 110-114 de la Loi n° 73-021 du 20 juillet 1973',
          confidence: 'high'
        };
      } else {
        return {
          type: 'Bail foncier',
          label: 'Bail foncier (9-25 ans)',
          description: 'Contrat de location du domaine privé de l\'État. Ce n\'est PAS un droit réel de propriété mais un droit personnel de jouissance, renouvelable par avenant.',
          conditions: [
            'Durée variable de 9 à 25 ans',
            'Contrat de location avec l\'État ou le propriétaire',
            'Paiement du loyer foncier convenu',
            'Respect des conditions d\'utilisation'
          ],
          nextSteps: [
            'Négocier le contrat de bail foncier',
            'Faire enregistrer le contrat',
            'Respecter les obligations du bail',
            'Prévoir le renouvellement avant expiration'
          ],
          legalBasis: 'Code civil congolais et Loi foncière n° 73-021',
          confidence: 'high'
        };
      }
    }
    
    // Cas 2: Congolais avec durée temporaire
    if (isCongolais) {
      if (hasDurableConstruction) {
        // Même avec construction durable, si durée temporaire demandée
        return {
          type: 'Concession ordinaire',
          label: 'Concession ordinaire (25 ans renouvelables)',
          description: 'Droit de jouissance temporaire sur le domaine privé de l\'État. ⚠️ Ce n\'est PAS un titre de propriété définitif. L\'État peut retirer la concession si le terrain n\'est pas valorisé.',
          conditions: [
            'Durée fixée par l\'État (généralement 25 ans)',
            'Paiement de la redevance annuelle obligatoire',
            'Mise en valeur effective du terrain',
            'Risque de retrait si obligations non respectées'
          ],
          nextSteps: [
            'Obtenir l\'acte de concession ordinaire',
            'Respecter le délai de mise en valeur',
            'Payer les redevances annuelles',
            'Demander le renouvellement avant expiration'
          ],
          legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
          confidence: 'high',
          conversionPossible: {
            targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
            requirements: [
              'Demander la conversion AVANT expiration des 25 ans',
              'Construction en matériaux durables achevée',
              'Procès-verbal de constat de mise en valeur',
              'Paiement des frais de conversion'
            ]
          }
        };
      } else if (hasSemiDurableConstruction || isPrecaire) {
        return {
          type: 'Concession ordinaire',
          label: 'Concession ordinaire (25 ans renouvelables)',
          description: 'Droit d\'usage temporaire permettant la mise en valeur progressive. ⚠️ Ce n\'est PAS un titre définitif. Doit être converti avant expiration pour sécuriser vos droits.',
          conditions: [
            'Engagement de mise en valeur dans le délai imparti',
            'Paiement de la redevance annuelle',
            'Construction au minimum semi-durable requise',
            'Risque de perte si non valorisé'
          ],
          nextSteps: [
            'Obtenir l\'acte de concession ordinaire',
            'Entreprendre la mise en valeur rapidement',
            'Évoluer vers une construction durable',
            'Demander la conversion en titre perpétuel'
          ],
          legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
          confidence: 'medium',
          conversionPossible: {
            targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
            requirements: [
              'Achèvement d\'une construction durable',
              'Constat de mise en valeur officiel',
              'Demande de conversion avant l\'expiration'
            ]
          }
        };
      } else if (isNonBati) {
        // Terrain non bâti avec durée temporaire
        if (isUrban) {
          return {
            type: 'Permis d\'occupation urbain',
            label: 'Permis d\'occupation urbain (temporaire)',
            description: 'Autorisation administrative d\'occuper un terrain en zone urbaine. Titre PRÉCAIRE imposant une mise en valeur dans les délais fixés.',
            conditions: [
              'Terrain en zone urbaine lotie',
              'Conformité au plan d\'urbanisme',
              'Délai de mise en valeur imposé',
              'Risque de retrait si non valorisé'
            ],
            nextSteps: [
              'Obtenir le permis d\'occupation',
              'Construire dans le délai imparti',
              'Évoluer vers une concession ordinaire',
              'Puis vers un titre perpétuel'
            ],
            legalBasis: 'Ordonnance n° 74-148 d\'exécution de la loi foncière',
            confidence: 'high',
            conversionPossible: {
              targetTitle: 'Concession ordinaire puis perpétuelle',
              requirements: [
                'Construction en matériaux durables',
                'Respect des délais de mise en valeur',
                'Nationalité congolaise pour le perpétuel'
              ]
            }
          };
        } else {
          return {
            type: 'Permis d\'occupation rural',
            label: 'Permis d\'occupation rural (temporaire)',
            description: 'Permet l\'occupation d\'une terre rurale. Titre PRÉCAIRE nécessitant la mise en valeur pour évoluer vers un titre plus stable.',
            conditions: [
              'Terrain en zone rurale',
              'Accord des autorités coutumières',
              'Projet d\'exploitation ou d\'habitation',
              'Mise en valeur dans les délais'
            ],
            nextSteps: [
              'Obtenir l\'attestation coutumière',
              'Demander le permis d\'occupation',
              'Mettre en valeur le terrain',
              'Évoluer vers une concession'
            ],
            legalBasis: 'Art. 387-389 de la Loi n° 73-021',
            confidence: 'high',
            conversionPossible: {
              targetTitle: 'Concession ordinaire',
              requirements: [
                'Mise en valeur effective',
                'Bornage officiel',
                'Demande formelle de concession'
              ]
            }
          };
        }
      }
    }
    
    // Cas 3: Nationalité non spécifiée avec durée temporaire
    // On retourne quand même une concession ordinaire par défaut
    if (!nationality) {
      return {
        type: 'Concession ordinaire',
        label: 'Concession ordinaire (25 ans renouvelables)',
        description: 'Droit de jouissance temporaire sur le domaine privé de l\'État. ⚠️ Ce n\'est PAS un titre de propriété définitif. La durée demandée (≤25 ans) ne permet pas d\'obtenir un certificat d\'enregistrement.',
        conditions: [
          'Durée fixée par l\'État (généralement 25 ans maximum)',
          'Précisez votre nationalité pour affiner la recommandation',
          'Mise en valeur requise pour le maintien du titre',
          'Titre NON définitif - peut être retiré'
        ],
        nextSteps: [
          'Préciser votre nationalité pour une recommandation adaptée',
          'Obtenir l\'acte de concession ordinaire',
          'Respecter les obligations de mise en valeur'
        ],
        legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
        confidence: 'medium',
        conversionPossible: {
          targetTitle: 'Certificat d\'enregistrement (si nationalité congolaise)',
          requirements: [
            'Nationalité congolaise obligatoire',
            'Construction en matériaux durables',
            'Mise en valeur complète',
            'Demande avant expiration des 25 ans'
          ]
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 1: CERTIFICAT D'ENREGISTREMENT (CONCESSION PERPÉTUELLE)
  // Seul titre foncier DÉFINITIF en RDC - Perpétuel et inattaquable
  // ⚠️ STRICTEMENT: Congolais + Mise en valeur complète + Durée PERPÉTUELLE EXPLICITE
  // ═══════════════════════════════════════════════════════════════════════════
  
  // CORRECTION: Le certificat d'enregistrement n'est suggéré QUE si wantsPerpetuel est EXPLICITEMENT true
  // PAS si occupationDuration est vide - cela doit être une demande explicite de titre perpétuel
  if (isCongolais && hasDurableConstruction && !isNonBati && wantsPerpetuel) {
    if (isResidential || isCommercial || isMixed || isIndustrial) {
      return {
        type: 'Certificat d\'enregistrement',
        label: 'Certificat d\'enregistrement (Concession perpétuelle)',
        description: 'Seul titre foncier DÉFINITIF en RDC. Droit de propriété PERPÉTUEL et INATTAQUABLE, transmissible, cessible et hypothécable. Accordé exclusivement aux Congolais ayant mis en valeur le terrain.',
        conditions: [
          'Nationalité congolaise OBLIGATOIRE',
          'Mise en valeur COMPLÈTE et effective du terrain',
          'Construction en matériaux durables ACHEVÉE',
          'Respect des délais de mise en valeur initiaux',
          'Enregistrement auprès du Conservateur des Titres Immobiliers'
        ],
        nextSteps: [
          'Obtenir le procès-verbal de constat de mise en valeur',
          'Déposer la demande de conversion/enregistrement',
          'Payer les frais d\'enregistrement définitif',
          'Recevoir le certificat d\'enregistrement - Titre perpétuel'
        ],
        legalBasis: 'Art. 80 et suivants de la Loi n° 73-021 du 20 juillet 1973',
        confidence: 'high'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 2: BAIL EMPHYTÉOTIQUE (18-99 ans)
  // Droit réel limité dans le temps - Pour étrangers ou projets majeurs
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Cas 2a: Étranger avec construction durable - bail emphytéotique obligatoire
  if (isEtranger && hasDurableConstruction) {
    const duration = wantsLongTerme ? '18-99 ans' : wantsPerpetuel ? 'maximum 99 ans' : '18-99 ans';
    return {
      type: 'Bail emphytéotique',
      label: `Bail emphytéotique (${duration})`,
      description: 'Bail de longue durée pour les non-nationaux. Confère des droits réels étendus (construire, planter, hypothéquer) mais LIMITÉS DANS LE TEMPS. Ce n\'est pas un titre de propriété définitif.',
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
      confidence: 'high'
    };
  }

  // Cas 2b: Terrain agricole de grande superficie (long terme)
  if (isAgricultural && (isLargeArea || isRural) && wantsLongTerme) {
    if (hasDurableConstruction || hasSemiDurableConstruction) {
      return {
        type: 'Bail emphytéotique',
        label: 'Bail emphytéotique agricole (18-99 ans)',
        description: 'Bail de longue durée pour l\'exploitation agricole. Permet l\'installation d\'infrastructures durables. Droit réel LIMITÉ dans le temps.',
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
          targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
          requirements: [
            'Mise en valeur agricole complète',
            'Construction d\'infrastructures durables',
            'Nationalité congolaise obligatoire',
            'Demande de conversion avant expiration'
          ]
        } : undefined
      };
    }
  }

  // Cas 2c: Terrain industriel/commercial de grande envergure (long terme)
  if (isIndustrial && hasDurableConstruction && wantsLongTerme) {
    return {
      type: 'Bail emphytéotique',
      label: 'Bail emphytéotique industriel (18-99 ans)',
      description: 'Bail de longue durée pour projet industriel majeur. Adapté aux investissements nécessitant une stabilité sur plusieurs décennies.',
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
      confidence: 'high',
      conversionPossible: isCongolais ? {
        targetTitle: 'Certificat d\'enregistrement',
        requirements: [
          'Mise en valeur industrielle complète',
          'Nationalité congolaise',
          'Demande de conversion'
        ]
      } : undefined
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 3: CONCESSION ORDINAIRE (25 ans renouvelables)
  // Pour terrains en cours de mise en valeur - Titre TEMPORAIRE
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (hasSemiDurableConstruction || (isPrecaire && !isNonBati)) {
    const conversionInfo = isCongolais ? {
      targetTitle: 'Certificat d\'enregistrement (Concession perpétuelle)',
      requirements: [
        'Achèvement d\'une construction en matériaux durables',
        'Constat de mise en valeur par les services compétents',
        'Demande de conversion AVANT l\'expiration des 25 ans',
        'Paiement des frais de conversion'
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
      description: 'Droit d\'usage TEMPORAIRE accordé pour permettre la mise en valeur progressive. ⚠️ Ce n\'est PAS un titre de propriété définitif. L\'État peut retirer la concession si le terrain n\'est pas valorisé.',
      conditions: [
        'Engagement de mise en valeur dans un délai défini',
        'Paiement de la redevance annuelle obligatoire',
        'Respect du plan de mise en valeur approuvé',
        'Risque de retrait si non valorisé dans les délais'
      ],
      nextSteps: [
        'Déposer le plan de mise en valeur auprès du cadastre',
        'Obtenir l\'approbation du plan',
        'Commencer les travaux de mise en valeur',
        'Demander la conversion AVANT expiration des 25 ans'
      ],
      legalBasis: 'Art. 61-79 de la Loi n° 73-021 du 20 juillet 1973',
      confidence: 'medium',
      conversionPossible: conversionInfo
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 4: PERMIS D'OCCUPATION
  // Pour terrains non bâtis - Titre PRÉCAIRE
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
          'Demander la concession après mise en valeur',
          'Évoluer vers le titre perpétuel (si Congolais)'
        ],
        legalBasis: 'Ordonnance n° 74-148 relative aux mesures d\'exécution de la loi foncière',
        confidence: 'high',
        conversionPossible: {
          targetTitle: isCongolais ? 'Certificat d\'enregistrement (via concession)' : 'Bail emphytéotique',
          requirements: [
            'Construction en matériaux durables',
            'Respect des délais de mise en valeur',
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
            'Bornage officiel du terrain',
            'Demande formelle de concession',
            'Nationalité congolaise pour le perpétuel'
          ]
        }
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RÈGLE 5: AUTORISATION D'OCCUPATION PROVISOIRE (AOP)
  // Pour construction précaire - Titre TRÈS PRÉCAIRE
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
        'Demander la conversion en concession ordinaire',
        'Évoluer vers un titre plus stable'
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
  // Options limitées - Bail ou location
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isEtranger && !hasDurableConstruction) {
    if (wantsLongTerme || wantsPerpetuel) {
      return {
        type: 'Bail emphytéotique',
        label: 'Bail emphytéotique (projet - 18-99 ans)',
        description: 'Bail de longue durée recommandé pour sécuriser votre investissement. Nécessite un plan de mise en valeur substantiel. Ce n\'est PAS un titre de propriété définitif.',
        conditions: [
          'Projet de mise en valeur documenté',
          'Capacité financière démontrée',
          'Engagement de construction durable',
          'Paiement du canon emphytéotique annuel',
          '⚠️ Les étrangers ne peuvent PAS obtenir de titre perpétuel'
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
          'Obtenir le certificat de bail',
          'Envisager un bail emphytéotique pour plus de stabilité'
        ],
        legalBasis: 'Code civil congolais et Loi foncière n° 73-021',
        confidence: 'high'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK: CONCESSION ORDINAIRE (jamais certificat d'enregistrement par défaut)
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
        'Nationalité congolaise',
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
 * Obtenir les options de durée d'occupation
 */
export const OCCUPATION_DURATION_OPTIONS = [
  { 
    value: 'perpetuel', 
    label: 'Perpétuel (Certificat d\'enregistrement)', 
    description: 'Seul titre DÉFINITIF en RDC - Congolais uniquement avec mise en valeur complète' 
  },
  { 
    value: 'long_terme', 
    label: 'Long terme (18-99 ans)', 
    description: 'Bail emphytéotique - Droit réel limité dans le temps, renouvelable' 
  },
  { 
    value: 'temporaire', 
    label: 'Temporaire (≤25 ans)', 
    description: '⚠️ Concession ordinaire ou bail foncier - Titre NON définitif, risque de retrait' 
  }
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
