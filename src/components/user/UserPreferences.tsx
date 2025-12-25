import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, Bell, Mail, Shield, Loader2 } from 'lucide-react';
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
  const [exporting, setExporting] = useState(false);

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
        description: 'Impossible de mettre à jour',
        variant: 'destructive'
      });
    } else {
      setPreferences(prev => ({ ...prev, [key]: value }));
      toast({
        title: 'Préférence mise à jour'
      });
    }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const { data, error } = await supabase.rpc('export_user_data', {
        target_user_id: user.id
      });

      if (error) throw error;

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
        description: error.message || 'Impossible d\'exporter',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.auth.signOut();
      
      toast({
        title: 'Compte supprimé'
      });

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Notifications */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Notifications</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Notifications email</p>
                  <p className="text-[10px] text-muted-foreground">Mises à jour importantes</p>
                </div>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">Emails marketing</p>
                  <p className="text-[10px] text-muted-foreground">Offres et nouveautés</p>
                </div>
              </div>
              <Switch
                checked={preferences.marketing_emails}
                onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confidentialité */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Confidentialité</h3>
          </div>
          
          <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-xl">
            <div>
              <p className="text-xs font-medium">Partage de données</p>
              <p className="text-[10px] text-muted-foreground">Analyse anonyme</p>
            </div>
            <Switch
              checked={preferences.data_sharing_consent}
              onCheckedChange={(checked) => updatePreference('data_sharing_consent', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Données RGPD */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">Mes données (RGPD)</h3>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={exportData} 
              variant="outline" 
              size="sm" 
              className="w-full justify-start gap-2 h-9 rounded-xl text-xs"
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Exporter mes données
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full justify-start gap-2 h-9 rounded-xl text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[340px] rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">Supprimer le compte ?</AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    Cette action est irréversible. Toutes vos données seront supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="text-xs h-8">Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount} className="bg-destructive text-xs h-8">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};