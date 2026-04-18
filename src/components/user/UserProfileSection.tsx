import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Mail, Building2, Upload, Loader2, Edit2, Check, X,
  FileText, CreditCard, Award, Building, Share2, Copy, HelpCircle,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABELS, ROLE_HIERARCHY, type AppRole } from '@/constants/roles';
import { useUserDashboardStats } from '@/hooks/useUserDashboardStats';
import { trackEvent } from '@/lib/analytics';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const UserProfileSection: React.FC = () => {
  const { user, profile, refreshProfile, resendConfirmationEmail } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [organization, setOrganization] = useState(profile?.organization || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const { data: stats } = useUserDashboardStats();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setOrganization(profile.organization || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  /**
   * Returns a Badge for any of the 9 official roles defined in
   * `src/constants/roles.ts` — covers super_admin, admin, expert_immobilier,
   * mortgage_officer, notaire, geometre, urbaniste, partner, user.
   */
  const getRoleBadge = (role?: string) => {
    const known = (ROLE_HIERARCHY as readonly string[]).includes(role || '');
    const label = known ? ROLE_LABELS[role!] : 'Utilisateur';
    const variant: 'destructive' | 'default' | 'secondary' | 'outline' =
      role === 'super_admin' || role === 'admin' ? 'destructive' :
      role === 'partner' ? 'secondary' :
      known && role !== 'user' ? 'default' : 'outline';
    return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{label}</Badge>;
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, organization, avatar_url: avatarUrl })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profil mis à jour', description: 'Vos informations ont été enregistrées.' });
      trackEvent('user_profile_update');
      setIsEditing(false);
      await refreshProfile();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Client-side MIME + size validation
    if (!ALLOWED_AVATAR_MIME.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Format non supporté', description: 'PNG, JPEG, WEBP ou GIF uniquement.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ variant: 'destructive', title: 'Fichier trop volumineux', description: 'Maximum 2 MB.' });
      return;
    }

    setLoading(true);
    try {
      // Use crypto.randomUUID per file-storage-naming-standard memory.
      const fileExt = (file.name.split('.').pop() || 'png').toLowerCase();
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setAvatarUrl(publicUrl);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      toast({ title: 'Avatar mis à jour' });
      await refreshProfile();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
    } finally {
      setLoading(false);
      // Allow re-uploading the same file
      e.target.value = '';
    }
  };

  const handleResendConfirmationEmail = async () => {
    setResendingEmail(true);
    const success = await resendConfirmationEmail();
    setResendingEmail(false);

    if (success) {
      toast({ title: 'Email envoyé', description: 'Un email de confirmation a été envoyé.' });
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible d'envoyer l'email de confirmation." });
    }
  };

  const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Lien copié', description: 'Lien de parrainage copié.' });
    trackEvent('user_referral_link_copy');
  };

  // FIX: Boolean(...) — `!== null` is always true when undefined.
  const isEmailConfirmed = Boolean(user?.email_confirmed_at);

  const statItems = [
    { title: 'Contributions', value: stats?.contributions_total ?? 0, icon: FileText },
    { title: 'Titres', value: stats?.titles_total ?? 0, icon: Award },
    { title: 'Factures', value: stats?.invoices_total ?? 0, icon: CreditCard },
    { title: 'Litiges', value: stats?.disputes_total ?? 0, icon: Building },
  ];

  return (
    <div className="space-y-4">
      {/* Profil Header + Edit */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl || profile?.avatar_url || undefined} alt={fullName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {getInitials(fullName || profile?.full_name || user?.email)}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 cursor-pointer" aria-label="Changer l'avatar">
                <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <Upload className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              </Label>
              <Input
                id="avatar-upload"
                type="file"
                accept={ALLOWED_AVATAR_MIME.join(',')}
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={loading}
              />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" className="h-8 text-sm rounded-xl" disabled={loading} />
                  <Input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Organisation" className="h-8 text-sm rounded-xl" disabled={loading} />
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={handleSaveProfile} disabled={loading} className="h-7 text-xs px-2 rounded-lg">
                      {loading ? <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : <Check className="h-3 w-3 mr-1" />}
                      Sauver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 text-xs px-2 rounded-lg" aria-label="Annuler">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold truncate">{profile?.full_name || 'Utilisateur'}</h2>
                    {profile?.role && getRoleBadge(profile.role as AppRole)}
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-6 w-6 p-0 ml-auto" aria-label="Modifier le profil">
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{user?.email}</span>
                      {isEmailConfirmed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" aria-label="Email vérifié" />
                      ) : (
                        <button
                          onClick={handleResendConfirmationEmail}
                          disabled={resendingEmail}
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline disabled:opacity-50"
                        >
                          <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                          {resendingEmail ? 'Envoi...' : 'Vérifier'}
                        </button>
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-background rounded-2xl shadow-sm border text-center p-3">
              <div className="flex justify-center mb-1">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              <p className="text-[9px] text-muted-foreground">{item.title}</p>
            </div>
          );
        })}
      </div>

      {/* Actions rapides */}
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Actions rapides</h3>
        </div>

        <div className="p-3 space-y-2">
          <div className="p-2.5 bg-muted/30 rounded-xl">
            <p className="text-xs font-medium mb-2">Lien de parrainage</p>
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[9px] bg-background p-1.5 rounded-lg truncate border">
                {referralLink}
              </code>
              <Button size="sm" variant="outline" onClick={handleCopyReferralLink} className="h-7 w-7 p-0 shrink-0 rounded-lg" aria-label="Copier le lien de parrainage">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <Link to="/partnership" className="block">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 h-9 rounded-xl text-xs">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Contacter le support</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSection;
