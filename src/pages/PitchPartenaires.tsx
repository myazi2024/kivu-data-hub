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
  Rocket, Flag, Globe2, User, Cpu, ShieldCheck, DollarSign, CreditCard, Activity
} from 'lucide-react';
import bicLogo from '@/assets/bic-logo.png';
import heroSkyline from '@/assets/hero-skyline.webp';
import mapViz from '@/assets/bic-map-screenshot.jpg';
import territorialMap from '@/assets/territorial-map-illustration.webp';
import gomaHero from '@/assets/goma-city-hero.jpg';

/* ──────────────────── SLIDE COMPONENTS ──────────────────── */

const SlideWrapper: React.FC<{ bg?: string; overlay?: boolean; children: React.ReactNode; className?: string }> = ({ bg, overlay = false, children, className = '' }) => (
  <div className={`relative w-full h-full flex flex-col overflow-hidden ${className}`}>
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
        Projet collaboratif de numérisation du cadastre congolais.
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
        <p className="text-lg text-muted-foreground mt-3 max-w-3xl">Un système cadastral hérité de l'époque coloniale, resté sur papier, fragmenté entre 26 provinces et source de conflits majeurs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
        {[
          { icon: AlertTriangle, value: '70%', label: 'des litiges judiciaires en RDC sont liés au foncier', color: 'text-destructive' },
          { icon: FileText, value: '0%', label: 'de numérisation du cadastre avant le BIC', color: 'text-orange-500' },
          { icon: Clock, value: '2 mois', label: 'en moyenne pour vérifier un titre foncier manuellement', color: 'text-amber-500' },
          { icon: Shield, value: '45%', label: 'des titres fonciers contiennent des irrégularités', color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="p-3 rounded-full bg-destructive/10 mb-4">
              <s.icon className={`h-7 w-7 ${s.color}`} />
            </div>
            <div className={`text-4xl md:text-5xl font-bold ${s.color} mb-2`}>{s.value}</div>
            <p className="text-sm text-muted-foreground">{s.label}</p>
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
        <p className="text-lg text-white/80 mt-3 max-w-3xl">Une infrastructure numérique souveraine qui centralise, sécurise et démocratise l'accès aux données cadastrales de la RDC.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 max-w-5xl">
        {[
          { icon: Database, title: 'Centralisation', desc: 'Toutes les données foncières de 26 provinces réunies dans une base de données unique, structurée et interrogeable en temps réel.' },
          { icon: Lock, title: 'Sécurisation', desc: 'Certificats numériques avec QR code infalsifiable, traçabilité complète des mutations et historique de propriété immuable.' },
          { icon: Eye, title: 'Transparence', desc: 'Accès public aux informations cadastrales via une interface web moderne. Chaque citoyen peut vérifier un titre foncier en moins de 5 minutes.' },
          { icon: Layers, title: 'Interopérabilité', desc: 'API REST documentée pour l\'intégration avec les systèmes existants : SIG, administrations, banques, notaires et promoteurs immobiliers.' },
        ].map((p) => (
          <div key={p.title} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 p-6 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-primary/20">
                <p.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-white">{p.title}</h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">{p.desc}</p>
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
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Visualisez l'ensemble du territoire congolais avec des données cadastrales géolocalisées. Chaque province est cartographiée avec ses communes, quartiers et parcelles individuelles.
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

/* ── Slide 6: Recherche cadastrale ── */
const SlideSearch = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col md:flex-row bg-background">
      <div className="md:w-1/2 flex flex-col justify-center px-6 md:px-16 py-10">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Fonctionnalité phare</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">Recherche cadastrale intelligente</h2>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Le moteur de recherche le plus avancé pour les données cadastrales congolaises. Trouvez n'importe quelle parcelle en quelques secondes.
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
        {/* Mockup de la recherche */}
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

/* ── Slide 7: Fiche Cadastrale ── */
const SlideFicheCadastrale = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-blue-50/50 via-background to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Document officiel</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">La Fiche Cadastrale numérique</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Un document complet et vérifiable généré automatiquement pour chaque parcelle enregistrée dans le système BIC.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto flex-1">
        {/* Mockup visuel */}
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
            {/* SVG Sketch mockup */}
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
        {/* Sections de la fiche */}
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

/* ── Slide 8: Vérification & Certificats ── */
const SlideVerification = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-green-50/50 via-background to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Anti-fraude</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Vérification & Certificats numériques</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Chaque document généré par le BIC est vérifiable instantanément grâce à un QR code unique et un code de vérification cryptographique.</p>
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
              { icon: Landmark, name: 'Permis de bâtir' },
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

/* ── Slide 9: Programme CCC ── */
const SlideCCC = () => (
  <SlideWrapper bg={gomaHero} overlay>
    <div className="flex-1 flex flex-col px-6 md:px-16 py-10 md:py-16">
      <div className="mb-8">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Innovation sociale</span>
        <h2 className="text-3xl md:text-5xl font-bold text-white mt-2">Programme Contributeur CCC</h2>
        <p className="text-lg text-white/80 mt-3 max-w-3xl">Les citoyens contribuent à la numérisation du cadastre et sont récompensés par des codes de réduction sur les services BIC.</p>
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

/* ── Slide 10: Chiffres clés ── */
const SlideStats = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Impact</span>
      <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-10 text-center">Chiffres clés</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {[
          { value: '1 000+', label: 'Parcelles numérisées', sublabel: 'Objectif 2026 : 50 000', icon: Map },
          { value: '26', label: 'Provinces couvertes', sublabel: 'Territoire national complet', icon: Globe },
          { value: '100%', label: 'Traçabilité des mutations', sublabel: 'Historique complet et vérifiable', icon: TrendingUp },
          { value: '< 5 min', label: 'Vérification d\'un titre', sublabel: 'Contre 2 mois en procédure manuelle', icon: Clock },
          { value: '8', label: 'Services numériques intégrés', sublabel: 'Écosystème cadastral complet', icon: Zap },
          { value: '4', label: 'Types de partenariats', sublabel: 'Institutionnel, commercial, académique, tech', icon: Handshake },
        ].map((m) => (
          <div key={m.label} className="bg-card rounded-xl border p-6 text-center shadow-sm hover:shadow-md transition-shadow">
            <m.icon className="h-6 w-6 text-primary mx-auto mb-3" />
            <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{m.value}</div>
            <p className="text-sm text-foreground font-medium">{m.label}</p>
            {m.sublabel && <p className="text-[11px] text-muted-foreground mt-1">{m.sublabel}</p>}
          </div>
        ))}
      </div>
    </div>
  </SlideWrapper>
);

/* ── Slide 11: Business Model ── */
const SlideBusiness = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-14">
      <div className="mb-6 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Modèle économique</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Business Model & Opportunités</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto flex-1 w-full">
        {[
          { icon: Building2, title: 'Partenariat Institutionnel', desc: 'Administrations provinciales, ministères, mairies. Accès complet à la plateforme pour la planification urbaine et la gouvernance foncière.', benefits: ['Tableau de bord analytique dédié', 'Formation des agents', 'Rapports statistiques périodiques', 'Intégration avec les systèmes existants'] },
          { icon: Code2, title: 'Partenariat Commercial', desc: 'Banques, notaires, agences immobilières, promoteurs. Accès API pour intégrer les données cadastrales dans vos processus métier.', benefits: ['API REST sécurisée et documentée', 'Vérification automatisée des titres', 'Webhooks pour notifications temps réel', 'Support technique prioritaire'] },
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

/* ── Slide 12: Roadmap & Vision ── */
const SlideRoadmap = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-indigo-50/50 via-background to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Vision</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Roadmap & Déploiement</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Un plan de déploiement progressif pour couvrir l'ensemble du territoire congolais en 3 phases.</p>
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
            items: ['Extension à Kinshasa et 5 provinces clés', 'Objectif : 50 000 parcelles numérisées', 'Recrutement d\'équipes provinciales', 'Lancement de l\'API commerciale', 'Partenariats bancaires et notariaux'],
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

/* ── Slide 13: Équipe ── */
const SlideTeam = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">L'équipe</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">Les porteurs du projet</h2>
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

/* ── Slide 14: Tarification ── */
const SlidePricing = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Revenus</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Modèle de tarification</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Quatre sources de revenus complémentaires pour un modèle économique durable et scalable.</p>
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

/* ── Slide 15: Sécurité & Conformité ── */
const SlideSecurity = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50/50 via-background to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20 px-6 md:px-16 py-10 md:py-14">
      <div className="mb-8 text-center">
        <span className="text-sm font-semibold text-primary uppercase tracking-wider">Confiance</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">Sécurité & Conformité</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">Une architecture de sécurité robuste, conforme à la législation congolaise et aux standards internationaux.</p>
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

/* ── Slide 16: Partenaires actuels ── */
const SlidePartners = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-secondary/5 via-background to-primary/5 px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Réseau</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">Nos partenaires actuels</h2>
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

/* ── Slide 17: Témoignages ── */
const SlideTestimonials = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-background px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Retours terrain</span>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-10 text-center">Ce que disent nos utilisateurs</h2>
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

/* ── Slide 18: Démo ── */
const SlideDemo = () => (
  <SlideWrapper>
    <div className="flex-1 flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/5 px-6 md:px-16 py-10 md:py-16 items-center justify-center">
      <span className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Démonstration</span>
      <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-center">Testez la plateforme</h2>
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-2xl">
        Accédez à notre environnement de test avec des données réelles et explorez toutes les fonctionnalités de la plateforme BIC.
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

/* ── Slide 19: Contact ── */
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
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Rejoignez notre réseau et contribuez à la modernisation du cadastre en RDC. Accédez à des données uniques et créez de la valeur pour vos clients et votre organisation.
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
  { id: 'search', title: 'Recherche', component: SlideSearch },
  { id: 'fiche', title: 'Fiche Cadastrale', component: SlideFicheCadastrale },
  { id: 'verification', title: 'Vérification', component: SlideVerification },
  { id: 'ccc', title: 'Programme CCC', component: SlideCCC },
  { id: 'stats', title: 'Chiffres clés', component: SlideStats },
  { id: 'business', title: 'Business Model', component: SlideBusiness },
  { id: 'roadmap', title: 'Roadmap', component: SlideRoadmap },
  { id: 'team', title: 'Équipe', component: SlideTeam },
  { id: 'pricing', title: 'Tarification', component: SlidePricing },
  { id: 'security', title: 'Sécurité', component: SlideSecurity },
  { id: 'partners', title: 'Partenaires', component: SlidePartners },
  { id: 'testimonials', title: 'Témoignages', component: SlideTestimonials },
  { id: 'demo', title: 'Démo', component: SlideDemo },
  { id: 'contact', title: 'Contact', component: SlideContact },
];

/* ──────────────────── MAIN COMPONENT ──────────────────── */

const PitchPartenaires = () => {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        <div className={`relative overflow-hidden ${isFullscreen ? 'h-screen' : 'h-[calc(100dvh-4rem)]'}`}>
          <CurrentSlide />
        </div>

        {/* Navigation overlay */}
        <div className="absolute inset-x-0 bottom-0 z-40">
          {/* Side arrows */}
          {current > 0 && (
            <button
              onClick={prev}
              className="absolute left-3 bottom-1/2 translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background transition-colors"
              aria-label="Slide précédente"
            >
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
          )}
          {current < slides.length - 1 && (
            <button
              onClick={next}
              className="absolute right-3 bottom-1/2 translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur border shadow-lg hover:bg-background transition-colors"
              aria-label="Slide suivante"
            >
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          )}

          {/* Bottom bar */}
          <div className="flex items-center justify-center gap-3 py-3 px-4 bg-background/80 backdrop-blur border-t">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
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
