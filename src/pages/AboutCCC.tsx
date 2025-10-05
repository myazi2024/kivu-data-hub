import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Clock, DollarSign, CheckCircle2, ArrowRight, Phone, Mail, MessageCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const AboutCCC = () => {
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
            <Gift className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Code Contributeur Cadastral (CCC)</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Gagnez des réductions en contribuant à enrichir notre base de données cadastrale
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Qu'est-ce qu'un Code CCC ?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Le Code Contributeur Cadastral (CCC) est un code de réduction que vous recevez en échange 
              de votre contribution à notre base de données. Chaque fois que vous ajoutez des informations 
              sur une parcelle cadastrale, vous obtenez un code CCC que vous pouvez utiliser pour réduire 
              le coût de vos futures recherches.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <DollarSign className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Valeur</h3>
                <p className="text-sm text-muted-foreground">
                  Chaque code CCC a une valeur de <strong>5 USD</strong>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Validité</h3>
                <p className="text-sm text-muted-foreground">
                  Valable pendant <strong>90 jours</strong> après sa création
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardContent className="pt-6">
                <CheckCircle2 className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Usage unique</h3>
                <p className="text-sm text-muted-foreground">
                  Utilisable <strong>une seule fois</strong> sur une facture
                </p>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Comment obtenir un Code CCC ?</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">1</Badge>
                <div>
                  <p className="font-medium">Effectuez une recherche cadastrale</p>
                  <p className="text-sm text-muted-foreground">
                    Recherchez une parcelle dans notre catalogue de services
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">2</Badge>
                <div>
                  <p className="font-medium">Complétez le formulaire de contribution</p>
                  <p className="text-sm text-muted-foreground">
                    Si vous avez des informations supplémentaires sur la parcelle, cliquez sur "Contribuer" 
                    et remplissez le formulaire avec les données que vous possédez
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">3</Badge>
                <div>
                  <p className="font-medium">Recevez votre code CCC</p>
                  <p className="text-sm text-muted-foreground">
                    Après validation de votre contribution, un code CCC est généré automatiquement 
                    et apparaît dans votre tableau de bord
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Badge className="shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center">4</Badge>
                <div>
                  <p className="font-medium">Utilisez votre code</p>
                  <p className="text-sm text-muted-foreground">
                    Lors de votre prochaine commande, sélectionnez "Code Contributeur Cadastral" 
                    et saisissez votre code pour bénéficier de la réduction
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
                <span>Vos codes CCC sont visibles dans l'onglet "Codes CCC" de votre tableau de bord</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Vous pouvez cumuler plusieurs codes CCC en contribuant sur différentes parcelles</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Les codes expirés ne peuvent plus être utilisés</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Chaque code ne peut être utilisé qu'une seule fois</span>
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
                <AccordionTrigger>Puis-je utiliser plusieurs codes CCC sur une même facture ?</AccordionTrigger>
                <AccordionContent>
                  Non, vous ne pouvez utiliser qu'un seul code CCC par facture. Cependant, vous pouvez cumuler plusieurs codes CCC dans votre compte et les utiliser sur différentes factures.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger>Que se passe-t-il si je ne valide pas mes contributions ?</AccordionTrigger>
                <AccordionContent>
                  Les contributions sont automatiquement validées après soumission. Un code CCC est généré immédiatement et reste valable pendant 90 jours. Assurez-vous de fournir des informations exactes pour éviter tout problème.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger>Puis-je prolonger la validité d'un code CCC expiré ?</AccordionTrigger>
                <AccordionContent>
                  Non, les codes CCC expirés ne peuvent pas être prolongés ou réactivés. Nous vous recommandons d'utiliser vos codes avant leur date d'expiration. Vous pouvez toujours générer de nouveaux codes en effectuant de nouvelles contributions.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger>Quel type d'informations puis-je contribuer pour obtenir un code CCC ?</AccordionTrigger>
                <AccordionContent>
                  Vous pouvez contribuer diverses informations sur une parcelle : coordonnées GPS, superficie exacte, photos du terrain, informations sur le propriétaire, historique des transactions, servitudes, etc. Plus vos informations sont complètes et précises, plus elles sont utiles pour la base de données.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger>Comment puis-je vérifier le solde de mes codes CCC ?</AccordionTrigger>
                <AccordionContent>
                  Tous vos codes CCC actifs et leur date d'expiration sont visibles dans l'onglet "Codes CCC" de votre tableau de bord de facturation. Vous y trouverez également l'historique de vos codes utilisés.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-6">
                <AccordionTrigger>Puis-je transférer mes codes CCC à quelqu'un d'autre ?</AccordionTrigger>
                <AccordionContent>
                  Non, les codes CCC sont personnels et liés à votre compte. Ils ne peuvent pas être transférés à un autre utilisateur.
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
              Notre équipe est à votre disposition pour répondre à toutes vos questions concernant les codes CCC.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <a 
                href="tel:+243123456789" 
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Téléphone</p>
                  <p className="text-xs text-muted-foreground">+243 123 456 789</p>
                </div>
              </a>
              
              <a 
                href="https://wa.me/243123456789" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">+243 123 456 789</p>
                </div>
              </a>
              
              <a 
                href="mailto:support@example.cd" 
                className="flex items-center gap-3 p-4 bg-background rounded-lg border hover:border-primary transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">support@example.cd</p>
                </div>
              </a>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild>
              <Link to="/myazi">Commencer une recherche</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/billing-dashboard">Voir mes codes CCC</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutCCC;
