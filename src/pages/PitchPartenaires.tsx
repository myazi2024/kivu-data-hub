import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle, CheckCircle2, Map, Search, Shield, FileText, BarChart3, Globe,
  Play, Send, ArrowRight, ArrowLeft, TrendingUp, Users, Clock, Zap, Building2, Code2,
  GraduationCap, Phone, Mail, Maximize, Minimize, ChevronLeft, ChevronRight,
  MapPin, Scale, Landmark, Home, Receipt, History, QrCode, Award, UserCheck,
  Database, Lock, Eye, Layers, FileCheck, BookOpen, Handshake, Target, Briefcase,
  GanttChart, CircleDollarSign, BadgeCheck, Gauge, MonitorSmartphone,
  Rocket, Flag, Globe2, User, Cpu, ShieldCheck, DollarSign, CreditCard, Activity,
  LogIn, MousePointerClick, ScanLine, Timer
} from 'lucide-react';
import bicLogo from '@/assets/bic-logo.png';
import heroSkyline from '@/assets/hero-skyline.webp';
import mapViz from '@/assets/bic-map-screenshot.jpg';
import territorialMap from '@/assets/territorial-map-illustration.webp';
import gomaHero from '@/assets/goma-city-hero.jpg';

/* ──────────────────── SLIDE COMPONENTS ──────────────────── */

const SlideWrapper: React.FC<{ bg?: string; overlay?: boolean; children: React.ReactNode; className?: string }> = ({ bg, overlay = false, children, className = '' }) => (
  <div className={`relative w-full h-full flex flex-col overflow-y-auto md:overflow-hidden ${className}`}>
    {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />}
    {bg && overlay && <div className="absolute inset-0 bg-black/60" />}
    <div className="relative z-10 flex-1 flex flex-col">{children}</div>
  </div>
);

