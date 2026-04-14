import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCookies } from '@/hooks/useCookies';
import { Cookie, Shield, BarChart, Megaphone, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const CookieBanner: React.FC = () => {
  const { 
    preferences, 
    giveConsent, 
    revokeConsent, 
    updatePreferences, 
    isConsentRequired 
  } = useCookies();

  const [showDetails, setShowDetails] = React.useState(false);
  const [localPrefs, setLocalPrefs] = React.useState(preferences);

  React.useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  if (!isConsentRequired) {
    return null;
  }

  const handleAcceptAll = () => {
    giveConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleAcceptSelected = () => {
    giveConsent(localPrefs);
  };

  const handleRejectAll = () => {
    revokeConsent();
  };

  const handlePreferenceChange = (type: string, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [type]: value }));
  };

  if (showDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Paramètres des cookies
            </CardTitle>
            <CardDescription>
              Gérez vos préférences de cookies pour une expérience personnalisée.
              {' '}
              <Link to="/legal" className="text-primary underline hover:no-underline">
                Politique de confidentialité
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cookies essentiels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <h3 className="font-medium">Cookies essentiels</h3>
                  <Badge variant="secondary">Requis</Badge>
                </div>
                <Switch checked={true} disabled />
              </div>
              <p className="text-sm text-muted-foreground">
                Ces cookies sont nécessaires au fonctionnement du site. Ils incluent l'authentification, 
                la sécurité et les préférences de base.
              </p>
            </div>

            {/* Cookies d'analyse */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium">Cookies d'analyse</h3>
                </div>
                <Switch 
                  checked={localPrefs.analytics} 
                  onCheckedChange={(value) => handlePreferenceChange('analytics', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Ces cookies nous aident à comprendre comment vous utilisez le site pour améliorer 
                votre expérience.
              </p>
            </div>

            {/* Cookies marketing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-600" />
                  <h3 className="font-medium">Cookies marketing</h3>
                </div>
                <Switch 
                  checked={localPrefs.marketing} 
                  onCheckedChange={(value) => handlePreferenceChange('marketing', value)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Ces cookies sont utilisés pour vous proposer des contenus et publicités pertinents.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAcceptSelected} className="flex-1">
                Accepter la sélection
              </Button>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md ml-auto">
      <Card className="border-border shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Cookie className="h-4 w-4" />
            Gestion des cookies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
            Vous pouvez choisir quels cookies accepter.
            {' '}
            <Link to="/legal" className="text-primary underline hover:no-underline">
              En savoir plus
            </Link>
          </p>
          
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAcceptAll} className="flex-1">
                Tout accepter
              </Button>
              <Button size="sm" variant="outline" onClick={handleRejectAll} className="flex-1">
                Refuser
              </Button>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowDetails(true)}
              className="w-full"
            >
              Personnaliser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieBanner;
