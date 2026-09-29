import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin, Map, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroSkyline from '@/assets/hero-skyline.webp';
import TypewriterAnimation from '@/components/TypewriterAnimation';
import { useCatalogConfig } from '@/hooks/useCatalogConfig';
import { useAppAppearance } from '@/hooks/useAppAppearance';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import HomeProvinceMap from '@/components/home/HomeProvinceMap';
import HomeBicIndicators from '@/components/home/HomeBicIndicators';

const HeroSection = () => {
  const { config: catalogConfig } = useCatalogConfig();
  const { config: appearanceConfig } = useAppAppearance();
  const { user } = useAuth();
  const provinces = catalogConfig.available_provinces || [];

  const heroImage = appearanceConfig.hero_image_url || heroSkyline;
  const heroTitle = appearanceConfig.hero_title || 'Explorez le cadastre numérique de la RDC.';
  const overlayOpacity = appearanceConfig.hero_overlay_opacity ?? 80;

  // CTA #1 — Cadastre numérique : protégé. Si non connecté, on passe par /auth?redirect=
  const cadastreTarget = user ? '/cadastral-map' : '/auth?redirect=/cadastral-map';

  // Lien texte secondaire (configurable, fallback Articles)
  const secondaryLabel = appearanceConfig.hero_secondary_link_label || 'Lire nos analyses';
  const secondaryHref = appearanceConfig.hero_secondary_link_href || '/articles';

  return (
    <>
      <Helmet>
        <link rel="preload" as="image" href={heroImage} />
      </Helmet>

      <section className="relative isolate overflow-hidden py-3 sm:py-6 lg:py-4 lg:flex-1 lg:flex lg:items-center">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="eager"
            decoding="async"
            // @ts-expect-error fetchpriority is valid HTML attr
            fetchpriority="high"
          />
          <div
            className="absolute inset-0 bg-primary"
            style={{ opacity: overlayOpacity / 100 }}
          />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 grid gap-3 md:gap-8 lg:gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center text-primary-foreground">
          <div className="min-w-0 lg:pl-2 order-last md:order-last">
            <h1 className="text-3xl sm:text-4xl lg:text-4xl font-bold leading-tight max-w-xl">{heroTitle}</h1>
            <div className="mt-2 sm:mt-4 lg:mt-1 max-w-xl text-left [&>div]:justify-start [&_p]:!mx-0 [&_p]:!px-0 [&_p]:!text-primary-foreground/90">
              <TypewriterAnimation />
            </div>
            <p className="mt-1 mb-4 sm:mb-6 lg:mb-3 text-sm sm:text-base leading-relaxed text-primary-foreground/90 max-w-lg">
              Consultez les parcelles, repérez les circonscriptions foncières et découvrez les données disponibles pour votre territoire.
            </p>
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 items-stretch">
            <Link
              to={cadastreTarget}
              className="w-full lg:w-auto"
              onClick={() => trackEvent('hero_cta_click', { id: 'cadastre', authed: !!user })}
            >
              <Button
                size="lg"
                className="w-full bg-background text-primary hover:bg-background/90 font-bold px-5 h-12 lg:h-10 text-sm sm:text-base group"
              >
                <Map className="h-5 w-5" />
                <span>Cadastre numérique</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </Link>

            <Link
              to="/map"
              className="w-full lg:w-auto"
              onClick={() => trackEvent('hero_cta_click', { id: 'donnees-foncieres' })}
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-primary/30 border border-primary-foreground/50 text-primary-foreground hover:bg-background hover:text-primary font-semibold px-5 h-12 lg:h-10 text-sm sm:text-base"
              >
                <MapPin className="h-5 w-5" />
                <span>Données foncières</span>
              </Button>
            </Link>
            </div>

            <div className="mt-4 sm:mt-6 lg:mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-primary-foreground/90">
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Circonscriptions foncières</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Services cadastraux</span>
            </div>
            <div className="mt-4 sm:mt-6 lg:mt-2">
            <Link
              to={secondaryHref}
              onClick={() => trackEvent('hero_cta_click', { id: 'secondary', href: secondaryHref })}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground hover:underline underline-offset-4 transition-colors"
            >
              {secondaryLabel} →
            </Link>
            </div>

            {provinces.length > 0 && (
            <div className="mt-6 lg:mt-2">
              <p className="text-xs text-primary-foreground/75 leading-relaxed break-words">
                Service disponible pour : {provinces.join(', ')}
              </p>
            </div>
            )}
          </div>
          <div className="order-first md:order-first min-w-0"><HomeProvinceMap /></div>
          <div className="md:col-span-2 order-last"><HomeBicIndicators configured={appearanceConfig} /></div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
