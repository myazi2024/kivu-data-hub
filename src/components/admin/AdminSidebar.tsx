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
      { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard', badge: null },
      { icon: PieChart, label: 'Analytics', value: 'analytics', badge: null },
      { icon: SlidersHorizontal, label: 'Config Graphiques', value: 'analytics-charts-config', badge: null },
    ]
  },
  {
    category: 'Utilisateurs & Sécurité',
    items: [
      { icon: Users, label: 'Utilisateurs', value: 'users', badge: null },
      { icon: Shield, label: 'Rôles', value: 'roles', badge: null },
      { icon: Key, label: 'Permissions', value: 'permissions', badge: null },
      { icon: AlertTriangle, label: 'Détection Fraude', value: 'fraud', badge: null },
    ]
  },
  {
    category: 'Contributions CCC',
    items: [
      { icon: ClipboardList, label: 'Contributions CCC', value: 'ccc', badge: null },
      { icon: FileCheck, label: 'File de validation', value: 'validation', badge: 'pending' },
      { icon: Gift, label: 'Codes CCC', value: 'ccc-codes', badge: null },
      { icon: BarChart3, label: 'Utilisation CCC', value: 'ccc-usage', badge: null },
      { icon: Settings, label: 'Config Contributions', value: 'contribution-config', badge: null },
    ]
  },
  {
    category: 'Paiements',
    items: [
      { icon: Wallet, label: 'Tableau de Bord', value: 'financial', badge: null },
      { icon: CreditCard, label: 'Paiements', value: 'payments', badge: 'payments' },
      { icon: CheckSquare, label: 'Réconciliation', value: 'payment-reconciliation', badge: null },
      { icon: Smartphone, label: 'Moyens de Paiement', value: 'payment-methods', badge: null },
      { icon: Settings, label: 'Mode de Paiement', value: 'payment-mode', badge: null },
      { icon: Layers, label: 'Intégration Services', value: 'payment-integration', badge: null },
      { icon: TrendingUp, label: 'Monitoring', value: 'payment-monitoring', badge: null },
    ]
  },
  {
    category: 'Facturation & Commerce',
    items: [
      { icon: Receipt, label: 'Config Facturation', value: 'billing-config', badge: null },
      { icon: ArrowLeftRight, label: 'Devises / Taux', value: 'currency-config', badge: null },
      { icon: FileText, label: 'Factures', value: 'invoices', badge: null },
      { icon: ScrollText, label: 'Transactions', value: 'transactions', badge: null },
      { icon: DollarSign, label: 'Commissions', value: 'commissions', badge: null },
      { icon: Percent, label: 'Commissions Revendeurs', value: 'reseller-commissions', badge: null },
      { icon: ShoppingCart, label: 'Revendeurs', value: 'resellers', badge: null },
      { icon: Tag, label: 'Codes de Remise', value: 'discount-codes', badge: null },
    ]
  },
  {
    category: 'Carte & Configuration',
    items: [
      { icon: MapIcon, label: 'Carte Cadastrale', value: 'cadastral-map', badge: null },
      { icon: Globe, label: 'Fournisseurs Carte', value: 'map-providers', badge: null },
      { icon: Database, label: 'Services Cadastraux', value: 'services', badge: null },
      { icon: Layers, label: 'Config Catalogue', value: 'catalog-config', badge: null },
      { icon: MapPin, label: 'Infobulle Carte', value: 'cadastral-tooltip', badge: null },
      { icon: LayoutList, label: 'Légende Carte', value: 'map-legend', badge: null },
      { icon: Search, label: 'Config Recherche', value: 'search-config', badge: null },
      { icon: FileSearch, label: 'Config Résultats', value: 'results-config', badge: null },
      { icon: Compass, label: 'Zones Territoriales', value: 'zones', badge: null },
    ]
  },
  {
    category: 'Demandes & Procédures',
    items: [
      { icon: Building2, label: 'Autorisation de Bâtir', value: 'permits', badge: 'permits' },
      { icon: Receipt, label: 'Config Frais Autorisation', value: 'permit-fees-config', badge: null },
      { icon: Landmark, label: 'Demandes Titres Fonciers', value: 'land-title-requests', badge: 'landTitle' },
      { icon: ArrowLeftRight, label: 'Demandes Mutation', value: 'mutations', badge: 'mutations' },
      { icon: DollarSign, label: 'Config Frais Mutation', value: 'mutation-fees-config', badge: null },
      { icon: Grid3X3, label: 'Demandes Lotissement', value: 'subdivision-requests', badge: 'subdivisions' },
      { icon: DollarSign, label: 'Config Frais Lotissement', value: 'subdivision-fees-config', badge: null },
      { icon: FileCheck, label: 'Expertises foncières', value: 'expertise-requests', badge: 'expertise' },
      { icon: DollarSign, label: 'Config Frais Expert.', value: 'expertise-fees-config', badge: null },
      { icon: Award, label: 'Gestion Certificats', value: 'certificates', badge: null },
    ]
  },
  {
    category: 'Historiques & Litiges',
    items: [
      { icon: Scale, label: 'Litiges Fonciers', value: 'land-disputes', badge: 'disputes' },
      { icon: PieChart, label: 'Analytics Litiges', value: 'dispute-analytics', badge: null },
      { icon: Database, label: 'Hypothèques', value: 'mortgages', badge: 'mortgages' },
      { icon: Receipt, label: 'Historique Taxes', value: 'tax-history', badge: null },
      { icon: ScrollText, label: 'Déclarations Fiscales', value: 'tax-declarations', badge: null },
      { icon: History, label: 'Historique Propriété', value: 'ownership-history', badge: null },
      { icon: Compass, label: 'Historique Bornage', value: 'boundary-history', badge: null },
    ]
  },
  {
    category: 'Contenu',
    items: [
      { icon: Handshake, label: 'Partenaires', value: 'partners', badge: null },
      { icon: Presentation, label: 'Présentation BIC', value: 'pitch-config', badge: null },
      { icon: Newspaper, label: 'Publications', value: 'publications', badge: null },
      { icon: BookOpen, label: 'Articles', value: 'articles', badge: null },
      { icon: Palette, label: 'Thèmes Articles', value: 'article-themes', badge: null },
      { icon: Bell, label: 'Notifications', value: 'notifications', badge: null },
    ]
  },
  {
    category: 'Système',
    items: [
      { icon: Settings, label: 'Actions Parcelle', value: 'parcel-actions-config', badge: null },
      { icon: TestTube, label: 'Mode Test', value: 'test-mode', badge: null },
      { icon: Shield, label: 'Logs d\'Audit', value: 'audit-logs', badge: null },
      { icon: Activity, label: 'Santé Système', value: 'system-health', badge: null },
      { icon: UserCog, label: 'Espace RH', value: 'hr', badge: null },
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
