import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import territorialMapIllustration from '@/assets/territorial-map-illustration.webp';
import { Target, Briefcase, Layers, ShieldCheck } from 'lucide-react';
import { useAppAppearance } from '@/hooks/useAppAppearance';

const About = () => {
  const { config } = useAppAppearance();

  return (
    <>
      <Helmet>
        <title>À propos | BIC - Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Découvrez le BIC, plateforme numérique dédiée à la transparence et l'accessibilité des données foncières en République Démocratique du Congo." />
      </Helmet>
      <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-4xl font-bold text-foreground">À propos du BIC</h1>
            {config.logo_url && (
              <img 
                src={config.logo_url} 
                alt="Logo" 
                className="h-16 w-auto object-contain opacity-90 -mr-2"
              />
            )}
          </div>

          {/* Qui sommes-nous */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-primary" />
              Qui sommes-nous ?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Le Bureau d'Informations Cadastrales (BIC) est une plateforme numérique dédiée à la transparence et à l'accessibilité des données foncières en République Démocratique du Congo. Basé à Goma, dans la province du Nord-Kivu, le BIC est né du constat que l'information cadastrale en RDC demeure largement fragmentée, dispersée entre différentes administrations et souvent inaccessible aux citoyens.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Dans un contexte où l'insécurité foncière constitue l'une des principales sources de conflits sociaux et un frein majeur à l'investissement, le BIC ambitionne de devenir un point d'accès unique, fiable et structuré aux informations relatives aux parcelles, aux titres de propriété et aux transactions foncières sur l'ensemble du territoire national.
            </p>
            <figure>
              <img
                src={territorialMapIllustration}
                alt="Illustration de carte territoriale et données urbaines en RDC"
                loading="lazy"
                decoding="async"
                className="w-full rounded-lg shadow"
              />
            </figure>
          </section>

          {/* Notre mission */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Notre mission
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              La mission du BIC est de rendre l'information cadastrale accessible, fiable et vérifiable pour l'ensemble des acteurs du secteur foncier : citoyens propriétaires ou acquéreurs, professionnels du droit et du notariat, institutions publiques, organisations de la société civile et investisseurs nationaux et internationaux.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              En centralisant et en structurant les données foncières, le BIC contribue directement à la réduction des litiges fonciers, à la sécurisation des droits de propriété et à l'amélioration de la gouvernance foncière. Notre approche repose sur la conviction que la transparence de l'information constitue le premier levier de prévention des conflits liés à la terre.
            </p>
          </section>

          {/* Ce que nous faisons */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary" />
              Ce que nous faisons
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              La plateforme BIC offre une gamme complète de services numériques conçus pour couvrir les principaux besoins en matière d'information et de procédures cadastrales :
            </p>
            <ul className="space-y-3 text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Recherche cadastrale en ligne</strong> — Interrogez notre base de données par numéro de parcelle pour obtenir les informations disponibles : localisation, superficie, type de titre, propriétaire déclaré, usage et historique.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Carte interactive</strong> — Visualisez les parcelles géolocalisées sur une carte dynamique intégrant les données OpenStreetMap et Mapbox, avec superposition des limites administratives et des zones de densité cadastrale.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Demande de titre foncier</strong> — Soumettez une demande de titre foncier initial ou de renouvellement directement en ligne, avec calcul automatique des frais et suivi de l'avancement de votre dossier.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Expertise immobilière</strong> — Demandez une expertise officielle pour évaluer la valeur marchande d'un bien immobilier, étape indispensable dans les procédures de mutation, de crédit hypothécaire ou de succession.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Demande de mutation</strong> — Initiez une procédure de transfert de propriété foncière (vente, donation, succession) avec génération des pièces requises et estimation des frais de mutation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Vérification d'hypothèque</strong> — Vérifiez si une parcelle est grevée d'une hypothèque ou d'une servitude avant toute transaction, afin de sécuriser vos acquisitions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Historique fiscal</strong> — Consultez l'historique des taxes foncières et des obligations fiscales associées à une parcelle, incluant les paiements effectués et les arriérés éventuels.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Suivi des litiges fonciers</strong> — Déclarez et suivez les litiges fonciers (conflits de limites, double attribution, contestation de propriété) avec un système de référencement structuré.</span>
              </li>
            </ul>
          </section>

          {/* Notre méthode */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Notre méthode</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              La fiabilité des données constitue le fondement de notre démarche. Pour produire des diagnostics cadastraux complets et vérifiables, le BIC s'appuie sur une méthodologie rigoureuse articulée autour de cinq piliers :
            </p>
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">1. Collecte et numérisation des archives cadastrales</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Les données existantes auprès des conservations foncières, des bureaux du cadastre et des services des titres immobiliers sont collectées, numérisées et structurées dans une base de données unifiée. Ce travail de fond permet de reconstituer l'historique foncier de chaque parcelle référencée.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">2. Enquêtes terrain et remontées communautaires</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Des agents de terrain complètent les données numériques par des vérifications in situ : identification des bornes, relevés GPS, entretiens avec les propriétaires et les riverains. Les contributions communautaires permettent d'enrichir et de corriger les informations en continu.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">3. Cartographie interactive et imagerie satellite</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Les parcelles sont géolocalisées et superposées sur des fonds de carte OpenStreetMap et Mapbox. L'imagerie satellite permet de vérifier la cohérence entre les données déclarées et la réalité physique du terrain (occupation du sol, constructions, limites visibles).
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">4. Modélisation statistique et croisement de sources</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Les données collectées sont croisées entre plusieurs sources pour détecter les incohérences, les doublons ou les cas suspects de fraude (double attribution, superficie déclarée aberrante). Des indicateurs statistiques par province et par commune permettent de mesurer la couverture cadastrale et l'intensité des litiges.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">5. Vérification juridique</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Chaque donnée relative aux titres de propriété, aux hypothèques et aux mutations fait l'objet d'une vérification juridique : conformité du titre, validité des actes de transfert, existence de charges ou de servitudes. Cette étape garantit la fiabilité des informations mises à disposition des utilisateurs.
                </p>
              </div>
            </div>
          </section>

          {/* Notre engagement */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Notre engagement
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Le BIC s'engage à maintenir une stricte neutralité dans le traitement et la diffusion des données cadastrales. Nous ne représentons aucune partie dans les transactions foncières et n'émettons aucun avis juridique. Notre rôle est de fournir une information factuelle, structurée et vérifiable.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              La protection des données personnelles des utilisateurs constitue une priorité. Les informations sensibles sont traitées conformément aux principes de confidentialité et ne sont accessibles qu'aux personnes autorisées. Les systèmes de vérification et de détection de fraude intégrés à la plateforme visent à préserver l'intégrité de la base de données.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Enfin, le BIC s'engage en faveur de l'accessibilité numérique : la plateforme est conçue pour être utilisable sur tout type d'appareil, y compris les smartphones, afin de toucher le plus grand nombre d'utilisateurs à travers le territoire congolais.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default About;
