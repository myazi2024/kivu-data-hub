import { LogOut, Menu, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/user/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

interface UserDashboardHeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function UserDashboardHeader({ title, onMenuClick }: UserDashboardHeaderProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = (profile?.full_name || user?.email || 'U')
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-12 min-w-0 items-center gap-1 px-1.5 sm:gap-2 sm:px-2 md:h-14 md:px-4">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 md:hidden" onClick={onMenuClick} aria-label="Ouvrir le menu">
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold md:text-base" title={title}>{title}</p>
          <p className="hidden text-[10px] text-muted-foreground sm:block">Gérez vos biens, démarches et documents</p>
        </div>
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full" aria-label="Menu du compte">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'Utilisateur'} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="min-w-0">
              <p className="truncate text-sm">{profile?.full_name || 'Utilisateur'}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/mon-compte?tab=profile')}>
              <User className="mr-2 h-4 w-4" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/')}>Retour au site</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
