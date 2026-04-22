import { Link, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Search as SearchIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  menuItems,
  getTabLabel,
  getTabCategory,
  type AdminBadgeKey,
  type AdminMenuSection,
} from './sidebarConfig';
import type { AdminPendingCounts } from '@/hooks/useAdminPendingCounts';

export { menuItems, getTabLabel, getTabCategory };

interface AdminSidebarProps {
  counts: AdminPendingCounts;
  onNavigate?: () => void;
  /** Optional permission gate. Items returning false are hidden. */
  canAccessTab?: (tab: string) => boolean;
}

const badgeFromCounts = (badge: AdminBadgeKey, c: AdminPendingCounts): number => {
  switch (badge) {
    case 'pending': return c.contributions;
    case 'landTitle': return c.land_titles;
    case 'permits': return c.permits;
    case 'mutations': return c.mutations;
    case 'expertise': return c.expertise;
    case 'subdivisions': return c.subdivisions;
    case 'payments': return c.payments;
    case 'disputes': return c.disputes;
    case 'mortgages': return c.mortgages;
    default: return 0;
  }
};

const matchesQuery = (
  section: AdminMenuSection,
  q: string,
): AdminMenuSection | null => {
  if (!q) return section;
  const needle = q.toLowerCase().trim();
  if (section.category.toLowerCase().includes(needle)) return section;
  const items = section.items.filter(item =>
    item.label.toLowerCase().includes(needle) ||
    item.keywords.some(k => k.toLowerCase().includes(needle))
  );
  return items.length ? { ...section, items } : null;
};

export function AdminSidebar({ counts, onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(
    () => menuItems.map(s => matchesQuery(s, search)).filter(Boolean) as AdminMenuSection[],
    [search]
  );

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

  const handleClick = () => onNavigate?.();

  const getSectionBadgeTotal = (section: AdminMenuSection) =>
    section.items.reduce((total, item) => total + badgeFromCounts(item.badge, counts), 0);

  // When searching, all visible sections are forced open
  const isSectionOpen = (originalIdx: number) =>
    !!search || (openSections[originalIdx] ?? false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 md:px-3 pt-2 pb-1">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un onglet..."
            className="h-8 pl-7 pr-7 text-xs"
            aria-label="Rechercher un onglet admin"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearch('')}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
              aria-label="Effacer la recherche"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        <div className="space-y-1 md:space-y-1.5 px-2 md:px-3">
          {filteredSections.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 text-center">
              Aucun résultat pour « {search} »
            </p>
          )}

          {filteredSections.map((section) => {
            const originalIdx = menuItems.findIndex(s => s.category === section.category);
            const isOpen = isSectionOpen(originalIdx);
            const sectionBadgeTotal = getSectionBadgeTotal(section);

            return (
              <Collapsible
                key={section.category}
                open={isOpen}
                onOpenChange={() => !search && toggleSection(originalIdx)}
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
                      'h-3 w-3 text-muted-foreground transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-0.5 md:space-y-1 mt-0.5">
                  {section.items.map((item) => {
                    const isActive = currentTab === item.value;
                    const Icon = item.icon;
                    const badgeCount = badgeFromCounts(item.badge, counts);
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
    </div>
  );
}
