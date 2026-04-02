import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, CheckCircle2, Map, Search, Shield, FileText, BarChart3, Globe,
  Play, Send, ArrowRight, TrendingUp, Users, Clock, Zap, Building2, Code2,
  GraduationCap, Handshake, Phone, Mail
} from 'lucide-react';
import bicLogo from '@/assets/bic-logo.png';

const features = [
  { icon: Map, title: 'Cartographie cadastrale', description: 'Visualisation interactive des parcelles sur fond de carte satellite avec données géolocalisées.' },
  { icon: Search, title: 'Recherche de parcelles', description: 'Recherche rapide par numéro de parcelle, propriétaire ou localisation géographique.' },
  { icon: Shield, title: 'Vérification foncière', description: 'Vérification de l\'authenticité des titres de propriété et certificats cadastraux.' },
  { icon: FileText, title: 'Certificats numériques', description: 'Génération de certificats cadastraux vérifiables avec QR code anti-fraude.' },
  { icon: BarChart3, title: 'Analytique foncière', description: 'Tableaux de bord et statistiques sur les tendances du marché foncier.' },
  { icon: Globe, title: 'Couverture nationale', description: 'Données couvrant l\'ensemble des provinces de la RDC.' },
];

const metrics = [
  { value: '50 000+', label: 'Parcelles numérisées', icon: Map },
  { value: '-60%', label: 'Réduction des litiges', icon: TrendingUp },
  { value: '< 5 min', label: 'Temps de vérification', icon: Clock },
  { value: '26', label: 'Provinces couvertes', icon: Globe },
];

const businessModels = [
  { icon: Code2, title: 'Accès API', description: 'Intégration directe des données cadastrales dans vos systèmes via notre API REST sécurisée.', benefits: ['Données en temps réel', 'Documentation complète', 'Support technique dédié'] },
  { icon: Building2, title: 'Licence institutionnelle', description: 'Accès complet à la plateforme pour les administrations et organisations avec gestion multi-utilisateurs.', benefits: ['Tableau de bord personnalisé', 'Formation des équipes', 'Rapports périodiques'] },
  { icon: GraduationCap, title: 'Partenariat académique', description: 'Accès aux données anonymisées pour la recherche et l\'enseignement sur le foncier en RDC.', benefits: ['Données anonymisées', 'Publications conjointes', 'Stages et mémoires'] },
];

const testimonials = [
  { name: 'Me. Kabongo', role: 'Notaire, Lubumbashi', quote: 'Le BIC a transformé notre processus de vérification foncière. Ce qui prenait des semaines se fait maintenant en quelques minutes.' },
  { name: 'Arch. Mutombo', role: 'Bureau d\'études, Kinshasa', quote: 'L\'accès aux données cadastrales numériques nous permet de mieux planifier nos projets d\'aménagement.' },
];

const PitchPartenaires = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', organization: '', message: '' });
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setSending(true);
    setTimeout(() => {
      toast({ title: 'Message envoyé', description: 'Nous vous répondrons dans les plus brefs délais.' });
      setFormData({ name: '', email: '', organization: '', message: '' });
      setSending(false);
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>Présentation BIC — Pitch Partenaires | Bureau d'Information Cadastrale</title>
        <meta name="description" content="Découvrez comment le BIC numérise le cadastre en RDC. Rejoignez notre réseau de partenaires d'affaires." />
      </Helmet>
      <Navigation />

      <main className="min-h-dvh">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="container mx-auto px-4 text-center">
            <span className="inline-block mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Présentation Partenaires
            </span>
            <img src={bicLogo} alt="Logo BIC" className="mx-auto h-16 md:h-20 mb-6" />
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 max-w-3xl mx-auto leading-tight">
              Le cadastre congolais, enfin numérique.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Le BIC centralise, sécurise et rend accessibles les données foncières de la RDC pour tous les acteurs du secteur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="seloger">
                <Link to="/test/map">Accéder à l'environnement test <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#contact">Nous contacter</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Problème & Solution */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Problème & Solution</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-destructive/10">
                      <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">Le problème</h3>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex gap-2"><span className="text-destructive font-bold">•</span> Registres fonciers papier dispersés et vulnérables</li>
                    <li className="flex gap-2"><span className="text-destructive font-bold">•</span> 70% des litiges judiciaires liés au foncier</li>
                    <li className="flex gap-2"><span className="text-destructive font-bold">•</span> Absence de base de données centralisée</li>
                    <li className="flex gap-2"><span className="text-destructive font-bold">•</span> Processus de vérification lent et coûteux</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">La solution BIC</h3>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex gap-2"><span className="text-primary font-bold">✓</span> Plateforme numérique centralisée et sécurisée</li>
                    <li className="flex gap-2"><span className="text-primary font-bold">✓</span> Vérification instantanée des titres fonciers</li>
                    <li className="flex gap-2"><span className="text-primary font-bold">✓</span> Cartographie interactive géolocalisée</li>
                    <li className="flex gap-2"><span className="text-primary font-bold">✓</span> Certificats numériques infalsifiables (QR code)</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Fonctionnalités clés */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">Fonctionnalités clés</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Une suite complète d'outils pour la gestion et la consultation des données cadastrales.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((f) => (
                <Card key={f.title} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Vidéo démo */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Voir la plateforme en action</h2>
            <div className="max-w-3xl mx-auto aspect-video bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">Vidéo de démonstration — bientôt disponible</p>
              </div>
            </div>
          </div>
        </section>

        {/* Valeur ajoutée */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">Valeur ajoutée pour les partenaires</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto mb-16">
              {metrics.map((m) => (
                <Card key={m.label} className="text-center">
                  <CardContent className="p-6">
                    <m.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                    <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{m.value}</div>
                    <p className="text-xs md:text-sm text-muted-foreground">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-foreground text-center mb-8">Ce que disent nos partenaires</h3>
              <div className="grid md:grid-cols-2 gap-6">
                {testimonials.map((t) => (
                  <Card key={t.name}>
                    <CardContent className="p-6">
                      <p className="text-muted-foreground italic mb-4">"{t.quote}"</p>
                      <div>
                        <p className="font-semibold text-foreground">{t.name}</p>
                        <p className="text-sm text-muted-foreground">{t.role}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Business model */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">Business Model & Opportunités</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Plusieurs modèles de collaboration adaptés à votre secteur d'activité.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {businessModels.map((bm) => (
                <Card key={bm.title} className="flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <bm.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{bm.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{bm.description}</p>
                    <ul className="space-y-1.5">
                      {bm.benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Appel à l'action + formulaire */}
        <section id="contact" className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Devenez partenaire du BIC</h2>
                <p className="text-muted-foreground mb-6">
                  Rejoignez notre réseau et contribuez à la modernisation du cadastre en RDC.
                  Accédez à des données uniques et créez de la valeur pour vos clients.
                </p>
                <div className="space-y-4 mb-8">
                  <Button asChild size="lg" variant="seloger" className="w-full sm:w-auto">
                    <Link to="/test/map">
                      <Zap className="mr-2 h-4 w-4" /> Accéder à l'environnement test
                    </Link>
                  </Button>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +243 816 996 077</div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> contact@bic.cd</div>
                </div>
              </div>
              <Card>
                <CardContent className="p-6">
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
                        className="flex w-full rounded-md border border-input bg-background px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 min-h-[100px] resize-y"
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
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default PitchPartenaires;
