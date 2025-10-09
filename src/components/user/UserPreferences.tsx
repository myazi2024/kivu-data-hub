import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Preferences {
  email_notifications: boolean;
  marketing_emails: boolean;
  data_sharing_consent: boolean;
  language: string;
  timezone: string;
}

export const UserPreferences: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<Preferences>({
    email_notifications: true,
    marketing_emails: false,
    data_sharing_consent: false,
    language: 'fr',
    timezone: 'Africa/Lubumbashi'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching preferences:', error);
    } else if (data) {
      setPreferences(data);
    }
    setLoading(false);
  };

  const updatePreference = async (key: keyof Preferences, value: boolean | string) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        [key]: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour vos préférences',
        variant: 'destructive'
      });
    } else {
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Succès',
        description: 'Préférences mises à jour'
      });
    }
  };

  const exportData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        target_user_id: user.id
      });

      if (error) throw error;

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      toast({
        title: 'Export réussi',
        description: 'Vos données ont été téléchargées'
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'exporter vos données',
        variant: 'destructive'
      });
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      // Soft delete profile
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      // Sign out
      await supabase.auth.signOut();
      
      toast({
        title: 'Compte supprimé',
        description: 'Votre compte a été supprimé'
      });

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer votre compte',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Gérez vos préférences de notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notif" className="flex flex-col gap-1">
              <span>Notifications par email</span>
              <span className="text-sm text-muted-foreground font-normal">
                Recevez des emails pour les mises à jour importantes
              </span>
            </Label>
            <Switch
              id="email-notif"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="marketing" className="flex flex-col gap-1">
              <span>Emails marketing</span>
              <span className="text-sm text-muted-foreground font-normal">
                Recevez des offres et nouveautés
              </span>
            </Label>
            <Switch
              id="marketing"
              checked={preferences.marketing_emails}
              onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confidentialité</CardTitle>
          <CardDescription>
            Gérez vos données et votre vie privée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="data-sharing" className="flex flex-col gap-1">
              <span>Partage de données</span>
              <span className="text-sm text-muted-foreground font-normal">
                Autoriser l'analyse anonyme pour améliorer le service
              </span>
            </Label>
            <Switch
              id="data-sharing"
              checked={preferences.data_sharing_consent}
              onCheckedChange={(checked) => updatePreference('data_sharing_consent', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes données (RGPD)</CardTitle>
          <CardDescription>
            Exportez ou supprimez vos données personnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={exportData} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Exporter mes données
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer mon compte
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes vos données seront définitivement supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} className="bg-destructive">
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
