import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Shield,
  MapPin,
  Bell,
  ClipboardList,
  Search,
  LayoutList,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  FileCheck,
  AlertTriangle,
  Database,
  Globe,
  Gift,
  Map as MapIcon,
  Tag,
  Building2,
  Receipt,
  TrendingUp,
  Smartphone,
  Grid3X3,
  TestTube,
  Key,
  Scale,
  Award,
  Handshake,
  ChevronDown,
  Presentation,
  PieChart,
  Wallet,
  ArrowLeftRight,
  Layers,
  FileSearch,
  Landmark,
  ScrollText,
  History,
  Compass,
  Percent,
  Activity,
  SlidersHorizontal,
  BookOpen,
  Newspaper,
  Palette,
  UserCog,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

interface AdminSidebarProps {
  pendingCount?: number;
  pendingLandTitleCount?: number;
  pendingPermitsCount?: number;
  pendingMutationsCount?: number;
  pendingExpertiseCount?: number;
  pendingSubdivisionsCount?: number;
  pendingPaymentsCount?: number;
  pendingDisputesCount?: number;
  pendingMortgagesCount?: number;
  onNavigate?: () => void;
}

export const menuItems = [
  {
    category: 'Vue d\'ensemble',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard', badge: null, keywords: ['accueil', 'home', 'tableau de bord', 'overview', 'résumé'] },
      { icon: PieChart, label: 'Analytics', value: 'analytics', badge: null, keywords: ['statistiques', 'stats', 'graphiques', 'données', 'rapports'] },
      { icon: SlidersHorizontal, label: 'Config Graphiques', value: 'analytics-charts-config', badge: null, keywords: ['charts', 'filigrane', 'watermark', 'visualisation', 'diagrammes', 'global', 'logo', 'carte', 'rdc'] },
    ]
  },
  {
    category: 'Utilisateurs & Sécurité',
    items: [
      { icon: Users, label: 'Utilisateurs', value: 'users', badge: null, keywords: ['comptes', 'profils', 'membres', 'clients', 'inscrits', 'email'] },
      { icon: Shield, label: 'Rôles', value: 'roles', badge: null, keywords: ['admin', 'moderateur', 'droits', 'accès'] },
      { icon: Key, label: 'Permissions', value: 'permissions', badge: null, keywords: ['autorisation', 'accès', 'droits', 'sécurité'] },
      { icon: AlertTriangle, label: 'Détection Fraude', value: 'fraud', badge: null, keywords: ['suspicious', 'suspect', 'alerte', 'anomalie', 'risque'] },
    ]
  },
  {
    category: 'Contributions CCC',
    items: [
      { icon: ClipboardList, label: 'Contributions CCC', value: 'ccc', badge: null, keywords: ['cadastre', 'parcelle', 'soumission', 'contribution'] },
      { icon: FileCheck, label: 'File de validation', value: 'validation', badge: 'pending', keywords: ['en attente', 'pending', 'vérification', 'approuver', 'rejeter'] },
      { icon: Gift, label: 'Codes CCC', value: 'ccc-codes', badge: null, keywords: ['code promo', 'bon', 'récompense', 'coupon'] },
      { icon: BarChart3, label: 'Utilisation CCC', value: 'ccc-usage', badge: null, keywords: ['stats', 'métriques', 'usage'] },
      { icon: Settings, label: 'Config Contributions', value: 'contribution-config', badge: null, keywords: ['paramètres', 'configuration', 'réglages'] },
    ]
  },
  {
    category: 'Paiements',
    items: [
      { icon: Wallet, label: 'Tableau de Bord', value: 'financial', badge: null, keywords: ['finances', 'revenus', 'chiffre affaires', 'argent', 'bilan'] },
      { icon: CreditCard, label: 'Paiements', value: 'payments', badge: 'payments', keywords: ['transaction', 'payer', 'encaissement', 'mobile money', 'visa'] },
      { icon: CheckSquare, label: 'Réconciliation', value: 'payment-reconciliation', badge: null, keywords: ['rapprochement', 'vérification', 'matching'] },
      { icon: Smartphone, label: 'Moyens de Paiement', value: 'payment-methods', badge: null, keywords: ['mobile money', 'carte', 'virement', 'méthode'] },
      { icon: Settings, label: 'Mode de Paiement', value: 'payment-mode', badge: null, keywords: ['test', 'production', 'sandbox', 'live'] },
      { icon: Layers, label: 'Intégration Services', value: 'payment-integration', badge: null, keywords: ['api', 'webhook', 'connexion', 'service'] },
      { icon: TrendingUp, label: 'Monitoring', value: 'payment-monitoring', badge: null, keywords: ['surveillance', 'suivi', 'temps réel', 'alertes'] },
      { icon: Layers, label: 'Vue Unifiée', value: 'unified-payments', badge: null, keywords: ['unifié', 'agrégé', 'tous paiements', 'sources'] },
    ]
  },
  {
    category: 'Facturation & Commerce',
    items: [
      { icon: Receipt, label: 'Config Facturation', value: 'billing-config', badge: null, keywords: ['facture', 'devis', 'paramètres', 'template'] },
      { icon: ArrowLeftRight, label: 'Devises / Taux', value: 'currency-config', badge: null, keywords: ['dollar', 'franc', 'euro', 'change', 'conversion', 'monnaie'] },
      { icon: FileText, label: 'Factures', value: 'invoices', badge: null, keywords: ['invoice', 'paiement', 'reçu', 'bordereau'] },
      { icon: ScrollText, label: 'Transactions', value: 'transactions', badge: null, keywords: ['historique', 'opérations', 'mouvements'] },
      { icon: DollarSign, label: 'Commissions', value: 'commissions', badge: null, keywords: ['gain', 'marge', 'pourcentage', 'frais'] },
      { icon: Percent, label: 'Commissions Revendeurs', value: 'reseller-commissions', badge: null, keywords: ['agent', 'partenaire', 'commission'] },
      { icon: DollarSign, label: 'Ventes Revendeurs', value: 'reseller-sales', badge: null, keywords: ['vente', 'revendeur', 'commission générée', 'pipeline'] },
      { icon: ShoppingCart, label: 'Revendeurs', value: 'resellers', badge: null, keywords: ['agent', 'distributeur', 'partenaire'] },
      { icon: Tag, label: 'Codes de Remise', value: 'discount-codes', badge: null, keywords: ['promo', 'réduction', 'coupon', 'remise'] },
    ]
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
    ]
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
    ]
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
    ]
  },
  {
    category: 'Contenu',
    items: [
      { icon: Handshake, label: 'Partenaires', value: 'partners', badge: null, keywords: ['collaboration', 'sponsor', 'partenariat'] },
      { icon: Presentation, label: 'Présentation BIC', value: 'pitch-config', badge: null, keywords: ['pitch', 'présentation', 'slides', 'investisseur'] },
      { icon: Newspaper, label: 'Publications', value: 'publications', badge: null, keywords: ['blog', 'actualités', 'news', 'post'] },
      { icon: BookOpen, label: 'Articles', value: 'articles', badge: null, keywords: ['blog', 'contenu', 'rédaction', 'texte'] },
      { icon: Palette, label: 'Thèmes Articles', value: 'article-themes', badge: null, keywords: ['catégorie', 'rubrique', 'sujet'] },
      { icon: Bell, label: 'Notifications', value: 'notifications', badge: null, keywords: ['alerte', 'message', 'push', 'email'] },
    ]
  },
  {
    category: 'Système',
    items: [
      { icon: Settings, label: 'Actions Parcelle', value: 'parcel-actions-config', badge: null, keywords: ['boutons', 'actions', 'parcelle'] },
      { icon: Palette, label: 'Apparence', value: 'appearance', badge: null, keywords: ['thème', 'couleurs', 'logo', 'design', 'style', 'favicon'] },
      { icon: TestTube, label: 'Mode Test', value: 'test-mode', badge: null, keywords: ['sandbox', 'debug', 'développement', 'test'] },
      { icon: Shield, label: 'Logs d\'Audit', value: 'audit-logs', badge: null, keywords: ['journal', 'historique', 'trace', 'activité'] },
      { icon: Activity, label: 'Santé Système', value: 'system-health', badge: null, keywords: ['status', 'performance', 'uptime', 'monitoring'] },
      { icon: UserCog, label: 'Espace RH', value: 'hr', badge: null, keywords: ['ressources humaines', 'employés', 'personnel', 'staff'] },
    ]
  },
];

