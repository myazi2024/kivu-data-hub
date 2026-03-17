import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  BarChart,
  Settings,
  Shield,
  MapPin,
  Bell,
  ClipboardList,
  Search,
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
  Award
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSidebarProps {
  pendingCount?: number;
  pendingLandTitleCount?: number;
  pendingPermitsCount?: number;
  pendingMutationsCount?: number;
  pendingExpertiseCount?: number;
  pendingSubdivisionsCount?: number;
  pendingPaymentsCount?: number;
  onNavigate?: () => void;
}

const menuItems = [
  {
    category: 'Vue d\'ensemble',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard', badge: null },
      { icon: BarChart, label: 'Analytics', value: 'analytics', badge: null },
      { icon: BarChart, label: 'Config Graphiques', value: 'analytics-charts-config', badge: null },
    ]
  },
  {
    category: 'Gestion des utilisateurs',
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
      { icon: BarChart, label: 'Utilisation CCC', value: 'ccc-usage', badge: null },
      { icon: Settings, label: 'Config Contributions', value: 'contribution-config', badge: null },
    ]
  },
  {
    category: 'Finances',
    items: [
      { icon: BarChart, label: 'Tableau de Bord', value: 'financial', badge: null },
      { icon: CreditCard, label: 'Paiements', value: 'payments', badge: 'payments' },
      { icon: CheckSquare, label: 'Réconciliation', value: 'payment-reconciliation', badge: null },
      { icon: Smartphone, label: 'Moyens de Paiement', value: 'payment-methods', badge: null },
      { icon: Settings, label: 'Mode de Paiement', value: 'payment-mode', badge: null },
      { icon: CheckSquare, label: 'Intégration Services', value: 'payment-integration', badge: null },
      { icon: TrendingUp, label: 'Monitoring Paiements', value: 'payment-monitoring', badge: null },
      { icon: Receipt, label: 'Config Facturation', value: 'billing-config', badge: null },
      { icon: DollarSign, label: 'Factures', value: 'invoices', badge: null },
      { icon: FileText, label: 'Transactions', value: 'transactions', badge: null },
      { icon: Users, label: 'Commissions', value: 'commissions', badge: null },
      { icon: DollarSign, label: 'Commissions Revendeurs', value: 'reseller-commissions', badge: null },
      { icon: ShoppingCart, label: 'Revendeurs', value: 'resellers', badge: null },
      { icon: Tag, label: 'Codes de Remise', value: 'discount-codes', badge: null },
    ]
  },
  {
    category: 'Cadastre & Services',
    items: [
      { icon: MapIcon, label: 'Carte Cadastrale', value: 'cadastral-map', badge: null },
      { icon: Globe, label: 'Fournisseurs Carte', value: 'map-providers', badge: null },
      { icon: Database, label: 'Services Cadastraux', value: 'services', badge: null },
      { icon: Settings, label: 'Config Catalogue', value: 'catalog-config', badge: null },
      { icon: Settings, label: 'Infobulle Carte', value: 'cadastral-tooltip', badge: null },
      { icon: Search, label: 'Config Recherche', value: 'search-config', badge: null },
      { icon: FileText, label: 'Config Résultats', value: 'results-config', badge: null },
      { icon: MapPin, label: 'Zones Territoriales', value: 'zones', badge: null },
      { icon: Building2, label: 'Autorisation de Bâtir', value: 'permits', badge: 'permits' },
      { icon: FileText, label: 'Config Frais Permis', value: 'permit-fees-config', badge: null },
      { icon: FileText, label: 'Demandes Titres Fonciers', value: 'land-title-requests', badge: 'landTitle' },
      { icon: FileText, label: 'Demandes Mutation', value: 'mutations', badge: 'mutations' },
      { icon: DollarSign, label: 'Config Frais Mutation', value: 'mutation-fees-config', badge: null },
      { icon: Grid3X3, label: 'Demandes Lotissement', value: 'subdivision-requests', badge: 'subdivisions' },
      { icon: FileCheck, label: 'Expertises Immob.', value: 'expertise-requests', badge: 'expertise' },
      { icon: DollarSign, label: 'Config Frais Expert.', value: 'expertise-fees-config', badge: null },
      { icon: AlertTriangle, label: 'Conflits Limites', value: 'boundary-conflicts', badge: null },
      { icon: Scale, label: 'Litiges Fonciers', value: 'land-disputes', badge: null },
      { icon: Database, label: 'Hypothèques', value: 'mortgages', badge: null },
      { icon: FileText, label: 'Historique Taxes', value: 'tax-history', badge: null },
      { icon: Users, label: 'Historique Propriété', value: 'ownership-history', badge: null },
      { icon: MapPin, label: 'Historique Bornage', value: 'boundary-history', badge: null },
    ]
  },
  {
    category: 'Certificats',
    items: [
      { icon: Award, label: 'Gestion Certificats', value: 'certificates', badge: null },
    ]
  },
  {
    category: 'Contenu',
    items: [
      { icon: FileText, label: 'Publications', value: 'publications', badge: null },
      { icon: FileText, label: 'Articles', value: 'articles', badge: null },
      { icon: Tag, label: 'Thèmes Articles', value: 'article-themes', badge: null },
      { icon: Bell, label: 'Notifications', value: 'notifications', badge: null },
    ]
  },
  {
    category: 'Système',
    items: [
      { icon: Settings, label: 'Actions Parcelle', value: 'parcel-actions-config', badge: null },
      { icon: TestTube, label: 'Mode Test', value: 'test-mode', badge: null },
      { icon: Shield, label: 'Logs d\'Audit', value: 'audit-logs', badge: null },
      { icon: Database, label: 'Santé Système', value: 'system-health', badge: null },
    ]
  },
];

export function AdminSidebar({ pendingCount, pendingLandTitleCount, pendingPermitsCount, pendingMutationsCount, pendingExpertiseCount, pendingSubdivisionsCount, onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

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
      default: return 0;
    }
  };

  return (
    <ScrollArea className="h-full py-2 md:py-4">
      <div className="space-y-4 md:space-y-6 px-2 md:px-3">
        {menuItems.map((section) => (
          <div key={section.category}>
            <h3 className="mb-1.5 md:mb-2 px-2 md:px-3 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.category}
            </h3>
            <div className="space-y-0.5 md:space-y-1">
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
                    {item.badge === 'new' && (
                      <Badge variant="secondary" className="text-[10px] md:text-xs px-1 md:px-2 py-0 md:py-0.5 h-4 md:h-5">
                        New
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
