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
        <DialogContent className="z-[9999] w-[95vw] max-w-sm max-h-[90vh] p-0 overflow-hidden bg-background border-border rounded-2xl flex flex-col">
          {/* Header avec gradient */}
          <DialogHeader className="p-3 sm:p-4 pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-primary/15 rounded-xl shadow-sm flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold">
                    Demande de Titre Foncier
                  </DialogTitle>
                  <Badge variant="secondary" className="text-xs">
                    RDC
                  </Badge>
                </div>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Conditions et informations importantes
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea 
            className="flex-1 min-h-0"
            onScrollCapture={handleScroll}
            ref={scrollRef}
          >
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Introduction Card */}
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-primary/15 rounded-lg flex-shrink-0">
                      <Info className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-foreground">À propos</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Soumettez votre demande de titre foncier auprès des autorités de la RDC.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Points clés - version compacte */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs sm:text-sm font-semibold text-foreground">Points essentiels</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {keyPoints.map((point, index) => (
                    <div key={index} className="p-2 rounded-lg border border-muted bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`p-1 ${point.iconBg} rounded`}>
                          <point.icon className={`h-3 w-3 ${point.iconColor}`} />
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{point.title}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                        {point.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="my-2" />

              {/* Conditions - version compacte */}
              <div className="p-2.5 rounded-lg border border-muted bg-card">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Conditions</span>
                </div>
                <ul className="space-y-1.5">
                  {conditions.map((condition, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avertissement - version compacte */}
              <div className="p-2.5 rounded-lg border border-destructive/40 bg-gradient-to-br from-destructive/5 to-destructive/10">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-destructive/15 rounded flex-shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-destructive">Avertissement</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Toute fausse déclaration est passible de poursuites judiciaires.
                    </p>
                  </div>
                </div>
              </div>

              {/* Protection des données - version compacte */}
              <div className="p-2.5 rounded-lg border border-muted bg-muted/30">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 bg-primary/10 rounded flex-shrink-0">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">Protection des données</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Vos informations sont traitées de manière confidentielle et sécurisée.
                    </p>
                  </div>
                </div>
              </div>

              {/* Spacer pour le scroll */}
              <div className="h-4" />
            </div>
          </ScrollArea>

          {/* Footer - version compacte */}
          <DialogFooter className="p-3 sm:p-4 pt-3 border-t bg-gradient-to-r from-muted/50 to-muted/30 flex-shrink-0">
            <div className="w-full space-y-3">
              {/* Checkbox */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  disabled={!hasScrolledToBottom}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                />
                <label 
                  htmlFor="terms" 
                  className={`text-xs cursor-pointer select-none flex-1 ${
                    !hasScrolledToBottom ? 'text-muted-foreground' : 'text-foreground font-medium'
                  }`}
                >
                  J'accepte les conditions
                </label>
              </div>

              {!hasScrolledToBottom && (
                <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ArrowRight className="h-2.5 w-2.5 rotate-90" />
                  Défiler pour accepter
                </p>
              )}

              {/* Boutons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-9 text-xs sm:text-sm"
                  size="sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={!termsAccepted}
                  className="flex-1 gap-1.5 h-9 text-xs sm:text-sm"
                  size="sm"
                >
                  Continuer
                  <ArrowRight className="h-3.5 w-3.5" />
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
