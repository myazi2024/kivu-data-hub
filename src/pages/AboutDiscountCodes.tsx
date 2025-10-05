import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Users, Percent, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AboutDiscountCodes = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/myazi" className="text-sm text-muted-foreground hover:text-primary">
          ← Retour au catalogue
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Codes de remise</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Profitez de réductions exclusives avec nos codes promotionnels
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Qu'est-ce qu'un code de remise ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Un code de remise est un code promotionnel qui vous permet de bénéficier d'une réduction 
              sur vos recherches cadastrales. Ces codes sont distribués par nos revendeurs partenaires 
              ou lors de campagnes promotionnelles spéciales.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <Percent className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Réductions variables</h3>
                <p className="text-sm text-muted-foreground">
                  Le montant de la réduction varie selon le code (pourcentage ou montant fixe)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Codes partenaires</h3>
                <p className="text-sm text-muted-foreground">
                  Distribués par nos revendeurs partenaires agréés
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Comment obtenir un code de remise ?</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
                <div>
                  <p className="font-medium">Contactez un revendeur partenaire</p>
                  <p className="text-sm text-muted-foreground">
                    Nos revendeurs agréés disposent de codes de remise exclusifs à partager avec leurs clients
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
                <div>
                  <p className="font-medium">Suivez nos campagnes promotionnelles</p>
                  <p className="text-sm text-muted-foreground">
                    Abonnez-vous à notre newsletter pour recevoir des codes de remise lors de promotions spéciales
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
                <div>
                  <p className="font-medium">Devenez revendeur partenaire</p>
                  <p className="text-sm text-muted-foreground">
                    Rejoignez notre réseau de revendeurs et créez vos propres codes de remise pour vos clients
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Comment utiliser un code de remise ?</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
                <div>
                  <p className="font-medium">Effectuez une recherche cadastrale</p>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez les services dont vous avez besoin dans le catalogue
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
                <div>
                  <p className="font-medium">Sélectionnez "Code de remise"</p>
                  <p className="text-sm text-muted-foreground">
                    Dans la section des codes, choisissez l'option "Code de remise"
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
                <div>
                  <p className="font-medium">Saisissez votre code</p>
                  <p className="text-sm text-muted-foreground">
                    Entrez le code de remise que vous avez reçu et cliquez sur "Appliquer"
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge variant="outline" className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">4</Badge>
                <div>
                  <p className="font-medium">Profitez de votre réduction</p>
                  <p className="text-sm text-muted-foreground">
                    La réduction sera automatiquement appliquée au montant total de votre facture
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent/50 p-4 rounded-lg border border-accent">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Informations importantes
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Vérifiez la date d'expiration de votre code avant de l'utiliser</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Certains codes ont un nombre limité d'utilisations</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Les codes de remise ne sont pas cumulables avec les codes CCC</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Les codes sont sensibles à la casse (majuscules/minuscules)</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild>
              <Link to="/myazi">Commencer une recherche</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/partnership">
                <Users className="mr-2 h-4 w-4" />
                Devenir revendeur
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutDiscountCodes;
