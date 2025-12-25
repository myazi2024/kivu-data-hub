import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  User, Mail, Building2, Upload, Loader2, Edit2, Check, X, 
  FileText, CreditCard, Award, Building, Share2, Copy, HelpCircle,
  CheckCircle2, XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const UserProfileSection: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [organization, setOrganization] = useState(profile?.organization || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  
  const [stats, setStats] = useState({
    contributions: 0,
    permits: 0,
    invoices: 0,
    cccCodes: 0,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setOrganization(profile.organization || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const [contributions, permits, invoices, cccCodes] = await Promise.all([
          supabase
            .from("cadastral_contributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("cadastral_contributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("permit_request_data", "is", null),
          supabase
            .from("cadastral_invoices")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("cadastral_contributor_codes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

        setStats({
          contributions: contributions.count || 0,
          permits: permits.count || 0,
          invoices: invoices.count || 0,
          cccCodes: cccCodes.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, [user]);

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
        return <Badge className="bg-primary text-[10px] px-1.5 py-0">Admin</Badge>;
      case 'partner':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Revendeur</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Utilisateur</Badge>;
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          organization: organization,
          avatar_url: avatarUrl,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées.",
      });
      setIsEditing(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar mis à jour",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Lien copié",
      description: "Lien de parrainage copié.",
    });
  };

  const isEmailConfirmed = user?.email_confirmed_at !== null;

  const statItems = [
    { title: "Contributions", value: stats.contributions, icon: FileText },
    { title: "Permis", value: stats.permits, icon: Building },
    { title: "Factures", value: stats.invoices, icon: CreditCard },
    { title: "Codes CCC", value: stats.cccCodes, icon: Award },
  ];

  return (
    <div className="space-y-3">
      {/* Profil Header + Edit */}
      <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-gradient-to-br from-background to-muted/30">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} alt={fullName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(fullName || profile?.full_name || user?.email)}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 cursor-pointer">
                <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Upload className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={loading}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nom complet"
                    className="h-8 text-sm"
                    disabled={loading}
                  />
                  <Input
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Organisation"
                    className="h-8 text-sm"
                    disabled={loading}
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={handleSaveProfile} disabled={loading} className="h-7 text-xs px-2">
                      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                      Sauver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs px-2">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold truncate">{profile?.full_name || 'Utilisateur'}</h2>
                    {profile?.role && getRoleBadge(profile.role)}
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0 ml-auto">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user?.email}</span>
                      {isEmailConfirmed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {profile?.organization && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{profile.organization}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="grid grid-cols-4 gap-2">
            {statItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center p-2 bg-muted/30 rounded-xl">
                  <div className="flex justify-center mb-1">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-lg font-bold">{item.value}</p>
                  <p className="text-[9px] text-muted-foreground">{item.title}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions rapides */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3 space-y-2">
          {/* Parrainage */}
          <div className="p-2.5 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Share2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Lien de parrainage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[9px] bg-background p-1.5 rounded-lg truncate">
                {referralLink}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopyReferralLink} className="h-7 w-7 p-0 shrink-0">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Support */}
          <Link to="/contact" className="block">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 rounded-xl">
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Contacter le support</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileSection;