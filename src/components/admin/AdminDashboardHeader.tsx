import { Bell, Menu, Search, User, Trash2, TestTube, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useTestMode } from '@/hooks/useTestMode';
import { menuItems } from '@/components/admin/AdminSidebar';
import { useAdminGlobalSearch, getSearchHistory, addToSearchHistory, clearSearchHistory } from '@/hooks/useAdminGlobalSearch';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Settings, BarChart3, Globe, Map as MapIcon } from 'lucide-react';

interface AdminDashboardHeaderProps {
  onMenuClick: () => void;
}

export function AdminDashboardHeader({ onMenuClick }: AdminDashboardHeaderProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { testMode } = useTestMode();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const { grouped, isLoading, hasResults } = useAdminGlobalSearch(searchTerm);

  // Flatten menu items with keyword matching
  const flatItems = useMemo(() =>
    menuItems.flatMap(section =>
      section.items.map(item => ({ ...item, category: section.category }))
    ), []
  );

  // Config Graphiques internal tabs for deep-linking
  const configTabItems = useMemo(() => {
    const KEYWORDS_MAP: Record<string, string[]> = {
      '_global': ['global', 'filigrane', 'watermark', 'logo', 'opacité'],
      'rdc-map': ['carte', 'map', 'rdc', 'congo', 'géographie'],
    };
    return Object.entries(ANALYTICS_TABS_REGISTRY).map(([key, reg]) => ({
      key,
      label: reg.label,
      keywords: KEYWORDS_MAP[key] || [],
      url: `/admin?tab=analytics-charts-config&mode=charts&configTab=${key}`,
      icon: key === '_global' ? Globe : key === 'rdc-map' ? MapIcon : BarChart3,
    }));
  }, []);

  const filteredMenuItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return flatItems.filter(item =>
      item.label.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      (item.keywords && item.keywords.some((k: string) => k.toLowerCase().includes(term)))
    ).slice(0, 8);
  }, [searchTerm, flatItems]);

  const filteredConfigTabs = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return configTabItems.filter(item =>
      item.label.toLowerCase().includes(term) ||
      item.key.toLowerCase().includes(term) ||
      item.keywords.some(k => k.includes(term))
    ).slice(0, 6);
  }, [searchTerm, configTabItems]);

  // Group menu results by category
  const menuGroups = useMemo(() => {
    const groups: Record<string, typeof filteredMenuItems> = {};
    for (const item of filteredMenuItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return groups;
  }, [filteredMenuItems]);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Load history when dialog opens
  useEffect(() => {
    if (commandOpen) {
      setHistory(getSearchHistory());
      setSearchTerm('');
    }
  }, [commandOpen]);

  const handleSelect = useCallback((url: string, label?: string) => {
    if (label) addToSearchHistory(label);
    setCommandOpen(false);
    setSearchTerm('');
    navigate(url);
  }, [navigate]);

  const handleHistorySelect = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
      toast.success('Déconnexion réussie');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const resolveActionUrl = (actionUrl: string): string => {
    const routeMapping: Record<string, string> = {
      '/user-dashboard': '/mon-compte',
    };
    const [basePath, queryString] = actionUrl.split('?');
    const resolvedPath = routeMapping[basePath] || basePath;
    return queryString ? `${resolvedPath}?${queryString}` : resolvedPath;
  };

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    await markAsRead(notification.id);
    if (notification.action_url) {
      setNotificationsOpen(false);
      navigate(resolveActionUrl(notification.action_url));
    }
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-destructive';
      default: return 'bg-primary';
    }
  };

  const showHistory = !searchTerm.trim() && history.length > 0;
  const showMenuResults = Object.keys(menuGroups).length > 0;
  const showConfigResults = filteredConfigTabs.length > 0;
  const showDbResults = hasResults;
  const noResults = searchTerm.trim().length >= 2 && !showMenuResults && !showConfigResults && !showDbResults && !isLoading;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 md:h-14 items-center gap-2 md:gap-4 px-2 md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <Button
            variant="outline"
            className="relative w-full max-w-md h-8 md:h-9 justify-start text-xs md:text-sm text-muted-foreground rounded-xl px-3"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="mr-2 h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">Rechercher dans l'admin...</span>
            <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>

        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput
            placeholder="Rechercher menus, utilisateurs, parcelles, factures..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {/* Loading indicator */}
            {isLoading && searchTerm.trim().length >= 2 && (
              <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">
                Recherche en cours...
              </div>
            )}

            {/* No results */}
            {noResults && (
              <CommandEmpty>Aucun résultat pour « {searchTerm} »</CommandEmpty>
            )}

            {/* Search history */}
            {showHistory && (
              <CommandGroup heading={
                <div className="flex items-center justify-between">
                  <span>Recherches récentes</span>
                  <button
                    onClick={() => { clearSearchHistory(); setHistory([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Effacer
                  </button>
                </div>
              }>
                {history.map((term) => (
                  <CommandItem key={term} onSelect={() => handleHistorySelect(term)}>
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    {term}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Menu navigation results */}
            {showMenuResults && Object.entries(menuGroups).map(([category, items]) => (
              <CommandGroup key={category} heading={category}>
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.value}
                      onSelect={() => handleSelect(`/admin?tab=${item.value}`, item.label)}
                    >
                      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-muted-foreground">Navigation</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {/* Config Graphiques internal tabs */}
            {showConfigResults && (
              <CommandGroup heading="Config Graphiques">
                {filteredConfigTabs.map(item => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.key}
                      onSelect={() => handleSelect(item.url, `Config > ${item.label}`)}
                    >
                      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-muted-foreground">Config</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Separator between menu and DB results */}
            {(showMenuResults || showConfigResults) && showDbResults && <CommandSeparator />}

            {/* Database results */}
            {showDbResults && Object.entries(grouped).map(([type, group]) => (
              <CommandGroup key={type} heading={group.label}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      onSelect={() => handleSelect(item.url, item.label)}
                    >
                      <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{item.label}</span>
                        <span className="block text-xs text-muted-foreground truncate">{item.sublabel}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}

            {/* Show empty prompt when no search term */}
            {!searchTerm.trim() && !showHistory && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Tapez pour rechercher des menus, utilisateurs, parcelles ou factures
              </div>
            )}
          </CommandList>
        </CommandDialog>

        <div className="flex items-center gap-1 md:gap-2">
          {testMode.enabled && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-8 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
              onClick={() => navigate('/admin?tab=test-mode')}
            >
              <TestTube className="h-4 w-4" />
              <span className="hidden md:inline">Mode Test</span>
            </Button>
          )}

          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-10 md:w-10">
                <Bell className="h-4 w-4 md:h-5 md:w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 h-4 min-w-4 md:h-5 md:min-w-5 px-0.5 md:px-1 text-[10px] md:text-xs"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                  >
                    Tout marquer comme lu
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[400px]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Aucune notification
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 border-b hover:bg-accent transition-colors group relative ${
                          !notification.is_read ? 'bg-accent/50' : ''
                        }`}
                      >
                        <div
                          className="cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-2 pr-8">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getNotificationColor(notification.type)}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.created_at || new Date()).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
                <User className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/mon-compte')}>
                Mon profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const target = '/admin?tab=test-mode';
                if (window.location.pathname + window.location.search === target) {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  navigate(target);
                }
              }}>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
