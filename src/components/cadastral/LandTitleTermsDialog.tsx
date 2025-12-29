import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  ArrowRight,
  Scale,
  Lock,
  Info,
  FileCheck,
  Landmark,
  CreditCard
} from 'lucide-react';

interface LandTitleTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

const LandTitleTermsDialog: React.FC<LandTitleTermsDialogProps> = ({
  open,
  onOpenChange,
  onAccept,
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTermsAccepted(false);
      setHasScrolledToBottom(false);
    }
  }, [open]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    onOpenChange(false);
    onAccept();
  };

  const keyPoints = [
    {
      icon: Clock,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      title: 'Délai de traitement',
      description: '30 à 90 jours selon la complexité du dossier'
    },
    {
      icon: FileCheck,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      title: 'Documents requis',
      description: 'Pièce d\'identité, preuve de propriété, documents terrain'
    },
    {
      icon: CreditCard,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      title: 'Frais administratifs',
      description: 'Calculés selon le type de titre et la superficie'
    },
    {
      icon: Landmark,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-500',
      title: 'Autorité compétente',
      description: 'Conservation des Titres Immobiliers de la RDC'
    }
  ];

  const conditions = [
    'Fournir des informations exactes et vérifiables',
    'Soumettre uniquement des documents authentiques',
    'Respecter les lois foncières de la RDC',
    'Payer les frais requis dans les délais impartis',
    'Répondre aux demandes de compléments dans les 30 jours'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9998]" />
        <DialogContent className="z-[9999] max-w-sm max-h-[90vh] p-0 overflow-hidden bg-background border-border rounded-2xl">
          {/* Header avec gradient */}
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/15 rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg sm:text-xl font-bold">
                    Demande de Titre Foncier
                  </DialogTitle>
                  <Badge variant="secondary" className="text-xs">
                    RDC
                  </Badge>
                </div>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Conditions d'utilisation et informations importantes
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea 
            className="h-[420px] sm:h-[480px]"
            onScrollCapture={handleScroll}
            ref={scrollRef}
          >
            <div className="p-4 sm:p-6 space-y-5">
              {/* Introduction Card */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/15 rounded-lg">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">À propos de ce service</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Ce service vous permet de soumettre une demande de titre foncier 
                        auprès des autorités compétentes de la République Démocratique du Congo. 
                        Votre dossier sera traité selon les procédures légales en vigueur.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Points clés */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Points essentiels</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {keyPoints.map((point, index) => (
                    <Card key={index} className="border-muted hover:border-primary/30 transition-colors">
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className={`p-2 ${point.iconBg} rounded-lg flex-shrink-0`}>
                          <point.icon className={`h-4 w-4 ${point.iconColor}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{point.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {point.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator className="my-4" />

              {/* Conditions */}
              <Card className="border-muted">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Conditions d'utilisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-2.5">
                    {conditions.map((condition, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{condition}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Avertissement */}
              <Card className="border-destructive/40 bg-gradient-to-br from-destructive/5 to-destructive/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-destructive/15 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-destructive">Avertissement légal</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Toute fausse déclaration ou falsification de documents est passible 
                        de poursuites judiciaires conformément aux articles pertinents du 
                        Code pénal congolais.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Protection des données */}
              <Card className="border-muted bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Protection des données</p>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                        Vos informations personnelles sont traitées de manière confidentielle 
                        et sécurisée. Elles ne seront partagées qu'avec les autorités 
                        administratives compétentes dans le cadre de votre demande.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Spacer pour le scroll */}
              <div className="h-6" />
            </div>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="p-4 sm:p-6 pt-4 border-t bg-gradient-to-r from-muted/50 to-muted/30">
            <div className="w-full space-y-4">
              {/* Checkbox avec meilleur style */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  disabled={!hasScrolledToBottom}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label 
                  htmlFor="terms" 
                  className={`text-sm cursor-pointer select-none flex-1 ${
                    !hasScrolledToBottom ? 'text-muted-foreground' : 'text-foreground font-medium'
                  }`}
                >
                  J'ai lu et j'accepte les conditions d'utilisation
                </label>
              </div>

              {!hasScrolledToBottom && (
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ArrowRight className="h-3 w-3 rotate-90" />
                  Faites défiler jusqu'en bas pour accepter les conditions
                </p>
              )}

              {/* Boutons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={!termsAccepted}
                  className="flex-1 gap-2"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default LandTitleTermsDialog;
