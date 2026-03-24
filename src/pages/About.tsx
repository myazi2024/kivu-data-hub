import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import territorialMapIllustration from '@/assets/territorial-map-illustration.webp';

const About = () => {
  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-foreground mb-8">À propos du BIC</h1>
          
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Qui sommes-nous ?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Fondé par des experts en droit, données urbaines et innovation numérique, le BIC (Bureau de l'Immobilier du Congo) 
              est né pour répondre à un besoin urgent : Comprendre les réalités foncières et cadastrales à travers des données concrètes et contextualisées.
            </p>
            <figure className="mt-4">
              <img
                src={territorialMapIllustration}
                alt="Illustration de carte territoriale et données urbaines"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg shadow"
              />
            </figure>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Notre méthode</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nous combinons plusieurs sources pour produire des diagnostics complets :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Collecte numérique via l'application <strong>Myazi</strong></li>
              <li>Enquêtes terrain et remontées communautaires</li>
              <li>Imagerie satellite (OSM, Mapbox)</li>
              <li>Modélisation statistique et cartographie interactive</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;