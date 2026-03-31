import React from 'react';
import Navigation from '@/components/ui/navigation';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Scale, Shield, Eye, FileText, Mail } from 'lucide-react';

const Legal = () => {
  const lastUpdated = "15 janvier 2025";

  return (
    <div className="min-h-dvh">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <Scale className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Mentions Légales
            </h1>
            <p className="text-lg text-muted-foreground">
              Informations légales et conditions d'utilisation de la plateforme BIC
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Dernière mise à jour : {lastUpdated}
            </p>
          </div>

          <div className="space-y-8">
            {/* Informations sur l'entreprise */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Informations sur l'Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Dénomination sociale</h3>
                  <p className="text-muted-foreground">Bureau d'Informations Cadastrales (BIC)</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Siège social</h3>
                  <p className="text-muted-foreground">
                    07, Rue Touristique<br />
                    Goma, Nord-Kivu<br />
                    République Démocratique du Congo
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Contact</h3>
                  <p className="text-muted-foreground">
                    Email : contact@bic.cd<br />
                    Téléphone : +243 816 996 077
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Directeur de publication</h3>
                  <p className="text-muted-foreground">Équipe BIC</p>
                </div>
              </CardContent>
            </Card>

            {/* Conditions d'utilisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Conditions d'Utilisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Accès au site</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    L'accès au site web du BIC est libre et gratuit. Certains services spécialisés 
                    peuvent nécessiter une inscription et faire l'objet d'une facturation. 
                    L'utilisation du site implique l'acceptation pleine et entière des présentes conditions.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Utilisation des données</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Les données fournies par le BIC sont destinées à des fins d'information, 
                    d'analyse et de recherche. Il est interdit de :
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Reproduire ou redistribuer les données sans autorisation écrite</li>
                    <li>• Utiliser les données à des fins commerciales sans accord préalable</li>
                    <li>• Modifier ou altérer les données originales</li>
                    <li>• Utiliser les données de manière à porter atteinte à des tiers</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Propriété intellectuelle</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Tous les éléments du site (textes, images, graphismes, logo, icônes, sons, logiciels) 
                    sont la propriété exclusive du BIC, à l'exception des marques, logos ou contenus 
                    appartenant à d'autres sociétés partenaires ou auteurs.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Responsabilité</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Le BIC s'efforce de fournir des informations exactes et à jour. Cependant, 
                    nous ne pouvons garantir l'exactitude, la complétude ou l'actualité de toutes 
                    les informations diffusées. L'utilisation des informations se fait sous la 
                    responsabilité exclusive de l'utilisateur.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Protection des données */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Protection des Données Personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Collecte des données</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Dans le cadre de l'utilisation de nos services, nous sommes amenés à collecter 
                    certaines données personnelles (nom, email, organisation). Ces données sont 
                    collectées uniquement avec votre consentement explicite.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Utilisation des données</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Les données personnelles collectées sont utilisées pour :
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Gérer votre compte utilisateur</li>
                    <li>• Vous fournir nos services</li>
                    <li>• Vous envoyer des informations relatives à nos services</li>
                    <li>• Améliorer nos services</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Vos droits</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Conformément aux réglementations en vigueur, vous disposez des droits suivants :
                  </p>
                  <ul className="text-muted-foreground space-y-1 ml-4">
                    <li>• Droit d'accès à vos données personnelles</li>
                    <li>• Droit de rectification de vos données</li>
                    <li>• Droit de suppression de vos données</li>
                    <li>• Droit de portabilité de vos données</li>
                    <li>• Droit d'opposition au traitement</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    Pour exercer ces droits, contactez-nous à : contact@bic.myazi.net.org
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Sécurité des données</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Nous mettons en œuvre toutes les mesures techniques et organisationnelles 
                    appropriées pour protéger vos données personnelles contre la perte, 
                    l'utilisation abusive, l'accès non autorisé, la divulgation, l'altération ou la destruction.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>Politique des Cookies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Notre site utilise des cookies pour améliorer votre expérience de navigation 
                  et analyser l'utilisation du site. Vous pouvez configurer votre navigateur 
                  pour refuser les cookies, mais cela peut affecter le fonctionnement de certaines 
                  fonctionnalités du site.
                </p>
              </CardContent>
            </Card>

            {/* Contact pour questions légales */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Questions Légales
                </h3>
                <p className="text-muted-foreground mb-4">
                  Pour toute question concernant ces mentions légales ou nos pratiques de protection des données
                </p>
                <p className="text-sm text-muted-foreground">
                  Contactez-nous à : <span className="font-medium">contact@bic.myazi.net.org</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;