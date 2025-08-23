import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Building, TrendingUp, Globe, MapPin, Phone, Mail, Clock } from 'lucide-react';

const JoinUs = () => {
  const partnershipTypes = [
    {
      icon: <Building className="h-8 w-8 text-primary" />,
      title: "Partenariats Institutionnels",
      description: "Collaboration avec les institutions gouvernementales et organisations internationales pour développer l'écosystème immobilier congolais."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Partenariats Privés",
      description: "Alliances stratégiques avec les entreprises privées pour innover dans le secteur immobilier et territorial."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Partenariats Technologiques",
      description: "Collaboration avec les acteurs tech pour développer des solutions numériques avancées."
    },
    {
      icon: <Globe className="h-8 w-8 text-primary" />,
      title: "Partenariats Internationaux",
      description: "Échanges et coopération avec les organismes internationaux spécialisés dans l'immobilier et l'urbanisme."
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-6">Rejoignez-nous</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Construisons ensemble l'avenir de l'immobilier en République Démocratique du Congo
            </p>
          </div>

          {/* Section Partenariats */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Partenariats</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {partnershipTypes.map((type, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      {type.icon}
                      <CardTitle className="text-xl">{type.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {type.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-secondary/50 mb-16">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Rejoignez notre réseau de partenaires</CardTitle>
                <CardDescription className="text-lg">
                  Ensemble, développons des solutions innovantes pour le secteur immobilier congolais
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button size="lg" className="mt-4">
                  Devenir Partenaire
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Section Contact */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Contact</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto text-center mb-12">
              Contactez le Bureau de l'Immobilier du Congo pour toute question concernant nos services, 
              publications ou possibilités de partenariat.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Informations de contact */}
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-8">Nos coordonnées</h3>
                
                <div className="space-y-6">
                  <Card className="border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Adresse</h4>
                          <p className="text-muted-foreground">
                            07, Rue Touristique<br />
                            Goma, Nord-Kivu<br />
                            République Démocratique du Congo
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Phone className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Téléphone</h4>
                          <p className="text-muted-foreground">+243 816 996 077</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Mail className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Email</h4>
                          <p className="text-muted-foreground">contact@bic.myazi.net.org</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Clock className="h-6 w-6 text-primary mt-1" />
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Horaires</h4>
                          <p className="text-muted-foreground">
                            Lundi - Vendredi : 8h00 - 17h00<br />
                            Samedi : 8h00 - 12h00
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Formulaire de contact */}
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-8">Envoyez-nous un message</h3>
                
                <Card className="border-border">
                  <CardContent className="p-6">
                    <form className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Prénom</Label>
                          <Input id="firstName" placeholder="Votre prénom" />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Nom</Label>
                          <Input id="lastName" placeholder="Votre nom" />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="votre@email.com" />
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Téléphone (optionnel)</Label>
                        <Input id="phone" placeholder="+243 ..." />
                      </div>
                      
                      <div>
                        <Label htmlFor="subject">Sujet</Label>
                        <Input id="subject" placeholder="Objet de votre message" />
                      </div>
                      
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Décrivez votre demande ou question..."
                          rows={6}
                        />
                      </div>
                      
                      <Button type="submit" className="w-full">
                        Envoyer le message
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default JoinUs;