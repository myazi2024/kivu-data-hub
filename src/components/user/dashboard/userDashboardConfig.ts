import {
  Building,
  CreditCard,
  FileEdit,
  FileSearch,
  FileText,
  Home,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Megaphone,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  Shield,
  SlidersHorizontal,
  User,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export interface UserMenuItem {
  icon: LucideIcon;
  label: string;
  value: string;
  keywords: string[];
}

export interface UserMenuSection {
  category: string;
  items: UserMenuItem[];
}

export const userMenuSections: UserMenuSection[] = [
  {
    category: "Vue d'ensemble",
    items: [
      { icon: LayoutDashboard, label: 'Tableau de bord', value: 'dashboard', keywords: ['accueil', 'résumé', 'synthèse'] },
    ],
  },
  {
    category: 'Mes biens',
    items: [
      { icon: FileText, label: 'Contributions CCC', value: 'contributions', keywords: ['parcelle', 'données', 'ccc'] },
      { icon: Home, label: 'Locations', value: 'rentals', keywords: ['loyer', 'locaux', 'occupation'] },
      { icon: Megaphone, label: 'Annonces', value: 'listings', keywords: ['publication', 'vente', 'location'] },
      { icon: WalletCards, label: 'Valeur & expertise', value: 'market-value', keywords: ['prix', 'estimation', 'rapport'] },
    ],
  },
  {
    category: 'Démarches',
    items: [
      { icon: ScrollText, label: 'Titres fonciers', value: 'titles', keywords: ['titre', 'propriété'] },
      { icon: Building, label: 'Autorisations de bâtir', value: 'permits', keywords: ['construction', 'bâtir'] },
      { icon: FileSearch, label: 'Expertises', value: 'expertise', keywords: ['évaluation', 'expert'] },
      { icon: FileEdit, label: 'Mutations', value: 'mutations', keywords: ['transfert', 'cession'] },
      { icon: Landmark, label: 'Hypothèques', value: 'mortgages', keywords: ['banque', 'garantie'] },
      { icon: LayoutGrid, label: 'Lotissements', value: 'subdivisions', keywords: ['lots', 'division'] },
      { icon: Scale, label: 'Litiges', value: 'disputes', keywords: ['conflit', 'contestation'] },
    ],
  },
  {
    category: 'Finances',
    items: [
      { icon: CreditCard, label: 'Factures', value: 'invoices', keywords: ['paiement', 'codes ccc', 'reçu'] },
      { icon: Receipt, label: 'Fiscalité déclarée', value: 'taxes', keywords: ['impôt', 'taxe', 'obligations'] },
    ],
  },
  {
    category: 'Mon compte',
    items: [
      { icon: User, label: 'Profil', value: 'profile', keywords: ['identité', 'avatar', 'organisation'] },
      { icon: SlidersHorizontal, label: 'Préférences', value: 'preferences', keywords: ['langue', 'notifications'] },
      { icon: Shield, label: 'Sécurité', value: 'security', keywords: ['mot de passe', 'protection'] },
      { icon: Settings, label: 'Mes données', value: 'data', keywords: ['export', 'suppression', 'confidentialité'] },
    ],
  },
];

export const USER_TAB_ALIASES: Record<string, string> = {
  settings: 'preferences',
  'building-permits': 'permits',
  'land-titles': 'titles',
};

export const USER_TAB_VALUES = new Set(userMenuSections.flatMap(section => section.items.map(item => item.value)));

export const getUserTabLabel = (value: string) =>
  userMenuSections.flatMap(section => section.items).find(item => item.value === value)?.label ?? 'Tableau de bord';

export const getUserTabCategory = (value: string) =>
  userMenuSections.find(section => section.items.some(item => item.value === value))?.category ?? "Vue d'ensemble";
