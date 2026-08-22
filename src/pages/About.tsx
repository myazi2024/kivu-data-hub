import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import territorialMapIllustration from '@/assets/territorial-map-illustration.webp';
import { Target, Briefcase, Layers, ShieldCheck, Users } from 'lucide-react';

import { useAppAppearance } from '@/hooks/useAppAppearance';

const About = () => {
  const { config } = useAppAppearance();

  return (
    <>
      <Helmet>
        <title>À propos | BIC - Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Le BIC centralise des données foncières déclarées par les propriétaires ou leurs préposés, vérifiées administrativement, pour plus de transparence en RDC." />
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
                className="h-32 w-auto object-contain opacity-90 -mr-2"
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
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 mb-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                D'où viennent les données du BIC ?
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm mb-3">
                Les informations foncières et cadastrales publiées par le BIC sont <strong className="text-foreground">déclarées par les propriétaires eux-mêmes ou par leurs préposés dûment mandatés</strong>, au moyen d'un formulaire cadastral structuré. Chaque déclaration est ensuite soumise à des contrôles automatiques de cohérence puis à une revue administrative avant publication.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Ce modèle participatif est encadré par le{' '}
                <Link to="/about-ccc" className="text-primary underline underline-offset-2">
                  Programme Contributeur Cadastral (CCC)
                </Link>
                , qui récompense les déclarants dont les informations enrichissent la base de données. Le déclarant reste responsable de l'exactitude des informations transmises et peut demander à tout moment la correction de ses données.
              </p>
            </div>
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
              La plateforme BIC met à disposition des services numériques couvrant l'accès à l'information déclarée et l'initiation des principales procédures foncières. Les données consultables proviennent des déclarations des propriétaires ou de leurs préposés, après vérification administrative : elles ne se substituent pas aux registres officiels de l'administration foncière.
            </p>
            <ul className="space-y-3 text-muted-foreground ml-4">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Déclaration cadastrale en ligne</strong> — Déclarez votre parcelle (identification, localisation, superficie, titre, usage, construction, mise en location, obligations fiscales) et faites-la valider par nos équipes dans le cadre du Programme Contributeur Cadastral.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Recherche cadastrale en ligne</strong> — Interrogez la base par numéro de parcelle pour consulter les informations déclarées et validées : localisation, superficie, type de titre, propriétaire déclaré, usage et historique connu.</span>
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
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span><strong className="text-foreground">Autorisation de construire et lotissement</strong> — Constituez et suivez en ligne vos demandes d'autorisation de construire ou de lotissement, avec estimation des frais applicables.</span>
              </li>
            </ul>
          </section>

          {/* Notre méthode */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Notre méthode</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Le BIC ne réalise ni relevés topographiques, ni enquêtes de terrain, ni numérisation d'archives administratives. Notre démarche repose sur la déclaration encadrée et la vérification structurée de l'information transmise par les propriétaires ou leurs préposés, articulée autour de cinq étapes :
            </p>
            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">1. Déclaration par le propriétaire ou son préposé</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Le déclarant renseigne un formulaire cadastral structuré : identification de la parcelle, localisation administrative, superficie, type de titre, historique des propriétaires, construction et usage, mise en location, obligations fiscales. Il joint les pièces justificatives disponibles et positionne lui-même la parcelle sur la carte, avec un croquis des limites.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">2. Contrôles automatiques de complétude et de cohérence</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Le système applique des règles de validation à chaque champ, calcule un score de complétude du dossier et signale les incohérences : superficie incompatible avec le croquis, dates contradictoires, doublon de numéro de parcelle, pièces manquantes ou informations financières improbables.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">3. Revue administrative avant publication</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Aucune déclaration n'est publiée automatiquement. Nos équipes examinent chaque dossier, champ par champ, et décident de l'approuver, de le rejeter avec motif ou de demander une correction au déclarant. Chaque décision est tracée et notifiée.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">4. Cartographie et représentation spatiale</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Les parcelles validées sont représentées sur des fonds de carte OpenStreetMap et Mapbox, avec les limites administratives et des indicateurs de densité. Cette représentation est indicative : elle traduit la position déclarée et ne constitue pas un mesurage officiel opposable.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">5. Mise à jour continue et historisation</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Les déclarants peuvent mettre à jour leurs données ou demander une correction après approbation. Chaque modification est historisée, ce qui permet de suivre l'évolution d'une parcelle dans le temps. Les vérifications approfondies (expertise de valeur, contrôle de titre, hypothèques, mutation) relèvent de services dédiés, réalisés sur demande et facturés séparément.
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
