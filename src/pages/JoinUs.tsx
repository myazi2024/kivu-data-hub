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
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Rejoignez-nous</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Construisons l'avenir immobilier en RDC
            </p>
          </div>

          {/* Section Partenariats */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-center mb-4">Partenariats</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {partnershipTypes.map((type, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start space-x-2">
                    <div className="mt-0.5">
                      {React.cloneElement(type.icon, { className: "h-5 w-5 text-primary" })}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold mb-1">{type.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="bg-secondary/20 p-4 text-center mb-8">
              <h3 className="text-base font-semibold mb-2">Rejoignez notre réseau</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Développons ensemble l'immobilier congolais
              </p>
              <Button size="sm">Devenir Partenaire</Button>
            </Card>
          </section>

          {/* Section Contact */}
          <section>
            <h2 className="text-lg font-semibold text-center mb-4">Contact</h2>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-6">
              Contactez BIC pour nos services, publications ou partenariats
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informations de contact */}
              <div>
                <h3 className="text-base font-medium mb-4">Coordonnées</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium mb-1">Adresse</p>
                      <p className="text-xs text-muted-foreground">
                        07, Rue Touristique<br />
                        Goma, Nord-Kivu, RDC
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg">
                    <Phone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium mb-1">Téléphone</p>
                      <p className="text-xs text-muted-foreground">+243 816 996 077</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg">
                    <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium mb-1">Email</p>
                      <p className="text-xs text-muted-foreground">contact@bic.myazi.net.org</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-secondary/10 rounded-lg">
                    <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium mb-1">Horaires</p>
                      <p className="text-xs text-muted-foreground">
                        Lun-Ven: 8h-17h<br />
                        Sam: 8h-12h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formulaire de contact */}
              <div>
                <h3 className="text-base font-medium mb-4">Message</h3>
                
                <Card className="p-4">
                  <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="firstName" className="text-xs">Prénom</Label>
                        <Input id="firstName" placeholder="Prénom" className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-xs">Nom</Label>
                        <Input id="lastName" placeholder="Nom" className="h-8 text-xs" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input id="email" type="email" placeholder="email@exemple.com" className="h-8 text-xs" />
                    </div>
                    
                    <div>
                      <Label htmlFor="subject" className="text-xs">Sujet</Label>
                      <Input id="subject" placeholder="Objet du message" className="h-8 text-xs" />
                    </div>
                    
                    <div>
                      <Label htmlFor="message" className="text-xs">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Votre message..."
                        rows={4}
                        className="text-xs"
                      />
                    </div>
                    
                    <Button type="submit" size="sm" className="w-full text-xs">
                      Envoyer
                    </Button>
                  </form>
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