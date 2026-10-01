export interface AdditionalConstructionPermit {
  permitType: 'construction' | 'regularization';
  permitNumber: string;
  issueDate: string;
  issuingService: string;
  attachmentFile?: File | null;
}

export interface AdditionalConstruction {
  propertyCategory: string;
  constructionType: string;
  constructionNature: string;
  constructionMaterials: string;
  declaredUsage: string;
  standing: string;
  constructionYear?: number;
  /** État d'avancement : construction achevée ou en cours. */
  constructionStatus?: 'completed' | 'in_progress';
  /** Le bien est-il mis en location ? (remplace l'ancien usage « Location ») */
  isRented?: boolean;
  rentalStartDate?: string; // ISO yyyy-MM-dd, requis si isRented
  apartmentNumber?: string;
  floorNumber?: string;
  // Configuration locative (si isRented)
  rentalConfiguration?: 'single' | 'multi';
  rentalUnitsCount?: number;
  monthlyRentUsd?: number;
  rentalUnits?: Array<{
    label?: string;
    monthlyRentUsd?: number;
    isOccupied?: boolean;
    hostingCapacity?: number;
    rentalStartDate?: string;
    floor?: string;
  }>;
  // Capacité d'accueil
  isOccupied?: boolean;
  occupantCount?: number;
  hostingCapacity?: number;
  /** Usage réellement fait du bien par l'occupant (peut différer de l'usage prévu). */
  actualUsage?: string;
  actualUsageOther?: string;
  operationalCapacity?: number;
  operationalCapacityUnit?: string;
  leaseContractUrl?: string;
  /** Hauteur (m) — saisie indépendante du tracé, répercutée sur la forme liée du croquis. */
  heightM?: number;
  // Autorisation de bâtir
  permitMode?: 'existing' | 'request';
  permit?: AdditionalConstructionPermit;
}
