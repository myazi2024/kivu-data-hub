import { ReactNode } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Lock, ShieldCheck, MapPin, FileText, Users, Scale, BarChart3, Handshake, Home, Building2, Banknote, Layers } from "lucide-react";
import { LAND_DATA_ROLES } from "@/constants/roles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/ui/navigation";

interface LandDataAccessGateProps {
  children: ReactNode;
}

const restrictedItems = [
  { icon: MapPin, text: "Parcelles cadastrales géolocalisées et leurs limites (GPS)" },
  { icon: FileText, text: "Titres fonciers, certificats d'enregistrement, contrats de location" },
  { icon: Users, text: "Identités des propriétaires et co-titulaires (PII)" },
  { icon: Banknote, text: "Hypothèques et inscriptions de garanties" },
  { icon: Scale, text: "Litiges fonciers et historiques contentieux" },
  { icon: Layers, text: "Mutations, transferts et historiques de propriété" },
  { icon: Building2, text: "Autorisations de bâtir et constructions déclarées" },
  { icon: FileText, text: "Données fiscales (impôt foncier, bâtisse, IRL)" },
  { icon: BarChart3, text: "Statistiques croisées multi-variables (genre, usage, zone, statut)" },
  { icon: MapPin, text: "Cartographie territoriale par province / territoire / commune / quartier" },
];

const grantedItems = [
  { icon: MapPin, text: "Carte interactive choroplèthe RDC (4 niveaux territoriaux)" },
  { icon: BarChart3, text: "Filtres et croisements analytiques (8 onglets)" },
  { icon: FileText, text: "Export d'images et partage des graphiques" },
  { icon: Layers, text: "Cartographie cadastrale détaillée par parcelle" },
  { icon: ShieldCheck, text: "Tableaux de bord territoriaux et indicateurs de répartition" },
  { icon: FileText, text: "Téléchargement et partage de rapports visuels" },
];

const LandDataAccessDenied = () => (
  <div className="min-h-dvh bg-background flex flex-col">
    <Helmet>
      <title>Accès restreint — Données foncières | BIC</title>
      <meta name="description" content="L'accès aux données foncières est réservé aux profils habilités. Soumettez votre demande de partenariat." />
    </Helmet>
    <Navigation />
    <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Accès réservé aux profils habilités
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Le menu <strong>Données foncières</strong> contient des informations sensibles dont l'accès est strictement encadré.
          Votre profil actuel (<Badge variant="secondary" className="mx-1">Utilisateur</Badge>) ne permet pas la consultation.
        </p>
      </div>

      {/* Bloc A — Données traitées */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">Données traitées (non accessibles)</CardTitle>
          </div>
          <CardDescription>
            Catégories d'informations cadastrales gérées dans ce module et actuellement hors de portée de votre profil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {restrictedItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-destructive/70" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* CTA Partnership */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 shrink-0">
            <Handshake className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground">Soumettez votre demande d'accès</h3>
            <p className="text-sm text-muted-foreground">
              Devenez partenaire BIC pour accéder aux données foncières correspondant à votre activité (notaire, géomètre, expert immobilier, agent hypothécaire, urbaniste, etc.).
            </p>
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to="/partnership">
              <Handshake className="h-4 w-4 mr-2" />
              Soumettre une demande de partenariat
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Bloc B — Données accessibles après validation */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Données accessibles après validation</CardTitle>
          </div>
          <CardDescription>
            Une fois votre demande approuvée, vous pourrez commencer à accéder aux fonctionnalités suivantes :
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {grantedItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                <item.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Retour accueil */}
      <div className="text-center pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </main>
  </div>
);

const LandDataAccessGate = ({ children }: LandDataAccessGateProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    localStorage.setItem('auth_redirect_url', window.location.pathname);
    return <Navigate to="/auth" replace />;
  }

  // Wait for profile to load before deciding
  if (!profile) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!LAND_DATA_ROLES.includes(profile.role)) {
    return <LandDataAccessDenied />;
  }

  return <>{children}</>;
};

export default LandDataAccessGate;