// Helper to get label from tab value
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

export function AdminSidebar({ pendingCount, pendingLandTitleCount, pendingPermitsCount, pendingMutationsCount, pendingExpertiseCount, pendingSubdivisionsCount, pendingPaymentsCount, pendingDisputesCount, pendingMortgagesCount, onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const activeCategoryIndex = menuItems.findIndex(section =>
    section.items.some(item => item.value === currentTab)
  );

  const [openSections, setOpenSections] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    menuItems.forEach((_, idx) => {
      initial[idx] = idx === 0 || idx === activeCategoryIndex;
    });
    return initial;
  });

  const toggleSection = (idx: number) => {
    setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  const getBadgeCount = (badge: string | null) => {
    switch (badge) {
      case 'pending': return pendingCount || 0;
      case 'landTitle': return pendingLandTitleCount || 0;
      case 'permits': return pendingPermitsCount || 0;
      case 'mutations': return pendingMutationsCount || 0;
      case 'expertise': return pendingExpertiseCount || 0;
      case 'subdivisions': return pendingSubdivisionsCount || 0;
      case 'payments': return pendingPaymentsCount || 0;
      case 'disputes': return pendingDisputesCount || 0;
      case 'mortgages': return pendingMortgagesCount || 0;
      default: return 0;
    }
  };

  const getSectionBadgeTotal = (section: typeof menuItems[0]) => {
    return section.items.reduce((total, item) => total + getBadgeCount(item.badge), 0);
  };

  return (
    <ScrollArea className="h-full py-2 md:py-4">
      <div className="space-y-1 md:space-y-1.5 px-2 md:px-3">
        {menuItems.map((section, sectionIdx) => {
          const isOpen = openSections[sectionIdx] ?? false;
          const sectionBadgeTotal = getSectionBadgeTotal(section);

          return (
            <Collapsible
              key={section.category}
              open={isOpen}
              onOpenChange={() => toggleSection(sectionIdx)}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 md:px-3 py-1.5 md:py-2 rounded-md hover:bg-accent/50 transition-colors group">
                <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.category}
                </span>
                <div className="flex items-center gap-1">
                  {!isOpen && sectionBadgeTotal > 0 && (
                    <Badge variant="destructive" className="text-[9px] md:text-[10px] px-1 py-0 h-4">
                      {sectionBadgeTotal}
                    </Badge>
                  )}
                  <ChevronDown className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 md:space-y-1 mt-0.5">
                {section.items.map((item) => {
                  const isActive = currentTab === item.value;
                  const Icon = item.icon;
                  const badgeCount = getBadgeCount(item.badge);
                  const showPendingBadge = badgeCount > 0;

                  return (
                    <Link
                      key={item.value}
                      to={`/admin?tab=${item.value}`}
                      onClick={handleClick}
                      className={cn(
                        'flex items-center gap-2 md:gap-3 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm transition-all hover:bg-accent',
                        isActive
                          ? 'bg-accent text-accent-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {showPendingBadge && (
                        <Badge variant="destructive" className="ml-auto text-[10px] md:text-xs px-1 md:px-1.5 py-0 md:py-0.5 h-4 md:h-5">
                          {badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );
}
