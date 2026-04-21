import {
  LayoutDashboard, Users, FileText, CreditCard, BarChart3, Settings, Shield,
  MapPin, Bell, ClipboardList, Search, LayoutList, CheckSquare, DollarSign,
  ShoppingCart, FileCheck, AlertTriangle, Database, Globe, Gift, Map as MapIcon,
  Tag, Tags, Building2, Receipt, TrendingUp, Smartphone, Grid3X3, TestTube,
  Key, Scale, Award, Handshake, Presentation, PieChart, Wallet, ArrowLeftRight,
  Layers, FileSearch, Landmark, ScrollText, History, Compass, Percent, Activity,
  SlidersHorizontal, BookOpen, Newspaper, Palette, UserCog, CalendarCheck,
  type LucideIcon,
} from 'lucide-react';

export type AdminBadgeKey =
  | 'pending' | 'landTitle' | 'permits' | 'mutations'
  | 'expertise' | 'subdivisions' | 'payments' | 'disputes' | 'mortgages'
  | null;

export interface AdminMenuItem {
  icon: LucideIcon;
  label: string;
  value: string;
  badge: AdminBadgeKey;
  keywords: string[];
}

export interface AdminMenuSection {
  category: string;
  items: AdminMenuItem[];
}

export const menuItems: AdminMenuSection[] = [
  {
    category: "Vue d'ensemble",
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard', badge: null, keywords: ['accueil', 'home', 'tableau de bord', 'overview', 'résumé'] },
      { icon: PieChart, label: 'Analytics', value: 'analytics', badge: null, keywords: ['statistiques', 'stats', 'graphiques', 'données', 'rapports'] },
      { icon: SlidersHorizontal, label: 'Config Graphiques', value: 'analytics-charts-config', badge: null, keywords: ['charts', 'filigrane', 'watermark', 'visualisation', 'diagrammes', 'global', 'logo', 'carte', 'rdc'] },
    ],
  },
  {
    category: 'Utilisateurs & Sécurité',
    items: [
      { icon: Users, label: 'Utilisateurs', value: 'users', badge: null, keywords: ['comptes', 'profils', 'membres', 'clients', 'inscrits', 'email'] },
      { icon: Shield, label: 'Rôles', value: 'roles', badge: null, keywords: ['admin', 'moderateur', 'droits', 'accès'] },
      { icon: Key, label: 'Permissions', value: 'permissions', badge: null, keywords: ['autorisation', 'accès', 'droits', 'sécurité'] },
      { icon: AlertTriangle, label: 'Détection Fraude', value: 'fraud', badge: null, keywords: ['suspicious', 'suspect', 'alerte', 'anomalie', 'risque'] },
      { icon: Shield, label: 'Hub Sécurité', value: 'security-hub', badge: null, keywords: ['hub', 'sécurité', 'inactifs', 'risque', 'audit', '2fa'] },
    ],
  },
  {
    category: 'Contributions CCC',
    items: [
      { icon: ClipboardList, label: 'Contributions CCC', value: 'ccc', badge: null, keywords: ['cadastre', 'parcelle', 'soumission', 'contribution'] },
      { icon: FileCheck, label: 'File de validation', value: 'validation', badge: 'pending', keywords: ['en attente', 'pending', 'vérification', 'approuver', 'rejeter'] },
      { icon: Gift, label: 'Codes CCC', value: 'ccc-codes', badge: null, keywords: ['code promo', 'bon', 'récompense', 'coupon'] },
      { icon: BarChart3, label: 'Utilisation CCC', value: 'ccc-usage', badge: null, keywords: ['stats', 'métriques', 'usage'] },
      { icon: Settings, label: 'Config Contributions', value: 'contribution-config', badge: null, keywords: ['paramètres', 'configuration', 'réglages'] },
    ],
  },
  {
    category: 'Facturation & Commerce',
    items: [
      { icon: Wallet, label: 'Tableau de bord financier', value: 'financial', badge: null, keywords: ['finances', 'revenus', 'chiffre affaires', 'argent', 'bilan', 'hub', 'kpi'] },
      { icon: FileText, label: 'Factures', value: 'invoices', badge: null, keywords: ['invoice', 'paiement', 'reçu', 'bordereau'] },
      { icon: ScrollText, label: 'Transactions', value: 'transactions', badge: null, keywords: ['historique', 'opérations', 'mouvements', 'unifiées'] },
      { icon: CheckSquare, label: 'Réconciliation', value: 'payment-reconciliation', badge: null, keywords: ['rapprochement', 'vérification', 'matching'] },
      { icon: TrendingUp, label: 'Monitoring paiements', value: 'payment-monitoring', badge: null, keywords: ['surveillance', 'suivi', 'temps réel', 'alertes'] },
      { icon: CreditCard, label: 'Paiements', value: 'payments', badge: 'payments', keywords: ['transaction', 'payer', 'encaissement', 'mobile money', 'visa'] },
      { icon: DollarSign, label: 'Commissions à payer', value: 'commissions', badge: null, keywords: ['gain', 'marge', 'pourcentage', 'frais', 'à payer'] },
      { icon: Percent, label: 'Performance revendeurs', value: 'reseller-commissions', badge: null, keywords: ['agent', 'partenaire', 'commission', 'analytique'] },
      { icon: DollarSign, label: 'Ventes Revendeurs', value: 'reseller-sales', badge: null, keywords: ['vente', 'revendeur', 'commission générée', 'pipeline'] },
      { icon: ShoppingCart, label: 'Revendeurs', value: 'resellers', badge: null, keywords: ['agent', 'distributeur', 'partenaire'] },
      { icon: Tag, label: 'Codes de Remise', value: 'discount-codes', badge: null, keywords: ['promo', 'réduction', 'coupon', 'remise'] },
      { icon: Smartphone, label: 'Moyens de Paiement', value: 'payment-methods', badge: null, keywords: ['mobile money', 'carte', 'virement', 'méthode'] },
      { icon: Settings, label: 'Mode de Paiement', value: 'payment-mode', badge: null, keywords: ['test', 'production', 'sandbox', 'live'] },
      { icon: Layers, label: 'Intégration Services', value: 'payment-integration', badge: null, keywords: ['api', 'webhook', 'connexion', 'service'] },
      { icon: Receipt, label: 'Frais & Tarifs services', value: 'billing-config', badge: null, keywords: ['tarif', 'frais', 'prix', 'permis', 'mutation', 'expertise', 'hypothèque', 'lotissement'] },
      { icon: FileText, label: 'Modèle de facture', value: 'invoice-template', badge: null, keywords: ['template', 'modèle', 'facture', 'identité', 'logo', 'tva', 'rccm', 'dgi', 'mise en page', 'aperçu', 'pdf'] },
      { icon: ArrowLeftRight, label: 'Devises / Taux', value: 'currency-config', badge: null, keywords: ['dollar', 'franc', 'euro', 'change', 'conversion', 'monnaie'] },
      { icon: FileText, label: 'Avoirs', value: 'credit-notes', badge: null, keywords: ['avoir', 'note de crédit', 'annulation', 'remboursement comptable', 'av-'] },
      { icon: ArrowLeftRight, label: 'Remboursements', value: 'refunds', badge: null, keywords: ['refund', 'rembourser', 'retour', 'annulation paiement'] },
      { icon: Bell, label: 'Relances impayées', value: 'invoice-reminders', badge: null, keywords: ['relance', 'impayé', 'rappel', 'overdue', 'recouvrement'] },
      { icon: CalendarCheck, label: 'Périodes fiscales', value: 'fiscal-periods', badge: null, keywords: ['clôture', 'période', 'mensuelle', 'fiscale', 'fermer', 'verrouiller'] },
      { icon: BookOpen, label: 'Journal comptable', value: 'accounting-journal', badge: null, keywords: ['écriture', 'journal', 'débit', 'crédit', 'compte', '411', '706', '4457', 'plan comptable'] },
      { icon: Receipt, label: 'Reporting TVA', value: 'tva-reporting', badge: null, keywords: ['tva', 'déclaration', 'dgi', 'collectée', 'reverser', 'mensuelle'] },
      { icon: FileSearch, label: 'Export FEC', value: 'fec-export', badge: null, keywords: ['export', 'fec', 'comptable', 'comptabilité', 'csv', 'fiscal'] },
    ],
  },
  {
    category: 'Carte & Configuration',
    items: [
      { icon: MapIcon, label: 'Carte Cadastrale', value: 'cadastral-map', badge: null, keywords: ['map', 'géolocalisation', 'terrain', 'plan'] },
      { icon: Globe, label: 'Fournisseurs Carte', value: 'map-providers', badge: null, keywords: ['mapbox', 'openstreetmap', 'tiles', 'fournisseur'] },
      { icon: Database, label: 'Services Cadastraux', value: 'services', badge: null, keywords: ['service', 'tarif', 'prix', 'catalogue'] },
      { icon: Layers, label: 'Config Catalogue', value: 'catalog-config', badge: null, keywords: ['produits', 'offres', 'affichage'] },
      { icon: MapPin, label: 'Infobulle Carte', value: 'cadastral-tooltip', badge: null, keywords: ['tooltip', 'popup', 'info', 'survol'] },
      { icon: LayoutList, label: 'Légende Carte', value: 'map-legend', badge: null, keywords: ['légende', 'couleurs', 'symboles'] },
      { icon: Search, label: 'Config Recherche', value: 'search-config', badge: null, keywords: ['filtre', 'rechercher', 'paramètres'] },
      { icon: FileSearch, label: 'Config Résultats', value: 'results-config', badge: null, keywords: ['affichage', 'résultats', 'liste'] },
      { icon: Compass, label: 'Zones Territoriales', value: 'zones', badge: null, keywords: ['province', 'commune', 'territoire', 'ville', 'quartier'] },
      { icon: Database, label: 'Hub Configuration', value: 'config-hub', badge: null, keywords: ['config', 'hub', 'centralisé', 'audit', 'snapshot'] },
    ],
  },
  {
    category: 'Demandes & Procédures',
    items: [
      { icon: LayoutDashboard, label: 'Hub Demandes', value: 'requests-hub', badge: null, keywords: ['hub', 'transversal', 'sla', 'stale', 'escalade', 'certificats'] },
      { icon: Building2, label: 'Autorisation de Bâtir', value: 'permits', badge: 'permits', keywords: ['permis', 'construction', 'bâtiment', 'urbanisme'] },
      { icon: Receipt, label: 'Config Frais Autorisation', value: 'permit-fees-config', badge: null, keywords: ['tarif', 'prix', 'coût'] },
      { icon: Landmark, label: 'Demandes Titres Fonciers', value: 'land-title-requests', badge: 'landTitle', keywords: ['titre', 'foncier', 'propriété', 'certificat'] },
      { icon: ArrowLeftRight, label: 'Demandes Mutation', value: 'mutations', badge: 'mutations', keywords: ['transfert', 'cession', 'vente', 'changement propriétaire'] },
      { icon: DollarSign, label: 'Config Frais Mutation', value: 'mutation-fees-config', badge: null, keywords: ['tarif', 'prix', 'coût'] },
      { icon: Grid3X3, label: 'Demandes Lotissement', value: 'subdivision-requests', badge: 'subdivisions', keywords: ['division', 'morcellement', 'parcellisation'] },
      { icon: DollarSign, label: 'Config Frais Lotissement', value: 'subdivision-fees-config', badge: null, keywords: ['tarif', 'prix', 'coût'] },
      { icon: FileCheck, label: 'Expertises foncières', value: 'expertise-requests', badge: 'expertise', keywords: ['expert', 'évaluation', 'estimation', 'immobilier'] },
      { icon: DollarSign, label: 'Config Frais Expert.', value: 'expertise-fees-config', badge: null, keywords: ['tarif', 'prix', 'coût'] },
      { icon: Award, label: 'Gestion Certificats', value: 'certificates', badge: null, keywords: ['attestation', 'document', 'preuve'] },
    ],
  },
  {
    category: 'Historiques & Litiges',
    items: [
      { icon: LayoutDashboard, label: 'Hub Historiques', value: 'history-hub', badge: null, keywords: ['hub', 'transversal', 'timeline', 'parcelle', 'alerte', 'croisée'] },
      { icon: Scale, label: 'Litiges Fonciers', value: 'land-disputes', badge: 'disputes', keywords: ['conflit', 'dispute', 'contestation', 'tribunal'] },
      { icon: PieChart, label: 'Analytics Litiges', value: 'dispute-analytics', badge: null, keywords: ['statistiques', 'stats', 'graphiques'] },
      { icon: Database, label: 'Hypothèques', value: 'mortgages', badge: 'mortgages', keywords: ['crédit', 'prêt', 'banque', 'garantie'] },
      { icon: Receipt, label: 'Historique Taxes', value: 'tax-history', badge: null, keywords: ['impôt', 'taxe', 'fiscal', 'redevance'] },
      { icon: ScrollText, label: 'Déclarations Fiscales', value: 'tax-declarations', badge: null, keywords: ['impôt', 'déclaration', 'fiscal'] },
      { icon: History, label: 'Historique Propriété', value: 'ownership-history', badge: null, keywords: ['propriétaire', 'mutation', 'historique', 'chaîne'] },
      { icon: Compass, label: 'Historique Bornage', value: 'boundary-history', badge: null, keywords: ['borne', 'délimitation', 'géomètre', 'arpentage'] },
    ],
  },
  {
    category: 'Contenu',
    items: [
      { icon: LayoutDashboard, label: 'Hub Contenu', value: 'content-hub', badge: null, keywords: ['hub', 'kpi', 'overview', 'éditorial', 'agrégé'] },
      { icon: Handshake, label: 'Partenaires', value: 'partners', badge: null, keywords: ['collaboration', 'sponsor', 'partenariat'] },
      { icon: Presentation, label: 'Présentation BIC', value: 'pitch-config', badge: null, keywords: ['pitch', 'présentation', 'slides', 'investisseur'] },
      { icon: Newspaper, label: 'Publications', value: 'publications', badge: null, keywords: ['blog', 'actualités', 'news', 'post'] },
      { icon: Tags, label: 'Catégories Publications', value: 'publication-categories', badge: null, keywords: ['catégorie', 'rubrique', 'publication'] },
      { icon: BookOpen, label: 'Articles', value: 'articles', badge: null, keywords: ['blog', 'contenu', 'rédaction', 'texte'] },
      { icon: Palette, label: 'Thèmes Articles', value: 'article-themes', badge: null, keywords: ['catégorie', 'rubrique', 'sujet'] },
      { icon: Bell, label: 'Notifications', value: 'notifications', badge: null, keywords: ['alerte', 'message', 'push', 'email'] },
    ],
  },
  {
    category: 'Système',
    items: [
      { icon: Activity, label: 'Hub Système', value: 'system-hub', badge: null, keywords: ['hub', 'tableau', 'overview', 'kpi'] },
      { icon: SlidersHorizontal, label: 'Paramètres', value: 'system-settings', badge: null, keywords: ['settings', 'config', 'global', 'timezone', 'devise'] },
      { icon: Settings, label: 'Actions Parcelle', value: 'parcel-actions-config', badge: null, keywords: ['boutons', 'actions', 'parcelle'] },
      { icon: Palette, label: 'Apparence', value: 'appearance', badge: null, keywords: ['thème', 'couleurs', 'logo', 'design', 'style', 'favicon'] },
      { icon: TestTube, label: 'Mode Test', value: 'test-mode', badge: null, keywords: ['sandbox', 'debug', 'développement', 'test'] },
      { icon: Shield, label: "Logs d'Audit", value: 'audit-logs', badge: null, keywords: ['journal', 'historique', 'trace', 'activité'] },
      { icon: Activity, label: 'Santé Système', value: 'system-health', badge: null, keywords: ['status', 'performance', 'uptime', 'monitoring'] },
      { icon: UserCog, label: 'Espace RH', value: 'hr', badge: null, keywords: ['ressources humaines', 'employés', 'personnel', 'staff'] },
    ],
  },
];

// Helpers
export const getTabLabel = (tabValue: string): string => {
  for (const section of menuItems) {
    const item = section.items.find(i => i.value === tabValue);
    if (item) return item.label;
  }
  return 'Dashboard';
};

export const getTabCategory = (tabValue: string): string => {
  for (const section of menuItems) {
    if (section.items.some(i => i.value === tabValue)) return section.category;
  }
  return '';
};
