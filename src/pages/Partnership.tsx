import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Handshake, 
  Users, 
  TrendingUp, 
  Globe, 
  Building2,
  FileText,
  Mail,
  Phone,
  CheckCircle,
  Database,
  Shield,
  Eye,
  Code
} from 'lucide-react';

const Partnership = () => {
  const whyPartner = [
    {
      icon: Database,
      title: "Base cadastrale numérisée",
      description: "Accédez à une base de données cadastrales structurée, couvrant les parcelles, titres, hypothèques et historiques de propriété en RDC."
    },
    {
      icon: Shield,
      title: "Réduction des litiges",
      description: "Contribuez à la prévention des conflits fonciers grâce à la transparence et la traçabilité des informations parcellaires."
    },
    {
      icon: Code,
      title: "Intégration technologique",
      description: "Exploitez nos API, nos données cartographiques et nos services de vérification foncière dans vos propres solutions."
    },
    {
      icon: Eye,
      title: "Visibilité sectorielle",
      description: "Positionnez-vous auprès des acteurs clés du foncier en RDC : institutions, professionnels du droit, investisseurs et chercheurs."
    }
  ];

  const partnershipTypes = [
    {
      icon: Building2,
      title: "Partenariat Institutionnel",
      description: "Collaboration avec les administrations foncières (conservation foncière, cadastre, urbanisme), les collectivités territoriales et les organismes de coopération internationale. Le BIC fournit un socle de données numériques exploitable pour la planification urbaine, la fiscalité foncière locale et la prévention des conflits liés à la terre.",
      benefits: [
        "Accès aux données cadastrales structurées par entité administrative",
        "Tableaux de bord statistiques personnalisés",
        "Assistance technique à la numérisation des archives foncières",
        "Formations dédiées sur l'utilisation de la plateforme"
      ],
      badge: "Recommandé"
    },
    {
      icon: Users,
      title: "Partenariat Commercial",
      description: "Intégration des services du BIC dans les solutions des acteurs privés : cabinets notariaux, agences immobilières, institutions financières et compagnies d'assurance. Accès via API aux données de vérification foncière, incluant les titres de propriété, les hypothèques en cours et les litiges déclarés.",
      benefits: [
        "API REST d'interrogation cadastrale en temps réel",
        "Vérification automatisée des hypothèques et servitudes",
        "Données de valorisation immobilière géolocalisées",
        "Modèle de licence adapté au volume de requêtes"
      ],
      badge: "Innovant"
    },
    {
      icon: Globe,
      title: "Partenariat Académique",
      description: "Collaboration avec les universités et centres de recherche travaillant sur les problématiques foncières, urbaines et territoriales en République Démocratique du Congo. Le BIC met à disposition des jeux de données anonymisés et un environnement de recherche structuré pour les travaux scientifiques.",
      benefits: [
        "Accès aux données anonymisées pour la recherche",
        "Co-encadrement de mémoires et thèses de doctorat",
        "Publications conjointes dans des revues spécialisées",
        "Participation aux colloques et séminaires académiques"
      ],
      badge: "Académique"
    },
    {
      icon: TrendingUp,
      title: "Partenariat Technologique",
      description: "Alliance avec les entreprises technologiques spécialisées en géomatique, systèmes d'information géographique (SIG), télédétection ou blockchain foncière. Co-développement d'outils innovants pour la sécurisation et la traçabilité des transactions foncières sur le territoire congolais.",
      benefits: [
        "Co-développement de modules cartographiques avancés",
        "Intégration d'imagerie satellite et de données de télédétection",
        "Expérimentation de registres fonciers distribués (blockchain)",
        "Expansion progressive vers de nouvelles provinces"
      ],
      badge: "Tech"
    }
  ];

  const currentPartners = [
    {
      name: "Université de Goma",
      type: "Académique",
      description: "Collaboration sur les recherches urbaines et territoriales. L'UNIGOM contribue à la validation scientifique des méthodologies de collecte et à l'encadrement d'étudiants travaillant sur les données du BIC."
    },
    {
      name: "Ville de Goma",
      type: "Institutionnel",
      description: "Support à la planification urbaine et à la fiscalité locale. La Ville de Goma exploite les données cadastrales du BIC pour améliorer le recouvrement des taxes foncières et la gestion du territoire municipal."
    },
    {
      name: "Actors of Change",
      type: "Développement",
      description: "Projets de développement communautaire et d'habitat. Cette ONG utilise les données du BIC pour identifier les zones à risque et accompagner les communautés dans la sécurisation de leurs droits fonciers."
    }
  ];

  const processSteps = [
    {
      step: 1,
      title: "Premier Contact",
      description: "Prenez contact avec notre équipe pour exposer vos objectifs, votre domaine d'activité et la nature de la collaboration envisagée. Un référent partenariat vous sera attribué."
    },
    {
      step: 2,
      title: "Évaluation Conjointe",
      description: "Analyse de compatibilité entre vos besoins et nos capacités. Définition du périmètre de collaboration, des données concernées et du cadre juridique applicable."
    },
    {
      step: 3,
      title: "Formalisation",
      description: "Négociation et signature d'un accord de partenariat précisant les engagements mutuels, les modalités d'accès aux données et les indicateurs de suivi."
    },
    {
      step: 4,
      title: "Mise en Œuvre",
      description: "Déploiement opérationnel de la collaboration avec un accompagnement technique dédié, des points de suivi réguliers et une évaluation périodique des résultats."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Partenariat | BIC - Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Devenez partenaire du BIC et accédez à la base cadastrale numérisée de la RDC. Revendeurs, institutions et organisations." />
      </Helmet>
      <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-primary/5 to-transparent py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Handshake className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">
              Partenariats Stratégiques
            </h1>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              En République Démocratique du Congo, le secteur foncier reste marqué par la fragmentation 
              des archives cadastrales, l'insuffisance des outils numériques et la multiplicité des acteurs 
              institutionnels. Face à ces défis, le Bureau d'Information Cadastrale développe des partenariats 
              durables avec les institutions publiques, le secteur privé, le monde académique et les acteurs 
              technologiques. L'objectif : mutualiser les compétences et les ressources pour construire un 
              écosystème foncier numérique fiable, accessible et transparent.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pourquoi devenir partenaire */}
          <section className="py-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-4">
              Pourquoi devenir partenaire du BIC ?
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-3xl mx-auto">
              En rejoignant l'écosystème du BIC, vous accédez à une infrastructure de données foncières 
              unique en RDC et contribuez à un objectif commun de sécurisation foncière.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {whyPartner.map((item, index) => {
                const IconComponent = item.icon;
                return (
                  <Card key={index} className="text-center border-none bg-secondary/30 shadow-none">
                    <CardContent className="pt-8 pb-6">
                      <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Types de partenariats */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Types de Partenariats
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {partnershipTypes.map((partnership, index) => {
                const IconComponent = partnership.icon;
                return (
                  <Card key={index} className="group border-l-4 border-l-primary hover:shadow-lg transition-all duration-300">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 rounded-lg bg-secondary group-hover:bg-primary/10 transition-colors duration-300">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {partnership.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors duration-300">
                        {partnership.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-5 leading-relaxed text-sm">
                        {partnership.description}
                      </p>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground">Avantages :</h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          {partnership.benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Partenaires actuels */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Nos Partenaires Actuels
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {currentPartners.map((partner, index) => (
                <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <span className="text-xl font-bold text-primary">
                        {partner.name.charAt(0)}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{partner.name}</CardTitle>
                    <Badge variant="secondary" className="w-fit mx-auto">
                      {partner.type}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {partner.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Processus */}
          <section className="mb-16">
            <div className="bg-secondary/20 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-center text-foreground mb-10">
                Comment Devenir Partenaire ?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-primary/20" />
                {processSteps.map((item) => (
                  <div key={item.step} className="text-center relative">
                    <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 relative z-10">
                      <span className="text-lg font-bold">{item.step}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-8">
                <FileText className="h-12 w-12 text-primary mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  Intéressé par un Partenariat ?
                </h2>
                <p className="text-muted-foreground mb-6 max-w-3xl mx-auto leading-relaxed">
                  Que vous soyez une institution publique souhaitant moderniser la gestion foncière de votre 
                  juridiction, une entreprise cherchant à intégrer des données cadastrales fiables dans vos 
                  services, un centre de recherche travaillant sur les enjeux territoriaux en RDC, ou un acteur 
                  technologique désireux de co-développer des solutions innovantes — notre équipe est à votre 
                  disposition pour explorer les modalités d'une collaboration mutuellement bénéfique.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild className="flex items-center gap-2">
                    <a
                      href="mailto:contact@bic.cd?subject=Proposition%20de%20partenariat%20BIC&body=Bonjour%2C%0D%0A%0D%0AJe%20souhaite%20explorer%20une%20opportunit%C3%A9%20de%20partenariat%20avec%20le%20Bureau%20d%27Informations%20Cadastrales.%0D%0A%0D%0AOrganisation%20%3A%20%0D%0ADomaine%20d%27activit%C3%A9%20%3A%20%0D%0ANature%20du%20partenariat%20envisag%C3%A9%20%3A%20%0D%0A%0D%0ACordialement%2C"
                    >
                      <Mail className="h-4 w-4" />
                      Envoyer une proposition
                    </a>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="flex items-center gap-2">
                    <a href="tel:+243816996077">
                      <Phone className="h-4 w-4" />
                      Nous appeler
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
    </>
  );
};

export default Partnership;
