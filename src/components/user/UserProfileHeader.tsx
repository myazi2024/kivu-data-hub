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
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar className="h-20 w-20 ring-2 ring-primary/10">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {getInitials(profile?.full_name || user?.email)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {profile?.full_name || 'Utilisateur'}
              </h2>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mt-2">
                {profile?.role && getRoleBadge(profile.role)}
              </div>
            </div>
            
            <div className="space-y-1.5 text-sm">
              {user?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
              {profile?.organization && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{profile.organization}</span>
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
