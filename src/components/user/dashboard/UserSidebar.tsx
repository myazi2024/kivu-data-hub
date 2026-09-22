import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { userMenuSections } from './userDashboardConfig';

interface UserSidebarProps {
  activeTab: string;
  onNavigate?: () => void;
}

export function UserSidebar({ activeTab, onNavigate }: UserSidebarProps) {
  const [search, setSearch] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(userMenuSections.map(section => [section.category, true])),
  );

  const sections = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('fr');
    if (!needle) return userMenuSections;
    return userMenuSections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLocaleLowerCase('fr').includes(needle)
          || item.keywords.some(keyword => keyword.includes(needle)),
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Link to="/" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <p className="text-sm font-bold">BIC</p>
          <p className="text-[10px] text-muted-foreground">Espace utilisateur</p>
        </Link>
      </div>

      <div className="px-3 pb-1 pt-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Rechercher une rubrique..."
            className="h-8 pl-7 pr-7 text-xs"
            aria-label="Rechercher dans mon espace"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1.5 px-3" aria-label="Navigation de mon espace">
          {sections.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">Aucune rubrique trouvée</p>
          )}
          {sections.map(section => {
            const isOpen = Boolean(search) || openSections[section.category];
            return (
              <Collapsible
                key={section.category}
                open={isOpen}
                onOpenChange={() => !search && setOpenSections(current => ({
                  ...current,
                  [section.category]: !current[section.category],
                }))}
              >
                <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-accent/50">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{section.category}</span>
                  <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-0.5 space-y-1">
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = item.value === activeTab;
                    return (
                      <Link
                        key={item.value}
                        to={item.value === 'dashboard' ? '/mon-compte' : `/mon-compte?tab=${item.value}`}
                        onClick={onNavigate}
                        className={cn(
                          'flex min-h-9 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                          active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}
