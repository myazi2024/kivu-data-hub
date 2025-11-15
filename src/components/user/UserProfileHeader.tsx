import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { User, Mail, Building2, Shield } from 'lucide-react';

const UserProfileHeader: React.FC = () => {
  const { user, profile } = useAuth();

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary">Administrateur</Badge>;
      case 'partner':
        return <Badge variant="secondary">Revendeur</Badge>;
      default:
        return <Badge variant="outline">Utilisateur</Badge>;
    }
  };

  return (
    <Card className="border-none shadow-sm bg-gradient-to-br from-background to-muted/20">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 md:gap-4">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 ring-primary/10 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-base md:text-lg font-semibold">
              {getInitials(profile?.full_name || user?.email)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center sm:text-left space-y-2 md:space-y-3 min-w-0">
            <div>
              <h2 className="text-lg md:text-2xl font-bold tracking-tight truncate">
                {profile?.full_name || 'Utilisateur'}
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mt-1.5 md:mt-2">
                {profile?.role && getRoleBadge(profile.role)}
              </div>
            </div>
            
            <div className="space-y-1 md:space-y-1.5 text-xs md:text-sm">
              {user?.email && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
              )}
              {profile?.organization && (
                <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span className="truncate">{profile.organization}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileHeader;
