import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Users, Percent, CheckCircle2, ArrowRight, ExternalLink, Phone, Mail, MessageCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const AboutDiscountCodes = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
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

          <div>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Questions fréquemment posées
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Comment puis-je vérifier si mon code de remise est valide ?</AccordionTrigger>
                <AccordionContent>
                  Vous pouvez vérifier la validité de votre code en le saisissant dans le champ prévu à cet effet lors de votre commande. Si le code est valide, la réduction sera automatiquement appliquée et affichée. Si le code est expiré ou invalide, un message d'erreur s'affichera.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>Puis-je combiner un code de remise avec un code CCC ?</AccordionTrigger>
                <AccordionContent>
                  Non, les codes de remise et les codes CCC ne sont pas cumulables. Vous devez choisir l'un ou l'autre lors de votre commande. Le système vous permettra d'utiliser celui qui vous offre le meilleur avantage.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>Où puis-je trouver des codes de remise ?</AccordionTrigger>
                <AccordionContent>
                  Les codes de remise sont distribués par nos revendeurs partenaires agréés. Vous pouvez également recevoir des codes lors de campagnes promotionnelles en vous abonnant à notre newsletter ou en suivant nos réseaux sociaux. Contactez-nous pour connaître nos revendeurs dans votre région.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>Mon code de remise ne fonctionne pas, que faire ?</AccordionTrigger>
                <AccordionContent>
                  Vérifiez d'abord que le code est correctement saisi (attention aux majuscules/minuscules). Assurez-vous également que le code n'est pas expiré et qu'il n'a pas déjà été utilisé. Si le problème persiste, contactez-nous via nos canaux de support avec le code concerné.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger>Les codes de remise ont-ils une limite d'utilisation ?</AccordionTrigger>
                <AccordionContent>
                  Oui, chaque code de remise a ses propres conditions. Certains codes peuvent être utilisés plusieurs fois par différents utilisateurs jusqu'à épuisement du quota, tandis que d'autres sont à usage unique. Ces informations sont généralement communiquées par le revendeur qui distribue le code.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-6">
                <AccordionTrigger>Comment devenir revendeur et distribuer mes propres codes ?</AccordionTrigger>
                <AccordionContent>
                  Pour devenir revendeur partenaire et créer vos propres codes de remise, consultez notre page Partenariat ou contactez-nous directement. Nous vous expliquerons les conditions et les avantages du programme de revendeurs.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-7">
                <AccordionTrigger>Quelle est la différence entre un code de remise et un code CCC ?</AccordionTrigger>
                <AccordionContent>
                  Un code de remise est un code promotionnel distribué par nos partenaires ou lors de campagnes, avec une valeur variable. Un code CCC (Code Contributeur Cadastral) est un code que vous gagnez en contribuant à notre base de données, d'une valeur fixe de 5 USD et valable 90 jours. Les deux offrent des réductions mais ont des origines et conditions différentes.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Besoin d'aide ?
            </h2>
            <p className="text-muted-foreground mb-4">
              Notre équipe est disponible pour répondre à toutes vos questions sur les codes de remise et vous aider à trouver un revendeur partenaire.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <a 
                href="tel:+243816996077" 
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Téléphone</p>
                  <p className="text-xs text-muted-foreground">+243 816 996 077</p>
                </div>
              </a>
              
              <a 
                href="https://wa.me/243816996077" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">+243 816 996 077</p>
                </div>
              </a>
              
              <a 
                href="mailto:contact@bic.cd" 
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">contact@bic.cd</p>
                </div>
              </a>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild>
              <Link to="/">Commencer une recherche</Link>
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
