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
  Gift
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdminSidebarProps {
  pendingCount?: number;
  onNavigate?: () => void;
}

const menuItems = [
  {
    category: 'Vue d\'ensemble',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', value: 'dashboard', badge: null },
      { icon: BarChart, label: 'Analytics', value: 'analytics', badge: null },
    ]
  },
  {
    category: 'Gestion des utilisateurs',
    items: [
      { icon: Users, label: 'Utilisateurs', value: 'users', badge: null },
      { icon: Shield, label: 'Rôles & Permissions', value: 'roles', badge: null },
      { icon: AlertTriangle, label: 'Détection Fraude', value: 'fraud', badge: null },
    ]
  },
  {
    category: 'Contributions CCC',
    items: [
      { icon: ClipboardList, label: 'Contributions CCC', value: 'ccc', badge: null },
      { icon: FileCheck, label: 'File de validation', value: 'validation', badge: 'pending' },
      { icon: Gift, label: 'Codes CCC', value: 'ccc-codes', badge: null },
      { icon: Settings, label: 'Config Contributions', value: 'contribution-config', badge: null },
    ]
  },
  {
    category: 'Finances',
    items: [
      { icon: CreditCard, label: 'Paiements', value: 'payments', badge: null },
      { icon: DollarSign, label: 'Factures', value: 'invoices', badge: null },
      { icon: ShoppingCart, label: 'Revendeurs', value: 'resellers', badge: null },
    ]
  },
  {
    category: 'Cadastre & Services',
    items: [
      { icon: Database, label: 'Services Cadastraux', value: 'services', badge: null },
      { icon: Search, label: 'Config Recherche', value: 'search-config', badge: null },
      { icon: FileText, label: 'Config Résultats', value: 'results-config', badge: null },
      { icon: MapPin, label: 'Zones Territoriales', value: 'zones', badge: null },
      { icon: Globe, label: 'Permis de Construire', value: 'permits', badge: null },
    ]
  },
  {
    category: 'Contenu',
    items: [
      { icon: FileText, label: 'Publications', value: 'publications', badge: null },
      { icon: FileText, label: 'Articles', value: 'articles', badge: null },
      { icon: Bell, label: 'Notifications', value: 'notifications', badge: null },
    ]
  },
  {
    category: 'Système',
    items: [
      { icon: Shield, label: 'Logs d\'Audit', value: 'audit-logs', badge: null },
    ]
  },
];

export function AdminSidebar({ pendingCount, onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';

  const handleClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <ScrollArea className="h-full py-4">
      <div className="space-y-6 px-3">
        {menuItems.map((section) => (
          <div key={section.category}>
            <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.category}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = currentTab === item.value;
                const Icon = item.icon;
                const showPendingBadge = item.badge === 'pending' && pendingCount && pendingCount > 0;

                return (
                  <Link
                    key={item.value}
                    to={`/admin?tab=${item.value}`}
                    onClick={handleClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent',
                      isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {showPendingBadge && (
                      <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                        {pendingCount}
                      </Badge>
                    )}
                    {item.badge === 'new' && (
                      <Badge variant="secondary" className="h-5 px-2 text-xs">
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
