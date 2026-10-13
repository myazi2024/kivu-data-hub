import { ReactNode } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Map, BarChart3, Share2, Image, ArrowLeft } from "lucide-react";
import { LAND_DATA_ROLES } from "@/constants/roles";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/ui/navigation";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { useAppAppearance } from "@/hooks/useAppAppearance";

interface LandDataAccessGateProps {
  children: ReactNode;
}

const benefits = [
  { icon: Map, text: "Visualisez les territoires" },
  { icon: BarChart3, text: "Analysez les tendances foncières" },
  { icon: Share2, text: "Partagez vos analyses" },
];

const PreviewPlaceholder = () => (
  <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
    <Image aria-hidden="true" className="h-9 w-9 opacity-60" />
    <p className="text-sm font-medium">Aperçu des Données foncières</p>
  </div>
);

const PreviewImage = ({ src }: { src: string }) => (
  <img src={src} alt="Aperçu des Données foncières" loading="lazy" className="h-full w-full rounded-lg object-contain" />
);

const LandDataAccessDenied = () => {
  const { config } = useAppAppearance();
  const desktop = config.land_data_preview_desktop_url?.trim();
  const mobile = config.land_data_preview_mobile_url?.trim();
  return (
  <div className="min-h-dvh bg-background flex flex-col">
    <Helmet>
      <title>Découvrez les Données foncières | BIC</title>
      <meta name="description" content="Explorez les territoires et les tendances foncières de la RDC avec BIC. Demandez un accès adapté à votre profil et à votre activité." />
    </Helmet>
    <Navigation />
    <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section aria-labelledby="land-data-heading" className="mx-auto max-w-3xl text-center">
        <h1 id="land-data-heading" className="text-3xl font-bold text-foreground sm:text-4xl">
          Données foncières
        </h1>
        <p className="mt-3 text-xl font-medium text-primary sm:text-2xl">
          Une nouvelle perspective sur le foncier en RDC.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Explorez la carte, comparez les territoires et appuyez vos analyses sur les données disponibles du cadastre numérique.
        </p>
        <Button asChild size="lg" className="mt-6 min-h-11 w-full sm:w-auto">
          <Link to="/partnership">
            Demander l’accès
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
          </Link>
        </Button>
        <p className="mx-auto mt-3 max-w-lg text-xs leading-relaxed text-muted-foreground">
          L’accès est accordé après examen de votre demande, selon votre profil et votre activité.
        </p>
      </section>

      <section aria-label="Aperçu des Données foncières" className="mt-8 sm:mt-10">
        <div data-preview="desktop" className={`hidden aspect-video items-center justify-center rounded-lg md:flex ${desktop ? '' : 'border border-dashed border-border bg-muted/40 p-6'}`}>
          {desktop ? <PreviewImage src={desktop} /> : <PreviewPlaceholder />}
        </div>
        <div data-preview="mobile" className={`mx-auto flex aspect-[3/4] w-full max-w-sm items-center justify-center rounded-lg md:hidden ${mobile ? '' : 'border border-dashed border-border bg-muted/40 p-6'}`}>
          {mobile ? <PreviewImage src={mobile} /> : <PreviewPlaceholder />}
        </div>
      </section>

      <ul className="mt-8 grid gap-5 border-y border-border py-6 sm:grid-cols-3 sm:gap-6">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="flex min-w-0 items-center gap-3 sm:flex-col sm:text-center">
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 text-center">
        <Button asChild variant="ghost" size="sm" className="min-h-11 text-muted-foreground">
          <Link to="/">
            <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Link>
        </Button>
      </div>
    </main>
  </div>
  );
};

const LandDataAccessGate = ({ children }: LandDataAccessGateProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingIndicator />
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
        <LoadingIndicator />
      </div>
    );
  }

  if (!LAND_DATA_ROLES.includes(profile.role)) {
    return <LandDataAccessDenied />;
  }

  return <>{children}</>;
};

export default LandDataAccessGate;
