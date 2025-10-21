import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCadastralContribution } from '@/hooks/useCadastralContribution';
import { useCCCFormState } from '@/hooks/useCCCFormState';
import { supabase } from '@/integrations/supabase/client';

// Form Components
import { CCCFormProgress } from './ccc-form/CCCFormProgress';
import { CCCFormOwners } from './ccc-form/CCCFormOwners';
import { CCCFormLocation } from './ccc-form/CCCFormLocation';
import { CCCFormProperty } from './ccc-form/CCCFormProperty';
import { CCCFormTaxes } from './ccc-form/CCCFormTaxes';
import { CCCFormGPS } from './ccc-form/CCCFormGPS';
import { CCCFormDocuments } from './ccc-form/CCCFormDocuments';
import { CCCFormActions } from './ccc-form/CCCFormActions';
import { CCCMobileNotification } from './ccc-form/CCCMobileNotification';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CadastralContributionDialogNewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
}

const steps = ['Propriétaire', 'Localisation', 'Propriété', 'Taxes', 'GPS', 'Documents'];

export const CadastralContributionDialogNew: React.FC<CadastralContributionDialogNewProps> = ({
  open,
  onOpenChange,
  parcelNumber
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { submitContribution, loading } = useCadastralContribution();

  // Form state management
  const formState = useCCCFormState(parcelNumber);
  const {
    formData,
    setFormData,
    currentOwners,
    setCurrentOwners,
    taxRecords,
    setTaxRecords,
    gpsCoordinates,
    setGpsCoordinates,
    parcelSides,
    setParcelSides,
    sectionType,
    setSectionType,
    saveToStorage,
    loadFromStorage,
    clearStorage,
  } = formState;

  // Local state
  const [currentTab, setCurrentTab] = useState('owners');
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);
  const [titleDocFiles, setTitleDocFiles] = useState<File[]>([]);

  // Load saved data on mount
  useEffect(() => {
    if (open) {
      const loaded = loadFromStorage();
      if (loaded) {
        showNotif('Données restaurées', 'success');
      }
    }
  }, [open]);

  // Auto-save
  useEffect(() => {
    if (open && formData.parcelNumber) {
      const timer = setTimeout(() => {
        saveToStorage();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [open, formData, currentOwners, taxRecords, gpsCoordinates, parcelSides]);

  // Helpers
  const showNotif = (message: string, type: typeof notificationType = 'info') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    setSectionType(type);
    setFormData(prev => ({
      ...prev,
      ville: undefined,
      commune: undefined,
      quartier: undefined,
      avenue: undefined,
      territoire: undefined,
      collectivite: undefined,
      groupement: undefined,
      village: undefined
    }));
  };

  // Owner handlers
  const updateCurrentOwner = (index: number, field: string, value: string) => {
    const updated = [...currentOwners];
    updated[index] = { ...updated[index], [field]: value };
    setCurrentOwners(updated);
  };

  const addCurrentOwner = () => {
    const lastOwner = currentOwners[currentOwners.length - 1];
    if (!lastOwner?.lastName || !lastOwner?.firstName) {
      showNotif('Veuillez compléter le propriétaire actuel avant d\'en ajouter un autre', 'warning');
      return;
    }
    setCurrentOwners([...currentOwners, {
      lastName: '',
      middleName: '',
      firstName: '',
      legalStatus: 'Personne physique',
      since: ''
    }]);
  };

  const removeCurrentOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
    }
  };

  // Tax handlers
  const updateTaxRecord = (index: number, field: string, value: string | File | null) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRecords(updated);
  };

  const addTaxRecord = () => {
    const lastTax = taxRecords[taxRecords.length - 1];
    if (!lastTax?.taxType || !lastTax?.taxYear || !lastTax?.taxAmount) {
      showNotif('Veuillez compléter la taxe actuelle avant d\'en ajouter une autre', 'warning');
      return;
    }
    setTaxRecords([...taxRecords, {
      taxType: 'Taxe foncière',
      taxYear: '',
      taxAmount: '',
      paymentStatus: 'Non payée',
      paymentDate: '',
      receiptFile: null
    }]);
  };

  const removeTaxRecord = (index: number) => {
    if (taxRecords.length > 1) {
      setTaxRecords(taxRecords.filter((_, i) => i !== index));
    }
  };

  // GPS handlers
  const updateGPSCoordinate = (index: number, field: string, value: string) => {
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], [field]: value };
    setGpsCoordinates(updated);
  };

  const addGPSCoordinate = () => {
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${gpsCoordinates.length + 1}`,
      lat: '',
      lng: ''
    }]);
  };

  const removeGPSCoordinate = (index: number) => {
    if (gpsCoordinates.length > 1) {
      setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
    }
  };

  // Parcel side handlers
  const updateParcelSide = (index: number, value: string) => {
    const updated = [...parcelSides];
    updated[index] = { ...updated[index], length: value };
    setParcelSides(updated);
  };

  const addParcelSide = () => {
    setParcelSides([...parcelSides, {
      name: `Côté ${parcelSides.length + 1}`,
      length: ''
    }]);
  };

  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
  };

  // Document handlers
  const handleOwnerDocChange = (file: File | null) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotif('La taille maximale est de 5 MB', 'error');
        return;
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        showNotif('Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés', 'error');
        return;
      }
    }
    setOwnerDocFile(file);
  };

  const handleTitleDocAdd = (file: File) => {
    if (titleDocFiles.length >= 5) {
      showNotif('Maximum 5 fichiers autorisés', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotif('La taille maximale est de 5 MB', 'error');
      return;
    }
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      showNotif('Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés', 'error');
      return;
    }
    setTitleDocFiles(prev => [...prev, file]);
  };

  const handleTitleDocRemove = (index: number) => {
    setTitleDocFiles(prev => prev.filter((_, i) => i !== index));
  };

  // File upload
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cadastral-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Submit
  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!user && !session) {
      saveToStorage();
      setShowAuthDialog(true);
      return;
    }

    setUploading(true);

    try {
      // Upload files
      let ownerDocUrl = null;
      let titleDocUrls: string[] = [];

      if (ownerDocFile) {
        ownerDocUrl = await uploadFile(ownerDocFile, 'owner-documents');
        if (!ownerDocUrl) throw new Error('Erreur upload document propriétaire');
      }

      for (const file of titleDocFiles) {
        const url = await uploadFile(file, 'title-documents');
        if (!url) throw new Error('Erreur upload document titre');
        titleDocUrls.push(url);
      }

      // Upload tax receipts
      const taxHistoryData = await Promise.all(
        taxRecords.map(async (tax) => {
          let receiptUrl = null;
          if (tax.receiptFile) {
            receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts');
          }
          return {
            taxYear: parseInt(tax.taxYear),
            amountUsd: parseFloat(tax.taxAmount),
            paymentStatus: tax.paymentStatus,
            paymentDate: tax.paymentDate || undefined,
            receiptUrl: receiptUrl || undefined,
            taxType: tax.taxType
          };
        })
      );

      // GPS coordinates
      const gpsCoordinatesData = gpsCoordinates
        .filter(c => c.lat && c.lng)
        .map(coord => ({
          borne: coord.borne,
          lat: parseFloat(coord.lat),
          lng: parseFloat(coord.lng)
        }));

      const dataToSubmit = {
        ...formData,
        currentOwners: currentOwners.filter(o => o.lastName && o.firstName),
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrls.length > 0 ? JSON.stringify(titleDocUrls) : undefined,
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        gpsCoordinates: gpsCoordinatesData.length > 0 ? gpsCoordinatesData : undefined,
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result.success) {
        clearStorage();
        setShowSuccess(true);
      }
    } catch (error) {
      showNotif(
        error instanceof Error ? error.message : 'Erreur lors de la soumission',
        'error'
      );
    } finally {
      setUploading(false);
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    let filled = 0;
    let total = 0;

    // Owners
    total += 2;
    if (currentOwners.some(o => o.lastName && o.firstName)) filled += 2;

    // Location
    total += 2;
    if (formData.province) filled++;
    if (sectionType) filled++;

    // Property
    total += 2;
    if (formData.areaSqm) filled++;
    if (formData.declaredUsage) filled++;

    // Taxes
    total += 1;
    if (taxRecords.some(t => t.taxAmount)) filled++;

    // GPS
    total += 1;
    if (gpsCoordinates.some(g => g.lat && g.lng)) filled++;

    // Documents
    total += 1;
    if (ownerDocFile || titleDocFiles.length > 0) filled++;

    return (filled / total) * 100;
  };

  const getCurrentStepIndex = () => {
    const tabIndexMap: Record<string, number> = {
      'owners': 0,
      'location': 1,
      'property': 2,
      'taxes': 3,
      'gps': 4,
      'documents': 5
    };
    return tabIndexMap[currentTab] || 0;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
          <DialogHeader className="px-4 sm:px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl sm:text-2xl">Contribution cadastrale</DialogTitle>
            <DialogDescription className="text-sm">
              Parcelle: <span className="font-semibold text-foreground">{parcelNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 sm:px-6 pt-4">
            <CCCFormProgress
              currentStep={getCurrentStepIndex()}
              completionPercentage={calculateProgress()}
              steps={steps}
            />
          </div>

          <ScrollArea className="flex-1 px-4 sm:px-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-6">
                <TabsTrigger value="owners" className="text-xs sm:text-sm">Propriétaire</TabsTrigger>
                <TabsTrigger value="location" className="text-xs sm:text-sm">Localisation</TabsTrigger>
                <TabsTrigger value="property" className="text-xs sm:text-sm">Propriété</TabsTrigger>
                <TabsTrigger value="taxes" className="text-xs sm:text-sm">Taxes</TabsTrigger>
                <TabsTrigger value="gps" className="text-xs sm:text-sm">GPS</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="owners" className="space-y-6 pb-6">
                <CCCFormOwners
                  owners={currentOwners}
                  onUpdate={updateCurrentOwner}
                  onAdd={addCurrentOwner}
                  onRemove={removeCurrentOwner}
                />
              </TabsContent>

              <TabsContent value="location" className="space-y-6 pb-6">
                <CCCFormLocation
                  formData={formData}
                  onUpdate={handleInputChange}
                  sectionType={sectionType}
                  onSectionTypeChange={handleSectionTypeChange}
                />
              </TabsContent>

              <TabsContent value="property" className="space-y-6 pb-6">
                <CCCFormProperty
                  formData={formData}
                  onUpdate={handleInputChange}
                  parcelSides={parcelSides}
                  onUpdateSide={updateParcelSide}
                  onAddSide={addParcelSide}
                  onRemoveSide={removeParcelSide}
                />
              </TabsContent>

              <TabsContent value="taxes" className="space-y-6 pb-6">
                <CCCFormTaxes
                  taxes={taxRecords}
                  onUpdate={updateTaxRecord}
                  onAdd={addTaxRecord}
                  onRemove={removeTaxRecord}
                />
              </TabsContent>

              <TabsContent value="gps" className="space-y-6 pb-6">
                <CCCFormGPS
                  coordinates={gpsCoordinates}
                  onUpdate={updateGPSCoordinate}
                  onAdd={addGPSCoordinate}
                  onRemove={removeGPSCoordinate}
                />
              </TabsContent>

              <TabsContent value="documents" className="space-y-6 pb-6">
                <CCCFormDocuments
                  ownerDocFile={ownerDocFile}
                  titleDocFiles={titleDocFiles}
                  onOwnerDocChange={handleOwnerDocChange}
                  onTitleDocAdd={handleTitleDocAdd}
                  onTitleDocRemove={handleTitleDocRemove}
                />
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <div className="px-4 sm:px-6 pb-6 border-t">
            <CCCFormActions
              onSubmit={handleSubmit}
              onSave={saveToStorage}
              loading={loading}
              uploading={uploading}
              canSubmit={currentOwners.some(o => o.lastName && o.firstName)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Contribution envoyée avec succès !
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Votre contribution cadastrale a été enregistrée. Vous recevrez votre code CCC après validation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => {
              setShowSuccess(false);
              onOpenChange(false);
            }} className="w-full">
              Fermer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auth Required Dialog */}
      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Connexion requise</AlertDialogTitle>
            <AlertDialogDescription>
              Vous devez vous connecter pour soumettre une contribution cadastrale.
              Vos données sont sauvegardées et seront restaurées après connexion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAuthDialog(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                saveToStorage();
                navigate('/auth?mode=signup');
              }}
              className="w-full sm:w-auto"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Créer un compte
            </Button>
            <Button
              onClick={() => {
                saveToStorage();
                navigate('/auth?mode=login');
              }}
              className="w-full sm:w-auto"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Se connecter
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Notification */}
      <CCCMobileNotification
        message={notificationMessage}
        type={notificationType}
        show={showNotification}
        onClose={() => setShowNotification(false)}
      />
    </>
  );
};