/* ── Slide 1: Couverture ── */
const SlideCover = () => (
  <SlideWrapper bg={heroSkyline} overlay>
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <img src={bicLogo} alt="Logo BIC" className="h-20 md:h-28 mb-8 drop-shadow-xl" />
      <span className="inline-block mb-4 px-5 py-1.5 rounded-full bg-white/15 backdrop-blur text-white text-sm font-medium border border-white/20">
        Présentation aux Partenaires d'Affaires
      </span>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 leading-tight max-w-4xl">
        Bureau d'Informations Cadastrales
      </h1>
      <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-10 font-light">
        Cadastre numérique collaboratif.
      </p>
      <div className="flex items-center gap-3 text-white/70 text-sm">
        <MonitorSmartphone className="h-4 w-4" />
        <span>Utilisez les flèches ← → ou cliquez pour naviguer • Appuyez sur <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs">F</kbd> pour le plein écran</span>
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 2: Le Contexte ── */
const SlideContext = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-destructive/5 via-background to-destructive/10 px-6 md:px-16 py-10 md:py-16">
      <div className="mb-8">
        <span className="text-sm font-semibold text-destructive uppercase tracking-wider">Le Problème</span>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-2">La crise foncière en RDC</h2>
        <p className="text-lg text-muted-foreground mt-3 max-w-3xl italic">
          En RDC, acheter un terrain c'est souvent acheter un litige. Voici pourquoi.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
        {[
          { icon: AlertTriangle, value: '70%', label: 'des litiges judiciaires sont liés au foncier', consequence: 'Des familles expulsées de terrains qu\'elles occupent depuis des générations', color: 'text-destructive' },
          { icon: FileText, value: '0%', label: 'de numérisation du cadastre avant le BIC', consequence: 'Des millions de documents papier fragiles dispersés dans 26 provinces', color: 'text-orange-500' },
          { icon: Clock, value: '2 mois', label: 'pour vérifier un titre foncier manuellement', consequence: 'Des transactions bloquées, des projets immobiliers retardés indéfiniment', color: 'text-amber-500' },
          { icon: Shield, value: '45%', label: 'des titres fonciers contiennent des irrégularités', consequence: 'Des propriétaires légitimes privés de leurs droits par des faux documents', color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full bg-destructive/10 mb-4">
              <s.icon className={`h-7 w-7 ${s.color}`} />
            </div>
            <div className={`text-4xl md:text-5xl font-bold ${s.color} mb-2`}>{s.value}</div>
            <p className="text-sm text-muted-foreground mb-2">{s.label}</p>
            <p className="text-xs text-destructive/70 italic leading-snug">{s.consequence}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 3: La Solution ── */
const SlideSolution = () => (
  <SlideWrapper bg={territorialMap} overlay>
    <div className="flex-1 flex flex-col px-6 md:px-16 py-10 md:py-16">
      <div className="mb-8">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">La Solution</span>
        <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">La plateforme BIC</h2>
        <p className="text-lg text-white/80 mt-3 max-w-3xl">Une infrastructure numérique souveraine qui transforme radicalement l'accès aux données cadastrales de la RDC.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 max-w-5xl">
        {[
          { icon: Database, title: 'Centralisation', before: 'Courir entre 3 bureaux et attendre des semaines', after: 'Tout en un clic, depuis n\'importe où' },
          { icon: Lock, title: 'Sécurisation', before: 'Faux titres indétectables, fraude généralisée', after: 'QR code vérifiable en 10 secondes' },
          { icon: Eye, title: 'Transparence', before: 'Information réservée aux initiés et intermédiaires', after: 'Tout citoyen peut vérifier un titre gratuitement' },
          { icon: Layers, title: 'Accessibilité', before: 'Systèmes cloisonnés, données inaccessibles', after: 'Accès personnalisé par permissions pour chaque professionnel et institution' },
        ].map((p) => (
          <div key={p.title} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 p-6 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/20">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white">{p.title}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-400 text-xs font-bold mt-0.5 shrink-0">AVANT</span>
                <p className="text-white/60 text-sm line-through">{p.before}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 text-xs font-bold mt-0.5 shrink-0">APRÈS</span>
                <p className="text-white text-sm font-medium">{p.after}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 4: Carte interactive ── */
const SlideMap = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col md:flex-row bg-background">
      <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-10">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Cartographie</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Carte interactive des 26 provinces</h2>
        <p className="text-muted-foreground mb-4 leading-relaxed italic">
          Pour la première fois, les données cadastrales de la RDC sont visualisables sur une carte. Zoomez de la province jusqu'à la parcelle individuelle.
        </p>
        <ul className="space-y-3">
          {[
            'Fond satellite haute résolution avec couches cadastrales',
            'Navigation fluide avec zoom jusqu\'à la parcelle individuelle',
            'Affichage des limites de propriété et numéros de parcelle',
            'Données de superficie, propriétaire et statut juridique',
            'Export des coordonnées GPS de chaque borne',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:w-1/2 relative">
        <img src={mapViz} alt="Carte interactive BIC" className="w-full h-full object-cover object-right-bottom" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/50 md:block hidden" />
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 5: 8 Services numériques ── */
const SlideServices = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Écosystème complet</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">8 Services numériques intégrés</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          Chaque service répond à un besoin concret des citoyens, notaires, banques et administrations. Voici l'écosystème complet.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-5xl mx-auto w-full">
        {[
          { icon: Search, name: 'Recherche cadastrale', desc: 'Recherche par numéro de parcelle, nom du propriétaire ou localisation GPS' },
          { icon: Map, name: 'Carte interactive', desc: 'Visualisation satellite avec couches cadastrales et limites de propriété' },
          { icon: Landmark, name: 'Titre foncier', desc: 'Demande en ligne de certificat de propriété avec suivi en temps réel' },
          { icon: Home, name: 'Expertise immobilière', desc: 'Évaluation professionnelle de la valeur marchande des biens fonciers' },
          { icon: Scale, name: 'Mutation foncière', desc: 'Transfert de propriété numérisé avec vérification automatisée' },
          { icon: AlertTriangle, name: 'Litiges fonciers', desc: 'Déclaration et suivi des conflits fonciers avec médiation intégrée' },
          { icon: Receipt, name: 'Hypothèque', desc: 'Vérification et gestion des charges hypothécaires sur les parcelles' },
          { icon: History, name: 'Historique fiscal', desc: 'Consultation de l\'historique des taxes foncières et quittances' },
        ].map((s) => (
          <div key={s.name} className="bg-card rounded-xl border p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
            <div className="p-3 rounded-xl bg-primary/10 mb-3 group-hover:bg-primary/20 transition-colors">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{s.name}</h3>
            <p className="text-xs text-muted-foreground leading-snug">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slides 5.1–5.8: Détail des 8 services ── */

const ServiceSlideLayout: React.FC<{
  num: number;
  name: string;
  description: string;
  features: { icon: React.ElementType; text: string }[];
  audience: string;
  MainIcon: React.ElementType;
  gradient: string;
  iconBg: string;
}> = ({ num, name, description, features, audience, MainIcon, gradient, iconBg }) => (
  <SlideWrapper>
    <div className={`flex-1 flex flex-col-reverse md:flex-row ${gradient}`}>
      <div className="md:w-3/5 flex flex-col justify-center px-4 md:px-16 py-4 md:py-10">
        <span className="inline-block mb-2 md:mb-3 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold w-fit">
          Service {num}/8
        </span>
        <h2 className="text-xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">{name}</h2>
        <p className="text-muted-foreground mb-3 md:mb-6 leading-relaxed italic text-sm md:text-base">{description}</p>
        <ul className="space-y-2 md:space-y-3 mb-4 md:mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 md:gap-3">
              <div className="p-1 md:p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <f.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              </div>
              <span className="text-xs md:text-sm text-foreground">{f.text}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-medium">Public cible :</span>
          <span>{audience}</span>
        </div>
      </div>
      <div className="md:w-2/5 flex items-center justify-center p-4 md:p-8">
        <div className={`w-20 h-20 md:w-56 md:h-56 rounded-2xl md:rounded-3xl ${iconBg} flex items-center justify-center shadow-2xl`}>
          <MainIcon className="h-10 w-10 md:h-28 md:w-28 text-white" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  </SlideWrapper>
);

const SlideServiceRecherche = () => (
  <ServiceSlideLayout
    num={1}
    name="Recherche cadastrale"
    description="Accédez instantanément aux données de n'importe quelle parcelle enregistrée en RDC. La recherche multi-critères permet de trouver une parcelle par son numéro officiel, le nom du propriétaire ou sa localisation GPS."
    features={[
      { icon: Search, text: "Recherche par numéro de parcelle (ex: SU/2130/KIN), nom du propriétaire ou adresse" },
      { icon: MapPin, text: "Géolocalisation automatique via GPS du smartphone avec rayon de recherche configurable" },
      { icon: Timer, text: "Résultats en moins de 5 secondes avec fiche complète : superficie, propriétaire, historique" },
      { icon: FileCheck, text: "Export PDF de la fiche cadastrale avec QR code de vérification intégré" },
    ]}
    audience="Citoyens, notaires, avocats, agents immobiliers"
    MainIcon={Search}
    gradient="bg-gradient-to-br from-blue-50/50 via-background to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10"
    iconBg="bg-gradient-to-br from-blue-500 to-blue-700"
  />
);

const SlideServiceCarte = () => (
  <ServiceSlideLayout
    num={2}
    name="Carte interactive"
    description="Visualisez l'ensemble du territoire congolais sur une carte satellite avec les couches cadastrales superposées. Identifiez les parcelles, leurs limites et leurs propriétaires d'un simple clic."
    features={[
      { icon: Map, text: "Vue satellite haute résolution avec couches cadastrales et limites de propriété" },
      { icon: Layers, text: "Filtrage par province, commune, quartier et type de parcelle (urbaine/rurale)" },
      { icon: MousePointerClick, text: "Clic sur une parcelle pour afficher sa fiche complète instantanément" },
      { icon: Globe, text: "Navigation fluide avec zoom jusqu'au niveau de la parcelle individuelle" },
    ]}
    audience="Urbanistes, géomètres, administrations provinciales"
    MainIcon={Map}
    gradient="bg-gradient-to-br from-emerald-50/50 via-background to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10"
    iconBg="bg-gradient-to-br from-emerald-500 to-emerald-700"
  />
);

const SlideServiceTitre = () => (
  <ServiceSlideLayout
    num={3}
    name="Demande de titre foncier"
    description="Soumettez votre demande de certificat de propriété entièrement en ligne. Suivez l'avancement en temps réel et recevez votre titre foncier numérique une fois approuvé — sans déplacement physique."
    features={[
      { icon: FileText, text: "Formulaire guidé étape par étape avec pièces justificatives numérisées" },
      { icon: Activity, text: "Suivi en temps réel du statut de la demande (soumis, en traitement, approuvé)" },
      { icon: BadgeCheck, text: "Titre foncier numérique avec QR code d'authenticité et signature électronique" },
      { icon: DollarSign, text: "Calcul automatique des frais selon le type de titre et la superficie" },
    ]}
    audience="Propriétaires fonciers, promoteurs immobiliers, banques"
    MainIcon={Landmark}
    gradient="bg-gradient-to-br from-amber-50/50 via-background to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10"
    iconBg="bg-gradient-to-br from-amber-500 to-amber-700"
  />
);

const SlideServiceExpertise = () => (
  <ServiceSlideLayout
    num={4}
    name="Expertise immobilière"
    description="Obtenez une évaluation professionnelle de la valeur marchande de votre bien foncier. Nos experts certifiés analysent le terrain, les constructions et le marché local pour produire un rapport détaillé."
    features={[
      { icon: Home, text: "Évaluation complète : terrain, constructions, matériaux, état et environnement" },
      { icon: BarChart3, text: "Comparaison avec les transactions récentes dans la même zone géographique" },
      { icon: FileCheck, text: "Rapport d'expertise certifié accepté par les banques et institutions financières" },
      { icon: Award, text: "Experts immobiliers certifiés avec connaissance du marché local congolais" },
    ]}
    audience="Propriétaires, banques, investisseurs, assureurs"
    MainIcon={Home}
    gradient="bg-gradient-to-br from-violet-50/50 via-background to-violet-100/30 dark:from-violet-950/20 dark:to-violet-900/10"
    iconBg="bg-gradient-to-br from-violet-500 to-violet-700"
  />
);

const SlideServiceMutation = () => (
  <ServiceSlideLayout
    num={5}
    name="Mutation foncière"
    description="Numérisez le transfert de propriété d'un terrain. La plateforme vérifie automatiquement l'identité des parties, l'absence de charges et génère les documents de mutation conformes à la législation congolaise."
    features={[
      { icon: Scale, text: "Vérification automatique de la chaîne de propriété et de l'absence de charges" },
      { icon: UserCheck, text: "Identification numérique des parties (vendeur/acheteur) avec pièces d'identité" },
      { icon: Shield, text: "Contrôle anti-fraude : détection des doubles ventes et titres falsifiés" },
      { icon: FileText, text: "Génération automatique de l'acte de mutation avec signatures électroniques" },
    ]}
    audience="Notaires, avocats, agences immobilières"
    MainIcon={Scale}
    gradient="bg-gradient-to-br from-rose-50/50 via-background to-rose-100/30 dark:from-rose-950/20 dark:to-rose-900/10"
    iconBg="bg-gradient-to-br from-rose-500 to-rose-700"
  />
);

const SlideServiceLitiges = () => (
  <ServiceSlideLayout
    num={6}
    name="Litiges fonciers"
    description="Déclarez et suivez les conflits fonciers directement en ligne. La plateforme offre un système de médiation structuré avec historique des procédures et possibilité de demander la levée d'une opposition."
    features={[
      { icon: AlertTriangle, text: "Déclaration en ligne avec pièces justificatives et géolocalisation du litige" },
      { icon: BookOpen, text: "Historique complet des procédures : tribunal, médiation, résolution amiable" },
      { icon: Handshake, text: "Système de médiation intégré avec suivi des étapes et notifications" },
      { icon: Eye, text: "Visibilité publique du statut de litige sur la fiche cadastrale de la parcelle" },
    ]}
    audience="Citoyens en conflit, avocats, tribunaux, médiateurs"
    MainIcon={AlertTriangle}
    gradient="bg-gradient-to-br from-orange-50/50 via-background to-orange-100/30 dark:from-orange-950/20 dark:to-orange-900/10"
    iconBg="bg-gradient-to-br from-orange-500 to-orange-700"
  />
);

const SlideServiceHypotheque = () => (
  <ServiceSlideLayout
    num={7}
    name="Vérification d'hypothèque"
    description="Vérifiez en un clic si une parcelle est grevée d'une hypothèque. Consultez le détail des charges : montant, créancier, durée, statut des paiements — essentiel avant tout achat ou investissement."
    features={[
      { icon: Receipt, text: "Liste complète des hypothèques actives et historiques sur une parcelle" },
      { icon: Building2, text: "Détails du créancier (banque, institution), montant et durée du contrat" },
      { icon: CreditCard, text: "Historique des paiements hypothécaires avec statut (à jour / en retard)" },
      { icon: Lock, text: "Alerte automatique si une parcelle est sous hypothèque lors d'une recherche" },
    ]}
    audience="Banques, investisseurs, acquéreurs potentiels"
    MainIcon={Receipt}
    gradient="bg-gradient-to-br from-cyan-50/50 via-background to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10"
    iconBg="bg-gradient-to-br from-cyan-500 to-cyan-700"
  />
);

const SlideServiceHistorique = () => (
  <ServiceSlideLayout
    num={8}
    name="Historique fiscal"
    description="Consultez l'historique complet des taxes foncières d'une parcelle : montants, années, statuts de paiement et quittances. Un outil indispensable pour vérifier la conformité fiscale avant une transaction."
    features={[
      { icon: History, text: "Historique année par année des taxes foncières avec montants et statuts" },
      { icon: FileCheck, text: "Quittances de paiement téléchargeables au format PDF" },
      { icon: TrendingUp, text: "Évolution graphique des montants fiscaux sur les dernières années" },
      { icon: AlertTriangle, text: "Alertes en cas d'arriérés fiscaux non réglés sur la parcelle" },
    ]}
    audience="Acquéreurs, notaires, services fiscaux provinciaux"
    MainIcon={History}
    gradient="bg-gradient-to-br from-teal-50/50 via-background to-teal-100/30 dark:from-teal-950/20 dark:to-teal-900/10"
    iconBg="bg-gradient-to-br from-teal-500 to-teal-700"
  />
);

/* ── Slide 6: Comment ça marche (NOUVEAU) ── */
const SlideHowItWorks = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 md:px-16 py-10 md:py-14 items-center justify-center">
      <div className="mb-10 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Parcours utilisateur</span>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-2">Comment ça marche ?</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto italic">
          De l'inscription à la vérification, tout le processus cadastral se fait en 4 étapes simples — sans se déplacer.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl w-full">
        {[
          { step: '1', icon: LogIn, title: 'Créez un compte', desc: 'Inscription gratuite en 30 secondes avec votre email. Aucun document requis pour commencer.', color: 'bg-blue-500' },
          { step: '2', icon: Search, title: 'Recherchez', desc: 'Entrez un numéro de parcelle, le nom d\'un propriétaire ou une adresse. Résultats en moins de 5 secondes.', color: 'bg-emerald-500' },
          { step: '3', icon: FileText, title: 'Consultez', desc: 'Recevez la fiche cadastrale complète : croquis, propriétaire, historique, hypothèques, litiges. Tout en un document.', color: 'bg-amber-500' },
          { step: '4', icon: ScanLine, title: 'Vérifiez', desc: 'Scannez le QR code pour authentifier le document. La vérification est publique, gratuite et instantanée.', color: 'bg-violet-500' },
        ].map((s, i) => (
          <div key={s.step} className="relative flex flex-col items-center text-center">
            {/* Connector line */}
            {i < 3 && <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-primary/10" />}
            <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
              <s.icon className="h-7 w-7 text-white" />
            </div>
            <span className="text-xs font-bold text-primary mb-1">ÉTAPE {s.step}</span>
            <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 7: Recherche cadastrale ── */
const SlideSearch = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col md:flex-row bg-background">
      <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-10">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Fonctionnalité phare</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Recherche cadastrale intelligente</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed italic">
          Vous cherchez une parcelle ? Entrez son numéro, le nom du propriétaire ou une adresse. Le BIC vous retourne la fiche complète en moins de 5 secondes.
        </p>
        <div className="space-y-4">
          {[
            { icon: Search, title: 'Multi-critères', desc: 'Recherche par numéro de parcelle, nom du propriétaire, adresse ou coordonnées GPS' },
            { icon: MapPin, title: 'Géolocalisation', desc: 'Localisation automatique via GPS du smartphone avec rayon de recherche configurable' },
            { icon: FileCheck, title: 'Résultats enrichis', desc: 'Fiche complète : superficie, limites, propriétaire, historique des mutations, charges et litiges' },
            { icon: BarChart3, title: 'Historique', desc: 'Historique complet des recherches avec export PDF et partage sécurisé des résultats' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-sm">{f.title}</h4>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="md:w-1/2 bg-muted/30 flex items-center justify-center p-8">
        <div className="w-full max-w-sm bg-card rounded-2xl shadow-xl border overflow-hidden">
          <div className="bg-primary p-4">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-white/70" />
              <span className="text-white/70 text-sm">Rechercher une parcelle...</span>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {['SU/2130/KIN', 'SR/01/0987/BEN', 'SU/0456/GOM'].map((p) => (
              <div key={p} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="text-xs font-mono text-foreground">{p}</span>
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 8: Fiche Cadastrale ── */
const SlideFicheCadastrale = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Document officiel</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">La Fiche Cadastrale numérique</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          La fiche cadastrale numérique remplace les documents papier éparpillés dans les bureaux. Elle regroupe TOUTES les informations d'une parcelle en un seul document vérifiable.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto flex-1">
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <div className="border-2 border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">FICHE CADASTRALE</p>
                  <p className="text-[10px] text-muted-foreground">Parcelle SU/2130/KIN</p>
                </div>
              </div>
              <div className="px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30">
                <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">⚠ Litige</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center h-28">
              <svg viewBox="0 0 200 100" className="w-full h-full">
                <polygon points="20,80 60,15 170,20 180,85" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4" />
                <circle cx="20" cy="80" r="3" fill="hsl(var(--primary))" />
                <circle cx="60" cy="15" r="3" fill="hsl(var(--primary))" />
                <circle cx="170" cy="20" r="3" fill="hsl(var(--primary))" />
                <circle cx="180" cy="85" r="3" fill="hsl(var(--primary))" />
                <text x="30" y="50" fontSize="7" fill="hsl(var(--muted-foreground))">15.2m</text>
                <text x="110" y="12" fontSize="7" fill="hsl(var(--muted-foreground))">22.8m</text>
                <text x="175" y="55" fontSize="7" fill="hsl(var(--muted-foreground))">13.5m</text>
                <text x="85" y="90" fontSize="7" fill="hsl(var(--muted-foreground))">25.1m</text>
                <text x="80" y="55" fontSize="8" fontWeight="bold" fill="hsl(var(--foreground))">345 m²</text>
              </svg>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-muted/20 rounded p-1.5">
                <span className="text-muted-foreground">GPS:</span>
                <span className="text-foreground ml-1 font-mono">-1.6801, 29.2264</span>
              </div>
              <div className="bg-muted/20 rounded p-1.5">
                <span className="text-muted-foreground">QR:</span>
                <span className="text-foreground ml-1 font-mono">BIC-2026-A3F9K2</span>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground mb-2">Contenu de la fiche cadastrale</h3>
          {[
            { icon: MapPin, name: 'Localisation & croquis SVG', desc: 'Adresse textuelle, coordonnées GPS des bornes, croquis automatique avec dimensions' },
            { icon: UserCheck, name: 'Propriété & historique', desc: 'Propriétaire actuel, statut juridique, historique complet des mutations foncières' },
            { icon: Receipt, name: 'Historique fiscal', desc: 'Taxes foncières payées/impayées par année avec montants et reçus' },
            { icon: Scale, name: 'Hypothèques & charges', desc: 'Charges hypothécaires actives, créancier, montant et statut de remboursement' },
            { icon: AlertTriangle, name: 'Litiges & bornage', desc: 'Conflits fonciers déclarés, historique des opérations de bornage avec PV' },
            { icon: QrCode, name: 'Vérification authentique', desc: 'QR code unique et code de vérification BIC pour validation publique en ligne' },
          ].map((s) => (
            <div key={s.name} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                <s.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground text-xs">{s.name}</h4>
                <p className="text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 9: Vérification & Certificats ── */
const SlideVerification = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-green-50/50 via-background to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Anti-fraude</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Vérification & Certificats numériques</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          La fraude documentaire est endémique dans le secteur foncier congolais. Chaque document BIC porte un QR code unique — scannez-le pour vérifier instantanément son authenticité.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto flex-1">
        <div className="bg-card rounded-xl border p-6 flex flex-col">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" /> Système anti-fraude
          </h3>
          <div className="space-y-3 flex-1">
            {[
              'QR code unique sur chaque certificat généré',
              'Code de vérification alphanumérique à 12 caractères',
              'Page de vérification publique accessible sans compte',
              'Historique horodaté de chaque vérification effectuée',
              'Système d\'invalidation en cas de fraude détectée',
            ].map((t) => (
              <div key={t} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> 6 types de documents vérifiables
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: FileCheck, name: 'Rapport cadastral' },
              { icon: Receipt, name: 'Facture de service' },
              { icon: Landmark, name: 'Autorisation de bâtir' },
              { icon: Award, name: 'Certificat cadastral' },
              { icon: Home, name: 'Rapport d\'expertise' },
              { icon: CircleDollarSign, name: 'Reçu hypothécaire' },
            ].map((d) => (
              <div key={d.name} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                <d.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs text-foreground font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 10: Programme CCC ── */
const SlideCCC = () => (
  <SlideWrapper bg={gomaHero} overlay>
    <div className="flex-1 flex flex-col px-6 md:px-16 py-10 md:py-16">
      <div className="mb-8">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Innovation sociale</span>
        <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">Programme Contributeur CCC</h2>
        <p className="text-lg text-white/80 mt-3 max-w-3xl italic">
          Le cadastre ne peut pas être numérisé uniquement par en haut. Le programme CCC mobilise les citoyens pour collecter les données terrain — et les récompense pour leur contribution.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 max-w-5xl">
        {[
          { icon: UserCheck, title: 'Contribution citoyenne', desc: 'Tout citoyen peut soumettre des informations sur une parcelle : localisation GPS, photos, données du propriétaire, limites de terrain.' },
          { icon: BadgeCheck, title: 'Vérification & validation', desc: 'Chaque contribution est vérifiée par nos équipes. Un score anti-fraude automatisé détecte les soumissions suspectes.' },
          { icon: Award, title: 'Récompenses', desc: 'Les contributeurs reçoivent un code promo unique offrant des réductions sur les services BIC. Les codes ont une valeur en USD et une date d\'expiration.' },
        ].map((s) => (
          <div key={s.title} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 p-6 hover:bg-white/15 transition-colors">
            <div className="p-3 rounded-xl bg-primary/20 w-fit mb-4">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
            <p className="text-white/70 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 11: Impact & Objectifs ── */
const SlideStats = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 md:px-16 py-10 md:py-14 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Impact</span>
      <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-center">Impact & Objectifs</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-2xl italic">
        Des résultats concrets aujourd'hui, et une ambition claire pour demain. Voici où nous en sommes — et où nous allons.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          { today: '1 000+', target: '50 000', label: 'Parcelles numérisées', icon: Map },
          { today: '3', target: '26', label: 'Provinces actives', icon: Globe },
          { today: '100%', target: '100%', label: 'Traçabilité mutations', icon: TrendingUp },
          { today: '< 5 min', target: '< 1 min', label: 'Vérification d\'un titre', icon: Clock },
          { today: '8', target: '12+', label: 'Services numériques', icon: Zap },
          { today: '3', target: '50+', label: 'Partenaires actifs', icon: Handshake },
        ].map((m) => (
          <div key={m.label} className="bg-card rounded-xl border p-5 text-center shadow-sm hover:shadow-md transition-shadow">
            <m.icon className="h-5 w-5 text-primary mx-auto mb-3" />
            <div className="flex items-center justify-center gap-2 mb-2">
              <div>
                <div className="text-2xl font-bold text-foreground">{m.today}</div>
                <p className="text-[10px] text-muted-foreground">Aujourd'hui</p>
              </div>
              <ArrowRight className="h-4 w-4 text-primary" />
              <div>
                <div className="text-2xl font-bold text-primary">{m.target}</div>
                <p className="text-[10px] text-muted-foreground">Objectif 2027</p>
              </div>
            </div>
            <p className="text-xs text-foreground font-medium">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 12: Business Model ── */
const SlideBusiness = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-14">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Modèle économique</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Business Model & Opportunités</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          Le BIC n'est pas un projet subventionné. C'est un modèle économique viable, avec 4 types de partenariats qui génèrent de la valeur pour toutes les parties.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto flex-1 w-full">
        {[
          { icon: Building2, title: 'Partenariat Institutionnel', desc: 'Administrations provinciales, ministères, mairies. Accès complet à la plateforme pour la planification urbaine et la gouvernance foncière.', benefits: ['Tableau de bord analytique dédié', 'Formation des agents', 'Rapports statistiques périodiques', 'Intégration avec les systèmes existants'] },
          { icon: Code2, title: 'Partenariat Commercial', desc: 'Banques, notaires, agences immobilières, promoteurs. Accès direct à la plateforme avec permissions adaptées à vos besoins métier.', benefits: ['Compte professionnel avec permissions dédiées', 'Vérification des titres en temps réel', 'Notifications et alertes personnalisées', 'Support technique prioritaire'] },
          { icon: GraduationCap, title: 'Partenariat Académique', desc: 'Universités, centres de recherche, ONG. Accès aux données anonymisées pour la recherche sur le foncier en RDC.', benefits: ['Données anonymisées pour recherche', 'Publications scientifiques conjointes', 'Stages et projets de fin d\'études', 'Accès gratuit pour la recherche'] },
          { icon: Gauge, title: 'Partenariat Technologique', desc: 'Entreprises SIG, télédétection, startups GovTech. Co-développement de solutions innovantes pour le cadastre numérique.', benefits: ['Co-développement de modules', 'Partage de données géospatiales', 'Innovation sur la blockchain foncière', 'Accès au marché RDC via le BIC'] },
        ].map((bm) => (
          <div key={bm.title} className="bg-card rounded-xl border p-5 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <bm.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{bm.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{bm.desc}</p>
            <ul className="space-y-1.5 mt-auto">
              {bm.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />{b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 13: Roadmap & Vision ── */
const SlideRoadmap = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50/50 via-background to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Vision</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Roadmap & Déploiement</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          Nous avons commencé petit, à Goma, pour prouver le concept. Voici comment nous comptons passer à l'échelle nationale.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto flex-1">
        {[
          {
            icon: Flag,
            phase: 'Phase 1 — 2024-2025',
            title: 'Goma & Nord-Kivu',
            status: 'En cours',
            statusColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            items: ['Déploiement de la plateforme à Goma', 'Partenariat avec la Ville de Goma et UNIGOM', 'Numérisation de 1 000+ parcelles pilotes', 'Programme CCC opérationnel', 'Validation du modèle économique'],
          },
          {
            icon: Rocket,
            phase: 'Phase 2 — 2026-2027',
            title: 'Extension nationale',
            status: 'Planifié',
            statusColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            items: ['Extension à Kinshasa et 5 provinces clés', 'Objectif : 50 000 parcelles numérisées', 'Recrutement d\'équipes provinciales', 'Ouverture des comptes professionnels à grande échelle', 'Partenariats bancaires et notariaux'],
          },
          {
            icon: Globe2,
            phase: 'Phase 3 — 2028+',
            title: 'Couverture nationale',
            status: 'Vision',
            statusColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
            items: ['Couverture des 26 provinces', 'Objectif : 500 000+ parcelles', 'API publique pour développeurs tiers', 'Interopérabilité avec les SIG nationaux', 'Modèle réplicable dans d\'autres pays africains'],
          },
        ].map((p) => (
          <div key={p.phase} className="bg-card rounded-xl border p-6 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.statusColor}`}>{p.status}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{p.phase}</p>
            <h3 className="text-lg font-bold text-foreground mb-3">{p.title}</h3>
            <ul className="space-y-2 flex-1">
              {p.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 14: Équipe ── */
const SlideTeam = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">L'équipe</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-center">Les porteurs du projet</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-2xl italic">
        Le BIC est porté par une équipe pluridisciplinaire alliant expertise technique, connaissance du terrain et vision stratégique.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl w-full">
        {[
          { icon: Briefcase, name: 'Fondateur / CEO', desc: 'Vision stratégique, relations institutionnelles et développement des partenariats en RDC et à l\'international.' },
          { icon: Cpu, name: 'Directeur Technique', desc: 'Architecture de la plateforme, développement full-stack, sécurité des données et infrastructure cloud.' },
          { icon: Target, name: 'Responsable Opérations', desc: 'Coordination des équipes terrain, gestion du programme CCC et contrôle qualité des données.' },
          { icon: Handshake, name: 'Responsable Partenariats', desc: 'Développement commercial, relations avec les institutions et expansion du réseau de revendeurs.' },
        ].map((m) => (
          <div key={m.name} className="bg-card rounded-xl border p-5 text-center shadow-sm hover:shadow-md transition-shadow flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <m.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{m.name}</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 15: Tarification ── */
const SlidePricing = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Revenus</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Modèle de tarification</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          Des prix accessibles, adaptés au contexte congolais. Chaque modèle cible un segment différent : le citoyen, le professionnel, l'entreprise.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto flex-1">
        {[
          { icon: Search, title: 'Recherche unitaire', price: '2 — 10 $', unit: 'par consultation', desc: 'Recherche et consultation de la fiche cadastrale complète d\'une parcelle avec export PDF.', features: ['Fiche cadastrale complète', 'Export PDF téléchargeable', 'Certificat vérifiable'] },
          { icon: CreditCard, title: 'Abonnement', price: '25 — 100 $', unit: 'par mois', desc: 'Accès illimité aux recherches et consultations pour les professionnels du foncier.', features: ['Recherches illimitées', 'Tableau de bord analytique', 'Support prioritaire'] },
          { icon: Code2, title: 'API commerciale', price: '0,50 $', unit: 'par appel', desc: 'Intégration des données cadastrales dans vos systèmes via notre API REST sécurisée.', features: ['Documentation complète', 'Webhooks temps réel', 'SLA garanti'] },
          { icon: DollarSign, title: 'Commissions services', price: '5 — 15%', unit: 'du montant', desc: 'Commission sur les services payants : demandes de titres, mutations, expertises immobilières.', features: ['Titres fonciers', 'Mutations foncières', 'Expertises immobilières'] },
        ].map((p) => (
          <div key={p.title} className="bg-card rounded-xl border p-5 flex flex-col hover:shadow-md transition-shadow">
            <div className="p-2.5 rounded-lg bg-primary/10 w-fit mb-3">
              <p.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-sm mb-1">{p.title}</h3>
            <div className="text-2xl font-bold text-primary mb-0.5">{p.price}</div>
            <p className="text-[10px] text-muted-foreground mb-3">{p.unit}</p>
            <p className="text-xs text-muted-foreground mb-3 flex-1">{p.desc}</p>
            <ul className="space-y-1.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 16: Sécurité & Conformité ── */
const SlideSecurity = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50/50 via-background to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Confiance</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Sécurité & Conformité</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto italic">
          La confiance est le fondement du BIC. Voici les mesures concrètes qui protègent les données et garantissent la conformité.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto flex-1">
        {[
          { icon: Lock, title: 'Chiffrement des données', items: ['Communications TLS/SSL de bout en bout', 'Row Level Security (RLS) sur chaque table', 'Tokens JWT avec renouvellement automatique', 'Clés API rotatives pour les intégrations'] },
          { icon: ShieldCheck, title: 'Conformité légale RDC', items: ['Respect de la loi foncière congolaise', 'Hébergement conforme aux exigences souveraines', 'Identifiants légaux : RCCM, IDNAT, NIF', 'CGU et politique de confidentialité conformes'] },
          { icon: Activity, title: 'Audit trail complet', items: ['Journalisation de chaque action utilisateur', 'Historique immuable des modifications', 'Système de détection de fraude automatisé', 'Alertes en temps réel sur activités suspectes'] },
          { icon: Users, title: 'Données communautaires vérifiées', items: ['Score anti-fraude sur chaque contribution', 'Double vérification par les équipes terrain', 'Avis de non-responsabilité clair sur les sources', 'Données officielles + communautaires distinguées'] },
        ].map((s) => (
          <div key={s.title} className="bg-card rounded-xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
            </div>
            <ul className="space-y-2">
              {s.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 17: Partenaires actuels ── */
const SlidePartners = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-secondary/5 via-background to-primary/5 px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Réseau</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-center">Nos partenaires actuels</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-2xl italic">
        Le BIC ne travaille pas seul. Nos partenaires fondateurs valident notre approche et contribuent à notre crédibilité.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[
          { icon: GraduationCap, name: 'Université de Goma (UNIGOM)', type: 'Académique', desc: 'Partenariat pour la recherche sur le foncier, accès aux données anonymisées pour les mémoires et thèses, formations conjointes en géomatique.' },
          { icon: Building2, name: 'Ville de Goma', type: 'Institutionnel', desc: 'Numérisation du cadastre de la ville de Goma, intégration avec les services d\'urbanisme, planification des quartiers et gestion des permis de construire.' },
          { icon: Users, name: 'Actors of Change', type: 'Société civile', desc: 'Sensibilisation des communautés à la sécurisation foncière, accompagnement des propriétaires dans la régularisation de leurs titres de propriété.' },
        ].map((p) => (
          <div key={p.name} className="bg-card rounded-xl border p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <p.icon className="h-6 w-6 text-primary" />
            </div>
            <span className="inline-block px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">{p.type}</span>
            <h3 className="text-lg font-semibold text-foreground mb-2">{p.name}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 18: Témoignages ── */
const SlideTestimonials = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Retours terrain</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-center">Ce que disent nos utilisateurs</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-2xl italic">
        Ce ne sont pas nos mots, mais ceux de nos utilisateurs. Voici comment le BIC change concrètement leur quotidien.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {[
          { name: 'Me. Kabongo', role: 'Notaire — Lubumbashi', quote: 'Le BIC a transformé notre processus de vérification foncière. Ce qui prenait des semaines de déplacements entre les bureaux du cadastre se fait maintenant en quelques minutes depuis mon cabinet. La vérification par QR code nous donne une assurance totale sur l\'authenticité des documents.' },
          { name: 'Arch. Mutombo', role: 'Bureau d\'études urbanistiques — Kinshasa', quote: 'L\'accès aux données cadastrales numériques nous permet de mieux planifier nos projets d\'aménagement urbain. Les coordonnées GPS des parcelles et les données de superficie sont d\'une précision remarquable. Un outil indispensable pour le développement de la ville.' },
          { name: 'Prof. Amani', role: 'Université de Goma', quote: 'Les données anonymisées du BIC constituent une mine d\'or pour la recherche sur la gouvernance foncière en RDC. Nos étudiants en géomatique peuvent enfin travailler sur des données réelles et contribuer à la modernisation du cadastre congolais.' },
          { name: 'Mme. Kapinga', role: 'Directrice provinciale — Haut-Katanga', quote: 'La plateforme nous offre une visibilité sans précédent sur le patrimoine foncier de notre province. Les tableaux de bord nous aident à prendre des décisions éclairées en matière de planification urbaine et de gestion des litiges.' },
        ].map((t) => (
          <div key={t.name} className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-4xl text-primary/30 font-serif mb-2">"</div>
            <p className="text-muted-foreground italic text-sm leading-relaxed mb-4">{t.quote}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 19: Démo ── */
const SlideDemo = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Démonstration</span>
      <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-center">Testez la plateforme</h2>
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-2xl italic">
        Pas de promesses abstraites. Testez vous-même la plateforme avec des données réelles de Goma.
      </p>
      <div className="max-w-3xl w-full aspect-video bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border mb-8 cursor-pointer hover:border-primary/50 transition-colors">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Vidéo de démonstration — bientôt disponible</p>
        </div>
      </div>
      <Button asChild size="lg" variant="seloger" className="text-lg px-8">
        <Link to="/test/map">
          Accéder à l'environnement test <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>
    </div>
  </SlideWrapper>
);

/* ── Slide 20: Pourquoi maintenant (NOUVEAU) ── */
const SlideWhyNow = () => (
  <SlideWrapper bg={gomaHero} overlay>
    <div className="flex-1 flex flex-col px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <div className="mb-10 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Urgence</span>
        <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">Pourquoi maintenant ?</h2>
        <p className="text-lg text-white/80 mt-3 max-w-2xl mx-auto italic">
          Le moment est critique. Chaque jour sans cadastre numérique, ce sont des droits perdus, des litiges créés, des investissements bloqués.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {[
          { icon: TrendingUp, title: 'Urbanisation record', desc: 'La RDC urbanise à un rythme parmi les plus rapides d\'Afrique. Sans données cadastrales fiables, les litiges fonciers explosent dans chaque nouvelle zone urbanisée.' },
          { icon: Landmark, title: 'Volonté politique', desc: 'Le gouvernement congolais pousse activement la modernisation du cadastre. Les partenaires qui s\'engagent maintenant bénéficient d\'un alignement stratégique rare.' },
          { icon: Flag, title: 'Avantage du premier entrant', desc: 'Les premiers partenaires accèdent à un marché vierge de 90 millions d\'habitants. Ceux qui attendent devront rattraper un retard coûteux.' },
          { icon: Database, title: 'Actif stratégique', desc: 'Les données cadastrales collectées maintenant constituent un actif unique et irremplaçable. Chaque parcelle numérisée aujourd\'hui est une valeur créée pour demain.' },
        ].map((s) => (
          <div key={s.title} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 p-6 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-primary/20">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white">{s.title}</h3>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 21: Contact ── */
const SlideContact: React.FC = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', organization: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase
        .from('partner_inquiries')
        .insert({
          name: formData.name.trim(),
          email: formData.email.trim(),
          organization: formData.organization.trim() || null,
          message: formData.message.trim(),
        });
      if (error) throw error;
      toast({ title: 'Message envoyé', description: 'Nous vous répondrons dans les plus brefs délais.' });
      setFormData({ name: '', email: '', organization: '', message: '' });
    } catch (err) {
      console.error('Error submitting partner inquiry:', err);
      toast({ title: 'Erreur', description: 'Impossible d\'envoyer le message. Veuillez réessayer.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <SlideWrapper>
      <div className="flex-1 flex flex-col md:flex-row bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-10">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Rejoignez-nous</span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Devenez partenaire du BIC</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed italic">
            Prêt à rejoindre le mouvement ? Que vous soyez institution, entreprise, université ou ONG — nous avons un partenariat pour vous.
          </p>
          <div className="space-y-4 mb-8">
            <Button asChild size="lg" variant="seloger" className="w-full sm:w-auto">
              <Link to="/test/map"><Zap className="mr-2 h-4 w-4" /> Accéder à l'environnement test</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/partnership"><Handshake className="mr-2 h-4 w-4" /> Page partenariat détaillée</Link>
            </Button>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +243 816 996 077</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> contact@bic.cd</div>
          </div>
        </div>
        <div className="md:w-1/2 flex items-center justify-center p-6 md:p-10">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">Nous contacter</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pitch-name">Nom complet *</Label>
                <Input id="pitch-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} maxLength={100} required />
              </div>
              <div>
                <Label htmlFor="pitch-email">Email *</Label>
                <Input id="pitch-email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} maxLength={255} required />
              </div>
              <div>
                <Label htmlFor="pitch-org">Organisation</Label>
                <Input id="pitch-org" value={formData.organization} onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))} maxLength={100} />
              </div>
              <div>
                <Label htmlFor="pitch-msg">Message *</Label>
                <textarea
                  id="pitch-msg"
                  className="flex w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[80px] resize-y transition-all duration-200"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  maxLength={1000}
                  required
                />
              </div>
              <Button type="submit" variant="seloger" className="w-full" disabled={sending}>
                <Send className="mr-2 h-4 w-4" /> {sending ? 'Envoi en cours...' : 'Envoyer le message'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </SlideWrapper>
  );
};

/* ──────────────────── SLIDES ARRAY ──────────────────── */

const slides = [
  { id: 'cover', title: 'Couverture', component: SlideCover },
  { id: 'context', title: 'Le Contexte', component: SlideContext },
  { id: 'solution', title: 'La Solution', component: SlideSolution },
  { id: 'map', title: 'Carte interactive', component: SlideMap },
  { id: 'services', title: 'Services', component: SlideServices },
  { id: 'service-recherche', title: 'Service: Recherche', component: SlideServiceRecherche },
  { id: 'service-carte', title: 'Service: Carte', component: SlideServiceCarte },
  { id: 'service-titre', title: 'Service: Titre foncier', component: SlideServiceTitre },
  { id: 'service-expertise', title: 'Service: Expertise', component: SlideServiceExpertise },
  { id: 'service-mutation', title: 'Service: Mutation', component: SlideServiceMutation },
  { id: 'service-litiges', title: 'Service: Litiges', component: SlideServiceLitiges },
  { id: 'service-hypotheque', title: 'Service: Hypothèque', component: SlideServiceHypotheque },
  { id: 'service-historique', title: 'Service: Historique fiscal', component: SlideServiceHistorique },
  { id: 'how-it-works', title: 'Comment ça marche', component: SlideHowItWorks },
  { id: 'search', title: 'Recherche', component: SlideSearch },
  { id: 'fiche', title: 'Fiche Cadastrale', component: SlideFicheCadastrale },
  { id: 'verification', title: 'Vérification', component: SlideVerification },
  { id: 'ccc', title: 'Programme CCC', component: SlideCCC },
  { id: 'stats', title: 'Impact & Objectifs', component: SlideStats },
  { id: 'business', title: 'Business Model', component: SlideBusiness },
  { id: 'roadmap', title: 'Roadmap', component: SlideRoadmap },
  { id: 'team', title: 'Équipe', component: SlideTeam },
  { id: 'pricing', title: 'Tarification', component: SlidePricing },
  { id: 'security', title: 'Sécurité', component: SlideSecurity },
  { id: 'partners', title: 'Partenaires', component: SlidePartners },
  { id: 'testimonials', title: 'Témoignages', component: SlideTestimonials },
  { id: 'demo', title: 'Démo', component: SlideDemo },
  { id: 'why-now', title: 'Pourquoi maintenant', component: SlideWhyNow },
  { id: 'contact', title: 'Contact', component: SlideContact },
];

/* ──────────────────── MAIN COMPONENT ──────────────────── */

const PitchPartenaires = () => {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(slides.length - 1, idx)));
  }, []);

  const prev = useCallback(() => goTo(current - 1), [current, goTo]);
  const next = useCallback(() => goTo(current + 1), [current, goTo]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowRight': case ' ': e.preventDefault(); next(); break;
        case 'ArrowLeft': e.preventDefault(); prev(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'Escape': if (isFullscreen) document.exitFullscreen?.(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, isFullscreen, toggleFullscreen]);

  const progress = ((current + 1) / slides.length) * 100;
  const CurrentSlide = slides[current].component;

  return (
    <>
      <Helmet>
        <title>Présentation BIC — Pitch Partenaires | Bureau d'Informations Cadastrales</title>
        <meta name="description" content="Découvrez comment le BIC numérise le cadastre en RDC. Présentation interactive pour les partenaires d'affaires." />
      </Helmet>

      {!isFullscreen && <Navigation />}

      <div
        ref={containerRef}
        className={`relative ${isFullscreen ? 'bg-black' : 'min-h-dvh pt-16'}`}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Slide container */}
        <div
          className={`relative overflow-hidden ${isFullscreen ? 'h-screen' : 'h-[calc(100dvh-4rem)]'}`}
          onTouchStart={(e) => {
            const t = e.changedTouches[0];
            touchStartRef.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - touchStartRef.current.x;
            const dy = t.clientY - touchStartRef.current.y;
            touchStartRef.current = null;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
              if (dx < 0) next();
              else prev();
            }
          }}
        >
          <CurrentSlide />
        </div>

        {/* Navigation overlay */}
        <div className="absolute inset-x-0 bottom-0 z-40">
          {/* Side arrows */}
          {current > 0 && (
            <button
              onClick={prev}
              className="absolute left-2 md:left-3 bottom-1/2 translate-y-1/2 p-3 md:p-2 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background transition-colors"
              aria-label="Slide précédente"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          {current < slides.length - 1 && (
            <button
              onClick={next}
              className="absolute right-2 md:right-3 bottom-1/2 translate-y-1/2 p-3 md:p-2 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background transition-colors"
              aria-label="Slide suivante"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          )}

          {/* Bottom bar */}
          <div className="flex items-center justify-center gap-3 py-2 md:py-3 px-4 bg-background/80 backdrop-blur border-t">
            {/* Dots — hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i === current ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  title={s.title}
                  aria-label={`Aller à ${s.title}`}
                />
              ))}
            </div>

            {/* Slide count */}
            <span className="text-xs text-muted-foreground font-mono ml-2">
              {current + 1} / {slides.length}
            </span>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md hover:bg-muted transition-colors ml-2"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize className="h-4 w-4 text-foreground" /> : <Maximize className="h-4 w-4 text-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {!isFullscreen && <Footer />}
    </>
  );
};

export default PitchPartenaires;
