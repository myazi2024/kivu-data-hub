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
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
          ← Retour au catalogue
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">Programme Contributeur Cadastral</CardTitle>
          </div>
          <p className="text-muted-foreground text-lg">
            Participez à la construction d'un cadastre moderne et gagnez des réductions
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Introduction longue et pédagogique */}
          <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 rounded-lg border border-primary/10">
            <h2 className="text-2xl font-bold mb-4 text-primary">Comprendre le cadastre : un outil essentiel pour tous</h2>
            
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="text-base">
                Le <strong>cadastre</strong> est un registre public qui recense toutes les propriétés foncières d'un territoire. 
                Imaginez-le comme un grand livre qui contient une carte détaillée de chaque terrain, maison ou immeuble, 
                avec des informations sur qui en est le propriétaire, sa superficie exacte, et son emplacement précis.
              </p>
              
              <p className="text-base">
                <strong>Pourquoi est-ce important pour vous ?</strong> Que vous soyez propriétaire, acheteur, investisseur, 
                ou simplement citoyen, le cadastre vous permet de :
              </p>
              
              <ul className="space-y-2 ml-6 list-disc">
                <li>Vérifier officiellement qui possède un terrain avant de l'acheter</li>
                <li>Connaître les limites exactes de votre propriété pour éviter les conflits avec vos voisins</li>
                <li>Obtenir des documents nécessaires pour les transactions immobilières</li>
                <li>Sécuriser vos droits de propriété avec des preuves officielles</li>
                <li>Planifier des constructions en connaissance de cause</li>
              </ul>

              <p className="text-base">
                <strong>Le défi en République Démocratique du Congo :</strong> Malheureusement, notre pays ne dispose pas 
                encore d'un cadastre complet et moderne. De nombreuses parcelles ne sont pas enregistrées, beaucoup 
                d'informations sont incomplètes ou dispersées dans différents bureaux administratifs. Cela crée des 
                problèmes : litiges fonciers, fraudes, difficultés pour obtenir des prêts bancaires, blocage des projets 
                de développement...
              </p>

              <p className="text-base">
                <strong>Notre mission :</strong> Nous construisons progressivement une base de données cadastrale moderne, 
                fiable et accessible à tous. Mais ce travail est colossal et ne peut se faire sans vous !
              </p>

              <p className="text-base font-semibold text-foreground">
                C'est pourquoi nous avons créé le Programme Contributeur Cadastral : vous nous aidez à compléter 
                les informations sur les parcelles que vous connaissez, et en échange, vous bénéficiez de réductions 
                sur nos services. Un gagnant-gagnant pour construire ensemble un cadastre moderne !
              </p>
            </div>
          </div>

          {/* Section Code CCC avec définitions */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Qu'est-ce qu'un Code Contributeur Cadastral (CCC) ?</h2>
            
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Le <strong>Code Contributeur Cadastral (CCC)</strong> est un <span className="text-foreground font-medium">code promotionnel personnel</span> que 
                vous recevez automatiquement lorsque vous partagez des informations utiles sur une parcelle dans notre système.
              </p>

              <div className="bg-accent/30 p-4 rounded-lg border-l-4 border-primary">
                <p className="text-sm font-semibold text-foreground mb-2">📚 Définition simple :</p>
                <p className="text-sm text-muted-foreground">
                  Une <strong>parcelle cadastrale</strong> (ou simplement "parcelle") est un terrain délimité avec un numéro unique 
                  qui permet de l'identifier officiellement. C'est comme une "carte d'identité" pour un terrain.
                </p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Chaque fois que vous contribuez avec des informations vérifiées sur une parcelle, 
                notre système génère automatiquement un code CCC que vous pouvez ensuite utiliser comme une 
                <span className="text-foreground font-medium"> réduction de 5 USD</span> sur vos prochains achats de services cadastraux.
              </p>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-lg border border-primary/20">
            <h3 className="text-xl font-semibold mb-4 text-foreground">Les caractéristiques de votre Code CCC</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <DollarSign className="h-10 w-10 text-primary mb-2" />
                <h4 className="font-semibold text-foreground">Valeur fixe de 5 USD</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Chaque code que vous gagnez vous donne droit à une <strong>réduction de 5 dollars américains</strong>. 
                  Cette réduction s'applique directement sur le montant total de votre facture lors de l'achat de services 
                  cadastraux (extraits, recherches, consultations, etc.).
                </p>
              </div>

              <div className="space-y-2">
                <Clock className="h-10 w-10 text-primary mb-2" />
                <h4 className="font-semibold text-foreground">Validité de 90 jours</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Votre code CCC est <strong>valable pendant 90 jours</strong> (environ 3 mois) à partir de sa date de création. 
                  Passé ce délai, le code expire automatiquement. Veillez donc à l'utiliser avant son expiration pour ne pas 
                  perdre votre réduction.
                </p>
              </div>

              <div className="space-y-2">
                <CheckCircle2 className="h-10 w-10 text-primary mb-2" />
                <h4 className="font-semibold text-foreground">Usage unique</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Chaque code CCC ne peut être utilisé <strong>qu'une seule fois</strong>. Une fois que vous l'avez appliqué 
                  sur une facture et effectué le paiement, le code devient automatiquement inactif. Mais rassurez-vous : 
                  vous pouvez accumuler plusieurs codes en contribuant sur différentes parcelles !
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Comment obtenir un Code CCC ? (Guide étape par étape)</h2>
            
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Obtenir un code CCC est simple et gratuit. Voici le processus complet expliqué en détail :
            </p>

            <div className="space-y-6">
              <div className="flex gap-4 p-4 bg-accent/20 rounded-lg border border-accent/50">
                <Badge className="shrink-0 h-8 w-8 rounded-full p-0 flex items-center justify-center text-base">1</Badge>
                <div className="space-y-2">
                  <p className="font-semibold text-lg text-foreground">Effectuez une recherche cadastrale</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rendez-vous sur la page d'accueil et utilisez le moteur de recherche pour trouver une parcelle. 
                    Vous pouvez rechercher par <strong>numéro de parcelle</strong> (exemple : "GOMA-001234") ou par 
                    <strong> adresse</strong> (exemple : "Avenue de la Paix, Quartier Himbi").
                  </p>
                  <div className="bg-background/80 p-3 rounded border border-border mt-2">
                    <p className="text-xs font-semibold text-foreground mb-1">📚 Bon à savoir :</p>
                    <p className="text-xs text-muted-foreground">
                      Une <strong>recherche cadastrale</strong> consiste à consulter les informations officielles enregistrées 
                      sur une propriété : le nom du propriétaire, la superficie, les limites du terrain, l'historique des 
                      transactions, etc.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-accent/20 rounded-lg border border-accent/50">
                <Badge className="shrink-0 h-8 w-8 rounded-full p-0 flex items-center justify-center text-base">2</Badge>
                <div className="space-y-2">
                  <p className="font-semibold text-lg text-foreground">Consultez les résultats (et identifiez une opportunité)</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Si la parcelle existe dans notre base de données, vous verrez les informations disponibles. 
                    Si certaines informations manquent ou si aucun résultat n'apparaît, c'est votre opportunité de contribuer ! 
                    Un bouton <strong>"Ajouter une information"</strong> apparaîtra.
                  </p>
                  <div className="bg-background/80 p-3 rounded border border-border mt-2">
                    <p className="text-xs font-semibold text-foreground mb-1">💡 Astuce :</p>
                    <p className="text-xs text-muted-foreground">
                      Vous pouvez contribuer même si des informations existent déjà ! Par exemple, si vous connaissez 
                      l'historique des propriétaires précédents, les coordonnées GPS exactes, ou si vous avez des photos 
                      récentes du terrain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-accent/20 rounded-lg border border-accent/50">
                <Badge className="shrink-0 h-8 w-8 rounded-full p-0 flex items-center justify-center text-base">3</Badge>
                <div className="space-y-2">
                  <p className="font-semibold text-lg text-foreground">Remplissez le formulaire de contribution</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cliquez sur "Ajouter une information" et remplissez le formulaire avec les données que vous possédez. 
                    Ne vous inquiétez pas : <strong>vous n'êtes pas obligé de tout remplir</strong>. Chaque information, 
                    même partielle, est précieuse.
                  </p>
                  <div className="bg-background/80 p-3 rounded border border-border mt-2">
                    <p className="text-xs font-semibold text-foreground mb-1">📋 Exemples d'informations utiles :</p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 mt-1 list-disc">
                      <li><strong>Titre de propriété :</strong> Le document officiel qui prouve la propriété d'un terrain (certificat d'enregistrement, concession, etc.)</li>
                      <li><strong>Superficie :</strong> La surface du terrain en mètres carrés (m²) ou en hectares (ha). 1 hectare = 10 000 m²</li>
                      <li><strong>Coordonnées GPS :</strong> La position exacte du terrain sur une carte (latitude et longitude)</li>
                      <li><strong>Circonscription foncière :</strong> Le bureau administratif qui gère les terres de cette zone (ex : Circonscription Foncière de Goma)</li>
                      <li><strong>Hypothèque :</strong> Une garantie sur le terrain en cas de prêt bancaire. Si le terrain a une hypothèque, la banque a un droit dessus</li>
                      <li><strong>Permis de bâtir :</strong> L'autorisation officielle de construire sur le terrain, délivrée par la mairie</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-accent/20 rounded-lg border border-accent/50">
                <Badge className="shrink-0 h-8 w-8 rounded-full p-0 flex items-center justify-center text-base">4</Badge>
                <div className="space-y-2">
                  <p className="font-semibold text-lg text-foreground">Recevez instantanément votre code CCC</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dès que vous soumettez votre contribution, un <strong>code CCC unique</strong> est généré automatiquement 
                    et ajouté à votre compte. Vous le verrez apparaître immédiatement dans l'onglet <strong>"Codes CCC"</strong> 
                    de votre tableau de bord. Le code sera valable pendant 90 jours.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-accent/20 rounded-lg border border-accent/50">
                <Badge className="shrink-0 h-8 w-8 rounded-full p-0 flex items-center justify-center text-base">5</Badge>
                <div className="space-y-2">
                  <p className="font-semibold text-lg text-foreground">Utilisez votre code pour économiser</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Lors de votre prochaine commande de services cadastraux (consultation, extrait, etc.), 
                    vous arriverez à une page de paiement. À cette étape, sélectionnez l'option 
                    <strong> "Code Contributeur Cadastral"</strong> et saisissez votre code. 
                    La réduction de 5 USD sera appliquée automatiquement sur le montant total de votre facture.
                  </p>
                  <div className="bg-background/80 p-3 rounded border border-border mt-2">
                    <p className="text-xs font-semibold text-foreground mb-1">✅ Important :</p>
                    <p className="text-xs text-muted-foreground">
                      Vous devez d'abord accepter les conditions d'utilisation avant de pouvoir contribuer. 
                      Ces conditions garantissent que les informations partagées sont exactes et utilisées de manière responsable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-accent/50 p-5 rounded-lg border-l-4 border-primary">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Points importants à retenir
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <ArrowRight className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Consultation facile :</strong> Tous vos codes CCC (actifs, utilisés, expirés) 
                  sont visibles dans l'onglet "Codes CCC" de votre tableau de bord
                </span>
              </li>
              <li className="flex gap-3">
                <ArrowRight className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Accumulation possible :</strong> Vous pouvez cumuler plusieurs codes CCC 
                  en contribuant sur différentes parcelles. Plus vous contribuez, plus vous économisez !
                </span>
              </li>
              <li className="flex gap-3">
                <ArrowRight className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Attention aux dates d'expiration :</strong> Les codes expirés (plus de 90 jours) 
                  ne peuvent plus être utilisés. Surveillez vos dates !
                </span>
              </li>
              <li className="flex gap-3">
                <ArrowRight className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                <span className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Usage unique :</strong> Une fois qu'un code est utilisé sur une facture, 
                  il devient inactif définitivement
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Questions fréquemment posées (avec explications détaillées)
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  Puis-je utiliser plusieurs codes CCC sur une même facture ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Non, un seul code CCC par facture.</strong> Vous ne pouvez appliquer 
                    qu'un seul code de réduction sur une facture donnée. C'est une règle du système.
                  </p>
                  <p>
                    <strong className="text-foreground">Mais vous pouvez accumuler plusieurs codes !</strong> Si vous avez 
                    contribué sur 5 parcelles différentes, vous aurez 5 codes CCC dans votre compte. Vous pourrez les utiliser 
                    sur 5 factures différentes (une par facture), ce qui vous fera économiser 25 USD au total (5 codes × 5 USD).
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Comment sont vérifiées les informations que je soumets ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Génération automatique immédiate :</strong> Dès que vous soumettez 
                    votre contribution, un code CCC est généré automatiquement et devient utilisable immédiatement. 
                    Vous n'avez pas besoin d'attendre une validation manuelle.
                  </p>
                  <p>
                    <strong className="text-foreground">Responsabilité :</strong> En contrepartie, nous comptons sur votre 
                    honnêteté. Les informations fausses ou inexactes peuvent nuire à d'autres utilisateurs et compromettre 
                    la qualité de notre base de données cadastrale. C'est pourquoi vous devez accepter les conditions 
                    d'utilisation avant de contribuer.
                  </p>
                  <p className="text-xs bg-accent/30 p-2 rounded">
                    💡 <strong>Notre équipe effectue des vérifications périodiques</strong> des contributions. 
                    En cas d'abus répété ou d'informations manifestement fausses, votre accès au programme pourrait être suspendu.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  Puis-je prolonger la validité d'un code CCC qui est sur le point d'expirer ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Non, les codes expirés ne peuvent pas être prolongés.</strong> 
                    Une fois les 90 jours écoulés, le code devient définitivement inactif. Il n'y a pas de possibilité 
                    de réactivation ou d'extension de la durée de validité.
                  </p>
                  <p>
                    <strong className="text-foreground">Comment éviter de perdre vos codes ?</strong> Nous vous recommandons 
                    de consulter régulièrement l'onglet "Codes CCC" de votre tableau de bord pour voir les dates d'expiration. 
                    Utilisez vos codes les plus anciens en premier.
                  </p>
                  <p>
                    <strong className="text-foreground">Générez de nouveaux codes facilement :</strong> Si un code expire, 
                    vous pouvez toujours en obtenir de nouveaux en effectuant de nouvelles contributions sur d'autres parcelles.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Quel type d'informations puis-je contribuer pour obtenir un code CCC ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-3">
                  <p>
                    <strong className="text-foreground">Toute information utile est la bienvenue !</strong> Vous n'avez pas besoin 
                    d'être un expert en cadastre. Voici des exemples concrets d'informations précieuses :
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Coordonnées GPS :</strong> Si vous avez visité le terrain avec 
                        un smartphone, vous pouvez noter sa position exacte (latitude et longitude) avec Google Maps
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Superficie exacte :</strong> Si vous connaissez la surface réelle 
                        du terrain (écrite sur le titre de propriété ou mesurée par un géomètre)
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Photos du terrain :</strong> Des images actuelles du terrain, 
                        des constructions existantes, ou des points de repère
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Informations sur le propriétaire :</strong> Nom complet du propriétaire actuel, 
                        date d'acquisition, type de propriétaire (personne physique ou entreprise)
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Historique des transactions :</strong> Si vous connaissez les anciens 
                        propriétaires, les dates de vente, ou les prix de vente précédents
                      </div>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <div>
                        <strong className="text-foreground">Documents officiels :</strong> Copies de titres de propriété, 
                        permis de bâtir, certificats d'enregistrement, ou autres documents administratifs
                      </div>
                    </li>
                  </ul>
                  <p className="text-xs bg-accent/30 p-2 rounded mt-2">
                    💡 <strong>Conseil :</strong> Plus vos informations sont complètes et précises, plus elles sont utiles 
                    pour enrichir notre base de données. Mais même une seule information partielle est précieuse !
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Comment puis-je vérifier mes codes CCC et savoir combien j'ai économisé ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Accédez à votre tableau de bord :</strong> Connectez-vous à votre compte, 
                    puis rendez-vous dans la section "Tableau de bord de facturation". Vous y trouverez un onglet dédié 
                    appelé "Codes CCC".
                  </p>
                  <p>
                    <strong className="text-foreground">Ce que vous verrez :</strong>
                  </p>
                  <ul className="space-y-1 ml-4 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Codes actifs :</strong> Les codes que vous pouvez encore utiliser, avec leur date d'expiration</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Codes utilisés :</strong> L'historique des codes que vous avez déjà appliqués sur vos factures</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span><strong>Codes expirés :</strong> Les codes qui ne sont plus valables (plus de 90 jours)</span>
                    </li>
                  </ul>
                  <p className="text-xs bg-primary/10 p-2 rounded mt-2">
                    📊 <strong>Statistiques d'économies :</strong> Vous pourrez facilement calculer combien vous avez économisé 
                    en comptant vos codes utilisés (chaque code = 5 USD d'économie).
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  Puis-je transférer ou offrir mes codes CCC à quelqu'un d'autre ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Non, les codes CCC sont strictement personnels.</strong> Ils sont liés 
                    à votre compte utilisateur et ne peuvent pas être transférés, vendus ou offerts à un autre utilisateur.
                  </p>
                  <p>
                    <strong className="text-foreground">Pourquoi cette règle ?</strong> Cette restriction garantit que les personnes 
                    qui contribuent effectivement à enrichir notre base de données sont celles qui bénéficient des réductions. 
                    Cela évite également les abus et le commerce de codes.
                  </p>
                  <p className="text-xs bg-accent/30 p-2 rounded">
                    💡 <strong>Astuce :</strong> Si vous voulez aider un ami ou un membre de votre famille, encouragez-le 
                    à créer son propre compte et à contribuer. Il obtiendra ainsi ses propres codes CCC !
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left">
                  Que faire si je n'ai pas de titre de propriété ou de documents officiels ?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed space-y-2">
                  <p>
                    <strong className="text-foreground">Pas de panique, vous pouvez quand même contribuer !</strong> 
                    Les documents officiels sont utiles, mais ils ne sont pas obligatoires. Vous pouvez apporter d'autres 
                    types d'informations tout aussi précieuses.
                  </p>
                  <p>
                    <strong className="text-foreground">Exemples d'informations sans documents officiels :</strong>
                  </p>
                  <ul className="space-y-1 ml-4 text-sm">
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Photos récentes du terrain ou de la propriété</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Description de l'usage actuel du terrain (habitation, commerce, terrain vide, agriculture, etc.)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Coordonnées GPS prises avec votre smartphone</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>Informations sur le quartier, les accès, les services à proximité</span>
                    </li>
                  </ul>
                  <p className="text-xs bg-accent/30 p-2 rounded mt-2">
                    ✅ <strong>L'important :</strong> Partagez ce que vous savez avec honnêteté. Même des informations 
                    partielles aident à compléter notre base de données !
                  </p>
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
              <Link to="/">Commencer une recherche</Link>
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
