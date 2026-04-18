import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import HeroSection from '@/components/HeroSection';
import PartnersSection from '@/components/PartnersSection';
import Footer from '@/components/Footer';
import { useAppAppearance } from '@/hooks/useAppAppearance';

const SITE_URL = 'https://bic.cd';

const Index = () => {
  const { config } = useAppAppearance();
  const ogImage = config.hero_image_url || `${SITE_URL}/og-image.png`;
  const appName = config.app_name || 'BIC';

  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: "Bureau d'Informations Cadastrales",
    alternateName: appName,
    url: SITE_URL,
    logo: config.logo_url || `${SITE_URL}/favicon.ico`,
    description:
      "Plateforme numérique de gestion foncière et cadastrale en République Démocratique du Congo.",
    areaServed: 'CD',
  };

  return (
    <>
      <Helmet>
        <title>BIC - Bureau d'Informations Cadastrales | Données foncières en RDC</title>
        <meta
          name="description"
          content="Accédez aux informations cadastrales de la RDC : recherche de parcelles, titres fonciers, carte interactive et services fonciers numériques."
        />
        <link rel="canonical" href={SITE_URL} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bureau d'Informations Cadastrales" />
        <meta property="og:title" content="BIC - Bureau d'Informations Cadastrales" />
        <meta
          property="og:description"
          content="Données foncières et cadastrales de la RDC : recherche, carte interactive et services numériques."
        />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content="fr_FR" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BIC - Bureau d'Informations Cadastrales" />
        <meta
          name="twitter:description"
          content="Données foncières et cadastrales de la RDC : recherche, carte interactive et services numériques."
        />
        <meta name="twitter:image" content={ogImage} />

        {/* JSON-LD Organization */}
        <script type="application/ld+json">{JSON.stringify(orgJsonLd)}</script>
      </Helmet>
      <div className="min-h-dvh">
        <Navigation />
        <HeroSection />
        <PartnersSection />
        <Footer />
      </div>
    </>
  );
};

export default Index;
