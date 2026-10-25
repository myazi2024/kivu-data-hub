import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Map as MapIcon, Layers, LayoutGrid, User, Lock, Shield, LogIn } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MediaColumn {
  title: string;
  items: { name: string; href: string; icon: React.ComponentType<{ className?: string }>; description?: string }[];
}

interface MobileBottomNavProps {
  testPrefix: string;
  landDataRestricted: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  mediaColumns: MediaColumn[];
}

/** Barre de navigation fixe en bas de l'écran, téléphones uniquement (< md). */
export function MobileBottomNav({ testPrefix, landDataRestricted, isLoggedIn, isAdmin, mediaColumns }: MobileBottomNavProps) {
  const { pathname } = useLocation();
  const [mediaOpen, setMediaOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, []);
  useEffect(() => setMediaOpen(false), [pathname]);

  const mediaHrefs = mediaColumns.flatMap(c => c.items.map(i => i.href));
  const accountHref = isLoggedIn ? `${testPrefix}/mon-compte` : '/auth';

  const items = [
    { key: 'home', label: 'Accueil', icon: Home, href: '/', active: pathname === '/' || pathname === '/index' },
    { key: 'data', label: 'Données', icon: Layers, href: `${testPrefix}/map`, active: pathname.endsWith('/map'), locked: landDataRestricted },
    { key: 'cadastre', label: 'Cadastre', icon: MapIcon, href: `${testPrefix}/cadastral-map`, active: pathname.endsWith('/cadastral-map') },
    { key: 'media', label: 'Médias', icon: LayoutGrid, active: mediaOpen || mediaHrefs.some(h => pathname.startsWith(h)) },
    { key: 'account', label: isLoggedIn ? 'Compte' : 'Connexion', icon: isLoggedIn ? User : LogIn, href: accountHref, active: pathname.startsWith(accountHref) || pathname === '/auth' },
  ];
  const activeIndex = Math.max(0, items.findIndex(i => i.active));
  const hasActive = items.some(i => i.active);

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="relative mx-auto grid h-16 max-w-md grid-cols-5 px-1">
          {/* Pastille animée sous l'entrée active */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1.5 h-8 w-[calc(20%-1.5rem)] rounded-full bg-primary/12 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
              hasActive ? 'opacity-100' : 'opacity-0',
            )}
            style={{ left: 'calc(0.25rem + 0.75rem)', transform: `translateX(calc(${activeIndex} * (100% + 1.5rem)))`, width: 'calc((100% - 0.5rem) / 5 - 1.5rem)' }}
          />
          {items.map(item => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="relative flex h-8 items-center justify-center">
                  <Icon className={cn('h-5 w-5 transition-transform duration-200 motion-reduce:transition-none', item.active && '-translate-y-px scale-110')} />
                  {item.locked && <Lock className="absolute -right-2.5 -top-0.5 h-2.5 w-2.5" />}
                </span>
                <span className="text-[11px] font-medium leading-none">{item.label}</span>
              </>
            );
            const cls = cn(
              'relative flex flex-col items-center justify-center gap-1 pt-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
              item.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            );
            return item.href ? (
              <Link key={item.key} to={item.href} className={cls} aria-current={item.active ? 'page' : undefined}>{content}</Link>
            ) : (
              <button key={item.key} type="button" className={cls} onClick={() => setMediaOpen(true)} aria-haspopup="dialog" aria-expanded={mediaOpen}>{content}</button>
            );
          })}
        </div>
      </nav>

      <Sheet open={mediaOpen} onOpenChange={setMediaOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>Médias & informations</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-4">
            {mediaColumns.map(column => (
              <div key={column.title}>
                <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {column.items.map(item => (
                    <Link key={item.href} to={item.href} className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                      <item.icon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {isAdmin && (
              <Link to="/admin" className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                <Shield className="h-4 w-4 text-primary" /> Administration
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
