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
import { AnalyticsAccessProvider, useMyAnalyticsAccess } from "@/hooks/useAnalyticsAccess";
import { ShoppingBag } from "lucide-react";
import AnalyticsCatalogDialog from "@/components/analytics/catalog/AnalyticsCatalogDialog";

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
  <img src={src} alt="Aperçu des Données foncières" loading="lazy" className="h-full min-h-0 w-full rounded-lg object-contain" />
);

export const LandDataAccessDenied = () => {
  const { config } = useAppAppearance();
  const desktop = config.land_data_preview_desktop_url?.trim();
  const mobile = config.land_data_preview_mobile_url?.trim();
  return (
  <div className="land-data-discovery h-dvh bg-background flex flex-col">
    <Helmet>
      <title>Découvrez les Données foncières | BIC</title>
      <meta name="description" content="Explorez les territoires et les tendances foncières de la RDC avec BIC. Demandez un accès adapté à votre profil et à votre activité." />
    </Helmet>
    <Navigation />
    <main className="land-data-discovery-main flex min-h-0 flex-1 flex-col gap-3 mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
      <section aria-labelledby="land-data-heading" className="land-data-intro mx-auto w-full max-w-3xl shrink-0 text-center">
        <h1 id="land-data-heading" className="text-2xl font-bold text-foreground sm:text-3xl">
          Données foncières
        </h1>
        <p className="land-data-tagline mt-1 text-base font-medium text-primary sm:text-xl">
          Une nouvelle perspective sur le foncier en RDC.
        </p>
        <p className="land-data-description mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Explorez la carte, comparez les territoires et appuyez vos analyses sur les données disponibles du cadastre numérique.
        </p>
        <AnalyticsCatalogDialog trigger={<Button size="lg" className="land-data-access-button mt-3 min-h-11 w-full sm:w-auto">
            Demander l’accès
            <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />
        </Button>} />
        <p className="land-data-payment-note mx-auto mt-2 max-w-lg text-xs leading-relaxed text-muted-foreground">
          Choisissez les visuels qui vous intéressent et ne payez que ce dont vous avez besoin.
        </p>
      </section>

      <section aria-label="Aperçu des Données foncières" className="land-data-preview flex min-h-0 flex-1">
        <div data-preview="desktop" className={`hidden h-full min-h-0 w-full items-center justify-center rounded-lg md:flex ${desktop ? '' : 'border border-dashed border-border bg-muted/40 p-3'}`}>
          {desktop ? <PreviewImage src={desktop} /> : <PreviewPlaceholder />}
        </div>
        <div data-preview="mobile" className={`mx-auto flex h-full min-h-0 w-full max-w-sm items-center justify-center rounded-lg md:hidden ${mobile ? '' : 'border border-dashed border-border bg-muted/40 p-3'}`}>
          {mobile ? <PreviewImage src={mobile} /> : <PreviewPlaceholder />}
        </div>
      </section>

      <ul className="land-data-benefits grid shrink-0 grid-cols-3 gap-2 border-y border-border py-2 sm:gap-4">
        {benefits.map(({ icon: Icon, text }) => (
          <li key={text} className="flex min-w-0 flex-col items-center gap-1 text-center sm:flex-row sm:justify-center sm:gap-2">
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-xs font-medium text-foreground">{text}</span>
          </li>
        ))}
      </ul>

      <div className="land-data-return shrink-0 text-center">
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
    return <PurchasedAccessGate>{children}</PurchasedAccessGate>;
  }

  return <>{children}</>;
};

/** Profil non habilité : entre seulement avec au moins un visuel acheté et valide. */
const PurchasedAccessGate = ({ children }: { children: ReactNode }) => {
  const { allowed, isLoading } = useMyAnalyticsAccess();
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LoadingIndicator />
      </div>
    );
  }
  if (allowed.size === 0) return <LandDataAccessDenied />;
  return (
    <AnalyticsAccessProvider value={{ restricted: true, allowed }}>
      {children}
      <FloatingAnalyticsShopButton />
    </AnalyticsAccessProvider>
  );
};

export default LandDataAccessGate;
