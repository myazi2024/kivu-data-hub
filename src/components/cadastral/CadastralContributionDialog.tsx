import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface CadastralContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
}

const CadastralContributionDialog: React.FC<CadastralContributionDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber
}) => {
  const { submitContribution, loading } = useCadastralContribution();
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [requestWhatsAppNotif, setRequestWhatsAppNotif] = useState(false);
  
  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
    whatsappNumber: '',
  });

  const handleInputChange = (field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const result = await submitContribution(formData);
    
    if (result.success && result.code) {
      setGeneratedCode(result.code);
      setShowSuccess(true);
    }
  };

  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber, whatsappNumber: '' });
    setShowSuccess(false);
    setGeneratedCode('');
    setRequestWhatsAppNotif(false);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-primary animate-scale-in" />
            <DialogTitle className="text-2xl text-center">Merci pour votre contribution !</DialogTitle>
            <DialogDescription className="text-center">
              Votre contribution pour la parcelle <strong>{parcelNumber}</strong> a été enregistrée.
              Elle sera vérifiée par notre équipe.
            </DialogDescription>
            <div className="bg-primary/10 p-4 rounded-lg w-full">
              <p className="text-sm text-muted-foreground mb-2">Votre Code Contributeur Cadastral :</p>
              <p className="text-2xl font-bold text-primary text-center tracking-wider">{generatedCode}</p>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Valeur : 5 USD • Expire dans 90 jours
              </p>
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Vous pouvez utiliser ce code pour payer vos prochains services cadastraux.
            </p>
            <Button onClick={handleClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contribuer aux informations cadastrales</DialogTitle>
          <DialogDescription>
            Parcelle : <strong>{parcelNumber}</strong>
            <br />
            Renseignez les informations que vous possédez sur cette parcelle.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="location">Localisation</TabsTrigger>
            <TabsTrigger value="history">Historiques</TabsTrigger>
            <TabsTrigger value="obligations">Obligations</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="titleType">Type de titre de propriété</Label>
              <Select onValueChange={(value) => handleInputChange('propertyTitleType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Certificat d'enregistrement">Certificat d'enregistrement</SelectItem>
                  <SelectItem value="Titre foncier">Titre foncier</SelectItem>
                  <SelectItem value="Concession perpétuelle">Concession perpétuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Nom du propriétaire actuel</Label>
              <Input
                id="ownerName"
                placeholder="Nom complet"
                value={formData.currentOwnerName || ''}
                onChange={(e) => handleInputChange('currentOwnerName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalStatus">Statut juridique</Label>
              <Select onValueChange={(value) => handleInputChange('currentOwnerLegalStatus', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personne physique">Personne physique</SelectItem>
                  <SelectItem value="Personne morale">Personne morale</SelectItem>
                  <SelectItem value="État">État</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerSince">Propriétaire depuis</Label>
              <Input
                id="ownerSince"
                type="date"
                value={formData.currentOwnerSince || ''}
                onChange={(e) => handleInputChange('currentOwnerSince', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Superficie (m²)</Label>
              <Input
                id="area"
                type="number"
                placeholder="ex: 500"
                value={formData.areaSqm || ''}
                onChange={(e) => handleInputChange('areaSqm', parseFloat(e.target.value))}
              />
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                placeholder="ex: Nord-Kivu"
                value={formData.province || ''}
                onChange={(e) => handleInputChange('province', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input
                id="ville"
                placeholder="ex: Goma"
                value={formData.ville || ''}
                onChange={(e) => handleInputChange('ville', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commune">Commune</Label>
              <Input
                id="commune"
                placeholder="ex: Goma"
                value={formData.commune || ''}
                onChange={(e) => handleInputChange('commune', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quartier">Quartier</Label>
              <Input
                id="quartier"
                placeholder="ex: Himbi"
                value={formData.quartier || ''}
                onChange={(e) => handleInputChange('quartier', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avenue">Avenue</Label>
              <Input
                id="avenue"
                placeholder="ex: Avenue de l'Université"
                value={formData.avenue || ''}
                onChange={(e) => handleInputChange('avenue', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Historique des propriétaires</Label>
              <Textarea
                placeholder="Décrivez l'historique de propriété si vous le connaissez..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground">
                Exemple : "Propriété de M. X de 2010 à 2015, puis vendue à M. Y"
              </p>
            </div>

            <div className="space-y-2">
              <Label>Historique de bornage</Label>
              <Textarea
                placeholder="Informations sur les opérations de bornage..."
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Historique des taxes</Label>
              <Textarea
                placeholder="Informations sur les taxes foncières payées..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Hypothèques</Label>
              <Textarea
                placeholder="Informations sur les hypothèques ou charges..."
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox 
            id="whatsapp" 
            checked={requestWhatsAppNotif}
            onCheckedChange={(checked) => setRequestWhatsAppNotif(checked as boolean)}
          />
          <Label htmlFor="whatsapp" className="text-sm cursor-pointer">
            M'informer par WhatsApp si les informations sont validées
          </Label>
        </div>

        {requestWhatsAppNotif && (
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Numéro WhatsApp</Label>
            <Input
              id="whatsapp-number"
              placeholder="+243 XXX XXX XXX"
              value={formData.whatsappNumber || ''}
              onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Soumettre la contribution
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralContributionDialog;
