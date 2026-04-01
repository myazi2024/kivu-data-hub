import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Scale, Shield, Eye, FileText, Mail, Cookie, Gavel, Clock, Globe, AlertTriangle, Server, BookOpen } from 'lucide-react';

const legalSections = [
  { id: 'mentions', label: 'Article 1 — Mentions légales' },
  { id: 'objet', label: 'Article 2 — Objet' },
  { id: 'cgu', label: 'Article 3 — Conditions d\'utilisation' },
  { id: 'donnees', label: 'Article 4 — Protection des données' },
  { id: 'cookies', label: 'Article 5 — Cookies' },
  { id: 'droit', label: 'Article 6 — Droit applicable' },
  { id: 'modifications', label: 'Article 7 — Modifications' },
  { id: 'cgv', label: 'Article 8 — Conditions Générales de Vente' },
  { id: 'contributions', label: 'Article 9 — Contributions Citoyennes' },
  { id: 'services', label: 'Article 10 — Conditions par service' },
  { id: 'revendeurs', label: 'Article 11 — Programme Revendeurs' },
];

const Legal = () => {
  const lastUpdated = "31 mars 2026";

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Scale className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Mentions Légales
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Cadre juridique régissant l'accès et l'utilisation de la plateforme numérique 
              d'information cadastrale du Bureau d'Informations Cadastrales (BIC), 
              conformément au droit en vigueur en République Démocratique du Congo.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Dernière mise à jour : {lastUpdated}
            </p>
          </div>

          {/* Table des matières */}
          <Card className="mb-10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-5 w-5 text-primary" />
                Table des matières
              </CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="grid sm:grid-cols-2 gap-2">
                {legalSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className="text-left text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-primary/5"
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          <div className="space-y-8">
            {/* Article 1 — Mentions légales */}
            <Card id="mentions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Article 1 — Mentions Légales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">1.1 — Éditeur du site</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le présent site est édité par le <strong>Bureau d'Informations Cadastrales (BIC)</strong>, 
                    plateforme numérique spécialisée dans la collecte, la structuration et la diffusion 
                    d'informations cadastrales en République Démocratique du Congo.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
                  <p><strong className="text-foreground">Dénomination :</strong> Bureau d'Informations Cadastrales (BIC)</p>
                  <p><strong className="text-foreground">Nature de l'activité :</strong> Plateforme numérique d'information cadastrale — recherche parcellaire, cartographie interactive, vérification d'hypothèques, historique de propriété</p>
                  <p><strong className="text-foreground">Siège social :</strong> 07, Rue Touristique, Goma, Nord-Kivu, République Démocratique du Congo</p>
                  <p><strong className="text-foreground">Email :</strong> contact@bic.cd</p>
                  <p><strong className="text-foreground">Téléphone :</strong> +243 816 996 077</p>
                  <p><strong className="text-foreground">Directeur de publication :</strong> Direction Générale du BIC</p>
                  <p><strong className="text-foreground">RCCM :</strong> CD/GOM/RCCM/25-XXXXX <span className="text-xs italic">(en cours d'enregistrement)</span></p>
                  <p><strong className="text-foreground">IDNAT :</strong> En cours d'obtention</p>
                  <p><strong className="text-foreground">NIF :</strong> En cours d'obtention</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">1.2 — Hébergement</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le site est hébergé par des prestataires d'infrastructure cloud conformes aux standards 
                    internationaux de sécurité et de disponibilité. Les données sont stockées sur des serveurs 
                    sécurisés avec chiffrement au repos et en transit. Pour toute question relative à l'hébergement, 
                    contactez : <span className="font-medium">contact@bic.cd</span>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Article 2 — Objet */}
            <Card id="objet">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Article 2 — Objet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Les présentes mentions légales et conditions générales d'utilisation (ci-après « CGU ») 
                  ont pour objet de définir les modalités d'accès et d'utilisation de la plateforme BIC, 
                  accessible à l'adresse <span className="font-medium">bic.cd</span>. Elles encadrent 
                  l'ensemble des services proposés par la plateforme, notamment :
                </p>
                <ul className="text-muted-foreground space-y-2 mt-4 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La recherche et la consultation d'informations cadastrales (identification parcellaire, localisation, superficie, type de titre)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La cartographie interactive des parcelles avec superposition de données géographiques
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La vérification de l'existence d'hypothèques, de servitudes ou de litiges fonciers
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La consultation de l'historique de propriété et des mutations foncières
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La contribution citoyenne à l'enrichissement de la base de données cadastrale
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    La demande de titres fonciers et de certificats cadastraux en ligne
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  L'accès et l'utilisation de la plateforme impliquent l'acceptation pleine et entière 
                  des présentes CGU. Tout utilisateur qui n'accepte pas ces conditions doit s'abstenir 
                  d'utiliser la plateforme.
                </p>
              </CardContent>
            </Card>

            {/* Article 3 — Conditions d'utilisation */}
            <Card id="cgu">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-primary" />
                  Article 3 — Conditions d'Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">3.1 — Accès à la plateforme</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    L'accès à certaines fonctionnalités de la plateforme est libre et gratuit, notamment 
                    la consultation des informations générales et des articles publiés. L'accès aux services 
                    spécialisés — recherche cadastrale détaillée, génération de certificats, cartographie 
                    avancée — nécessite la création d'un compte utilisateur et peut faire l'objet d'une 
                    facturation selon la grille tarifaire en vigueur.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2">
                    L'utilisateur déclare être majeur et disposer de la capacité juridique nécessaire 
                    pour s'engager au titre des présentes. La création d'un compte implique la fourniture 
                    d'informations exactes et à jour.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">3.2 — Utilisation des données cadastrales</h3>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Avertissement important :</strong> Les données 
                        cadastrales diffusées par le BIC ont un caractère strictement informatif. Elles ne 
                        sont <strong>pas opposables juridiquement</strong> et ne sauraient se substituer aux 
                        documents officiels délivrés par les services compétents de l'État congolais 
                        (Conservation des Titres Immobiliers, Cadastre, Division des Affaires Foncières).
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Les données fournies sont destinées à des fins d'information, d'analyse préliminaire 
                    et de recherche. Les données cadastrales restent la propriété de l'État congolais. 
                    Il est strictement interdit de :
                  </p>
                  <ul className="text-muted-foreground space-y-1.5 ml-4">
                    <li>• Reproduire, redistribuer ou revendre les données sans autorisation écrite préalable du BIC</li>
                    <li>• Procéder à l'extraction automatisée des données (scraping, crawling, moissonnage)</li>
                    <li>• Constituer des bases de données dérivées à partir des informations de la plateforme</li>
                    <li>• Dénaturer, altérer ou modifier les données originales à des fins de tromperie</li>
                    <li>• Utiliser les données de manière à porter atteinte aux droits de tiers ou à l'ordre public</li>
                    <li>• Prendre des décisions juridiques ou financières engageantes sur la seule base des données du BIC sans vérification auprès des autorités compétentes</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">3.3 — Propriété intellectuelle</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    L'ensemble des éléments constituant la plateforme BIC — code source, architecture 
                    de la base de données, algorithmes de traitement et de croisement des données, 
                    interfaces graphiques, design, textes, graphismes, logos, icônes et logiciels — 
                    sont la propriété exclusive du BIC et sont protégés par les lois applicables en 
                    matière de propriété intellectuelle.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2">
                    Certaines composantes cartographiques intègrent des données sous licence libre, 
                    notamment OpenStreetMap (licence ODbL). Les fonds de carte utilisés peuvent provenir 
                    de fournisseurs tiers soumis à leurs propres conditions d'utilisation. Toute 
                    reproduction, représentation ou diffusion, même partielle, du contenu de la 
                    plateforme est interdite sans autorisation préalable.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">3.4 — Limitation de responsabilité</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le BIC agit en qualité d'<strong>intermédiaire technique</strong> dans la collecte 
                    et la structuration des données cadastrales. Les informations diffusées proviennent 
                    de sources officielles (services cadastraux, conservation des titres immobiliers) 
                    et de contributions communautaires vérifiées. Le BIC ne saurait garantir l'exhaustivité, 
                    l'exactitude absolue ou l'actualité permanente de l'ensemble des données.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mt-2">
                    En conséquence, le BIC décline toute responsabilité en cas de préjudice résultant 
                    directement ou indirectement de l'utilisation des informations fournies, notamment 
                    en cas de décision d'investissement, d'acquisition ou de transaction foncière prise 
                    sur la seule base des données de la plateforme sans vérification indépendante auprès 
                    des autorités compétentes.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">3.5 — Disponibilité du service</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le BIC s'engage à mettre en œuvre les moyens raisonnables pour assurer la disponibilité 
                    continue de la plateforme. Toutefois, l'accès peut être temporairement suspendu pour 
                    des raisons de maintenance, de mise à jour ou en cas de force majeure (coupures 
                    d'électricité, défaillances réseau, catastrophes naturelles). Le BIC ne saurait être 
                    tenu responsable des interruptions de service indépendantes de sa volonté.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Article 4 — Protection des données */}
            <Card id="donnees">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Article 4 — Protection des Données Personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.1 — Base légale</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le traitement des données personnelles par le BIC s'inscrit dans le cadre de la 
                    <strong> Loi n° 20/017 du 25 novembre 2020 relative aux télécommunications et aux 
                    technologies de l'information et de la communication</strong> en République Démocratique 
                    du Congo, ainsi que des principes généraux de protection des données personnelles 
                    reconnus au niveau international.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.2 — Données collectées</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Dans le cadre de l'utilisation de la plateforme, les catégories de données 
                    suivantes peuvent être collectées :
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Données d\'identité', desc: 'Nom, prénom, adresse email, numéro de téléphone, organisation' },
                      { title: 'Données de navigation', desc: 'Adresse IP, type de navigateur, pages consultées, durée de visite' },
                      { title: 'Données de géolocalisation', desc: 'Coordonnées GPS lors de l\'utilisation de la carte interactive (avec consentement)' },
                      { title: 'Données cadastrales', desc: 'Historique des recherches parcellaires, services consultés, documents générés' },
                      { title: 'Données de transaction', desc: 'Informations de facturation, historique des paiements, services souscrits' },
                      { title: 'Données de contribution', desc: 'Informations soumises dans le cadre des contributions citoyennes' },
                    ].map((item) => (
                      <div key={item.title} className="bg-muted/30 rounded-lg p-3">
                        <p className="font-medium text-foreground text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.3 — Finalités du traitement</h3>
                  <ul className="text-muted-foreground space-y-1.5 ml-4">
                    <li>• Gestion des comptes utilisateurs et authentification sécurisée</li>
                    <li>• Fourniture et personnalisation des services cadastraux</li>
                    <li>• Traitement des paiements et facturation</li>
                    <li>• Analyses statistiques anonymisées pour l'amélioration de la plateforme</li>
                    <li>• Communication institutionnelle relative aux services et mises à jour</li>
                    <li>• Prévention de la fraude et sécurisation de la plateforme</li>
                    <li>• Respect des obligations légales et réglementaires</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.4 — Durées de conservation</h3>
                  <div className="space-y-2">
                    {[
                      { type: 'Données de compte', duration: 'Durée du compte actif + 2 ans après la dernière activité' },
                      { type: 'Logs de navigation', duration: '12 mois à compter de la collecte' },
                      { type: 'Données de transaction', duration: 'Conformément aux obligations légales comptables (10 ans)' },
                      { type: 'Données de géolocalisation', duration: 'Durée de la session uniquement, non conservées' },
                      { type: 'Cookies de consentement', duration: '12 mois à compter du dépôt' },
                    ].map((item) => (
                      <div key={item.type} className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium text-foreground">{item.type} :</span>{' '}
                          <span className="text-muted-foreground">{item.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.5 — Hébergement et transfert</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Les données personnelles sont hébergées sur des serveurs sécurisés conformes aux 
                    standards internationaux. Aucun transfert de données personnelles vers des pays 
                    tiers n'est effectué sans garanties appropriées de protection. En cas de recours 
                    à des sous-traitants techniques, ceux-ci sont contractuellement tenus de respecter 
                    des niveaux de sécurité et de confidentialité équivalents.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.6 — Vos droits</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Conformément aux réglementations en vigueur, vous disposez des droits suivants 
                    sur vos données personnelles :
                  </p>
                  <ul className="text-muted-foreground space-y-1.5 ml-4">
                    <li>• <strong>Droit d'accès</strong> — obtenir la confirmation du traitement et une copie de vos données</li>
                    <li>• <strong>Droit de rectification</strong> — corriger les données inexactes ou incomplètes</li>
                    <li>• <strong>Droit de suppression</strong> — demander l'effacement de vos données sous certaines conditions</li>
                    <li>• <strong>Droit de portabilité</strong> — recevoir vos données dans un format structuré et lisible</li>
                    <li>• <strong>Droit d'opposition</strong> — vous opposer au traitement de vos données pour des motifs légitimes</li>
                    <li>• <strong>Droit de limitation</strong> — demander la suspension du traitement dans certains cas</li>
                  </ul>
                  <div className="bg-muted/30 rounded-lg p-4 mt-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Procédure d'exercice des droits</p>
                    <p>
                      Toute demande doit être adressée par email à <strong>contact@bic.cd</strong>, 
                      accompagnée d'une copie d'une pièce d'identité en cours de validité. Le BIC 
                      s'engage à répondre dans un délai de <strong>30 jours ouvrables</strong> à 
                      compter de la réception de la demande complète.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">4.7 — Sécurité des données</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Le BIC met en œuvre des mesures techniques et organisationnelles appropriées 
                    pour protéger vos données personnelles :
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { icon: '🔒', label: 'Chiffrement SSL/TLS pour toutes les communications' },
                      { icon: '🔐', label: 'Authentification sécurisée avec hachage des mots de passe' },
                      { icon: '💾', label: 'Sauvegardes régulières et redondantes des données' },
                      { icon: '👤', label: 'Contrôle d\'accès par rôles et principe du moindre privilège' },
                      { icon: '📊', label: 'Surveillance et journalisation des accès aux données sensibles' },
                      { icon: '🛡️', label: 'Tests de sécurité réguliers et mises à jour des systèmes' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Article 5 — Cookies */}
            <Card id="cookies">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cookie className="h-5 w-5 text-primary" />
                  Article 5 — Politique des Cookies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  La plateforme BIC utilise des cookies et technologies similaires pour assurer 
                  son bon fonctionnement et améliorer l'expérience utilisateur. Un cookie est un 
                  petit fichier de données stocké sur votre terminal lors de la visite d'un site web.
                </p>

                <div className="space-y-4 mt-4">
                  {[
                    {
                      type: 'Cookies essentiels',
                      desc: 'Indispensables au fonctionnement de la plateforme : authentification, maintien de session, sécurité, préférences de consentement.',
                      duration: 'Durée de la session ou 12 mois',
                      required: true,
                    },
                    {
                      type: 'Cookies fonctionnels',
                      desc: 'Permettent de mémoriser vos préférences : fournisseur de carte préféré, langue d\'interface, dernière position cartographique consultée.',
                      duration: '12 mois',
                      required: false,
                    },
                    {
                      type: 'Cookies analytiques',
                      desc: 'Permettent de mesurer l\'audience de la plateforme, d\'identifier les fonctionnalités les plus utilisées et d\'améliorer la qualité du service. Les données sont anonymisées.',
                      duration: '13 mois',
                      required: false,
                    },
                  ].map((cookie) => (
                    <div key={cookie.type} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground text-sm">{cookie.type}</h4>
                        {cookie.required && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Obligatoire
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{cookie.desc}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Conservation : {cookie.duration}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-muted-foreground leading-relaxed mt-4 text-sm">
                  Vous pouvez configurer votre navigateur pour refuser tout ou partie des cookies. 
                  Cependant, le refus des cookies essentiels peut affecter le fonctionnement de 
                  certaines fonctionnalités de la plateforme, notamment l'authentification et 
                  la carte interactive.
                </p>
              </CardContent>
            </Card>

            {/* Article 6 — Droit applicable */}
            <Card id="droit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Article 6 — Droit Applicable et Juridiction Compétente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Les présentes mentions légales et conditions d'utilisation sont régies par le 
                  droit de la République Démocratique du Congo. En cas de litige relatif à 
                  l'interprétation ou à l'exécution des présentes, les parties s'efforceront 
                  de trouver une solution amiable.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  À défaut d'accord amiable, tout litige sera soumis à la compétence exclusive 
                  des <strong>juridictions compétentes de Goma, Province du Nord-Kivu, République 
                  Démocratique du Congo</strong>.
                </p>
              </CardContent>
            </Card>

            {/* Article 7 — Modifications */}
            <Card id="modifications">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  Article 7 — Modification des Mentions Légales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Le BIC se réserve le droit de modifier les présentes mentions légales et conditions 
                  d'utilisation à tout moment, notamment pour les adapter aux évolutions législatives 
                  et réglementaires ou aux nouvelles fonctionnalités de la plateforme. Les utilisateurs 
                  seront informés de toute modification substantielle par notification sur la plateforme. 
                  La date de dernière mise à jour figurant en haut de cette page fait foi.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-3">
                  La poursuite de l'utilisation de la plateforme après modification des CGU vaut 
                  acceptation des nouvelles conditions.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Questions Juridiques
                </h3>
                <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
                  Pour toute question relative aux présentes mentions légales, à la protection 
                  de vos données personnelles ou à l'exercice de vos droits
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Email : <span className="font-medium">contact@bic.cd</span></p>
                  <p>Téléphone : <span className="font-medium">+243 816 996 077</span></p>
                  <p>Adresse : <span className="font-medium">07, Rue Touristique, Goma, Nord-Kivu, RDC</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
