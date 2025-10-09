import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCadastralContribution, CadastralContributionData } from '@/hooks/useCadastralContribution';
import { Loader2, CheckCircle2, Upload, X, FileText, Plus, Trash2, MapPin } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  getAllProvinces, 
  getVillesForProvince, 
  getCommunesForVille,
  getTerritoiresForProvince,
  getCollectivitesForTerritoire,
  getQuartiersForCommune,
  getAvenuesForQuartier
} from '@/lib/geographicData';

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
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [requestWhatsAppNotif, setRequestWhatsAppNotif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownerDocFile, setOwnerDocFile] = useState<File | null>(null);
  const [titleDocFile, setTitleDocFile] = useState<File | null>(null);
  
  // État pour gérer plusieurs anciens propriétaires
  const [previousOwners, setPreviousOwners] = useState<Array<{
    name: string;
    legalStatus: string;
    startDate: string;
    endDate: string;
    mutationType: string;
    surveyDate?: string;
    surveyorName?: string;
    pvReferenceNumber?: string;
  }>>([]);

  // État pour gérer plusieurs taxes
  const [taxRecords, setTaxRecords] = useState<Array<{
    taxType: string;
    taxYear: string;
    taxAmount: string;
    paymentStatus: string;
    paymentDate: string;
    receiptFile: File | null;
  }>>([]);

  // État pour gérer plusieurs hypothèques
  const [mortgageRecords, setMortgageRecords] = useState<Array<{
    mortgageAmount: string;
    duration: string;
    creditorName: string;
    creditorType: string;
    contractDate: string;
    mortgageStatus: string;
    receiptFile: File | null;
  }>>([]);
  
  // État pour gérer les permis de construire
  const [buildingPermits, setBuildingPermits] = useState<Array<{
    permitNumber: string;
    issuingService: string;
    issueDate: string;
    validityMonths: string;
    administrativeStatus: string;
    issuingServiceContact: string;
  }>>([]);
  
  // État pour gérer les coordonnées GPS des bornes
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{
    borne: string;
    lat: string;
    lng: string;
  }>>([]);

  // État pour le switch Taxes/Hypothèques dans l'onglet obligations
  const [obligationType, setObligationType] = useState<'taxes' | 'mortgages'>('taxes');

  const [formData, setFormData] = useState<CadastralContributionData>({
    parcelNumber: parcelNumber,
    whatsappNumber: '',
  });

  // État pour gérer les dimensions des côtés de la parcelle
  const [parcelSides, setParcelSides] = useState<Array<{
    name: string;
    length: string;
  }>>([
    { name: 'Côté Nord', length: '' },
    { name: 'Côté Sud', length: '' },
    { name: 'Côté Est', length: '' },
    { name: 'Côté Ouest', length: '' }
  ]);

  // États pour gérer les listes déroulantes dépendantes
  const [availableVilles, setAvailableVilles] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);
  const [availableTerritoires, setAvailableTerritoires] = useState<string[]>([]);
  const [availableCollectivites, setAvailableCollectivites] = useState<string[]>([]);
  const [availableQuartiers, setAvailableQuartiers] = useState<string[]>([]);
  const [availableAvenues, setAvailableAvenues] = useState<string[]>([]);
  
  // État pour déterminer le type de section (SU ou SR)
  const [sectionType, setSectionType] = useState<'urbaine' | 'rurale' | ''>('');
  const [sectionTypeAutoDetected, setSectionTypeAutoDetected] = useState(false);

  // Détecter automatiquement le type de section à partir du préfixe du numéro de parcelle
  useEffect(() => {
    if (parcelNumber) {
      const upperParcelNumber = parcelNumber.toUpperCase().trim();
      
      if (upperParcelNumber.startsWith('SU')) {
        setSectionType('urbaine');
        setSectionTypeAutoDetected(true);
      } else if (upperParcelNumber.startsWith('SR')) {
        setSectionType('rurale');
        setSectionTypeAutoDetected(true);
      } else {
        setSectionType('');
        setSectionTypeAutoDetected(false);
      }
    }
  }, [parcelNumber]);

  // Recalculer automatiquement la superficie quand les dimensions changent
  useEffect(() => {
    const sides = parcelSides.filter(s => s.length && parseFloat(s.length) > 0);
    
    if (sides.length < 2) return;

    // Pour une forme rectangulaire simple (4 côtés)
    if (sides.length === 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      
      // Pour un rectangle : Nord/Sud sont opposés et Est/Ouest sont opposés
      // Indices : 0=Nord, 1=Sud, 2=Est, 3=Ouest
      const isRectangle = (
        Math.abs(lengths[0] - lengths[1]) < 0.1 &&  // Nord ≈ Sud
        Math.abs(lengths[2] - lengths[3]) < 0.1     // Est ≈ Ouest
      );
      
      if (isRectangle) {
        // Rectangle: côté Nord × côté Est
        const area = lengths[0] * lengths[2];
        handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
        return;
      }
      
      // Si pas un rectangle parfait, utiliser la formule de Brahmagupta
      const s = (lengths[0] + lengths[1] + lengths[2] + lengths[3]) / 2;
      const area = Math.sqrt(
        (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]) * (s - lengths[3])
      );
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 2 côtés (forme rectangulaire simplifiée)
    if (sides.length === 2) {
      const length1 = parseFloat(sides[0].length);
      const length2 = parseFloat(sides[1].length);
      const area = length1 * length2;
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour 3 côtés (triangle) : formule de Héron
    if (sides.length === 3) {
      const lengths = sides.map(s => parseFloat(s.length));
      const s = (lengths[0] + lengths[1] + lengths[2]) / 2;
      const area = Math.sqrt(s * (s - lengths[0]) * (s - lengths[1]) * (s - lengths[2]));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
      return;
    }
    
    // Pour plus de 4 côtés, utiliser une approximation
    if (sides.length > 4) {
      const lengths = sides.map(s => parseFloat(s.length));
      const perimeter = lengths.reduce((a, b) => a + b, 0);
      const area = (perimeter * perimeter) / (4 * sides.length * Math.tan(Math.PI / sides.length));
      handleInputChange('areaSqm', parseFloat(area.toFixed(2)));
    }
  }, [parcelSides]);

  // Mise à jour des villes quand la province change
  useEffect(() => {
    if (formData.province) {
      const villes = getVillesForProvince(formData.province);
      setAvailableVilles(villes);
      const territoires = getTerritoiresForProvince(formData.province);
      setAvailableTerritoires(territoires);
      
      // Réinitialiser les niveaux inférieurs si la province change
      if (!villes.includes(formData.ville || '')) {
        handleInputChange('ville', undefined);
        setAvailableCommunes([]);
        handleInputChange('commune', undefined);
      }
      if (!territoires.includes(formData.territoire || '')) {
        handleInputChange('territoire', undefined);
        setAvailableCollectivites([]);
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableVilles([]);
      setAvailableCommunes([]);
      setAvailableTerritoires([]);
      setAvailableCollectivites([]);
    }
  }, [formData.province]);

  // Mise à jour des communes quand la ville change
  useEffect(() => {
    if (formData.province && formData.ville) {
      const communes = getCommunesForVille(formData.province, formData.ville);
      setAvailableCommunes(communes);
      
      // Réinitialiser la commune si elle n'est plus valide
      if (!communes.includes(formData.commune || '')) {
        handleInputChange('commune', undefined);
        setAvailableQuartiers([]);
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableCommunes([]);
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville]);

  // Mise à jour des quartiers quand la commune change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune) {
      const quartiers = getQuartiersForCommune(formData.province, formData.ville, formData.commune);
      setAvailableQuartiers(quartiers);
      
      // Réinitialiser le quartier si il n'est plus valide
      if (!quartiers.includes(formData.quartier || '')) {
        handleInputChange('quartier', undefined);
        setAvailableAvenues([]);
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableQuartiers([]);
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune]);

  // Mise à jour des avenues quand le quartier change
  useEffect(() => {
    if (formData.province && formData.ville && formData.commune && formData.quartier) {
      const avenues = getAvenuesForQuartier(formData.province, formData.ville, formData.commune, formData.quartier);
      setAvailableAvenues(avenues);
      
      // Réinitialiser l'avenue si elle n'est plus valide
      if (!avenues.includes(formData.avenue || '')) {
        handleInputChange('avenue', undefined);
      }
    } else {
      setAvailableAvenues([]);
    }
  }, [formData.province, formData.ville, formData.commune, formData.quartier]);

  // Mise à jour des collectivités quand le territoire change
  useEffect(() => {
    if (formData.province && formData.territoire) {
      const collectivites = getCollectivitesForTerritoire(formData.province, formData.territoire);
      setAvailableCollectivites(collectivites);
      
      // Réinitialiser la collectivité si elle n'est plus valide
      if (!collectivites.includes(formData.collectivite || '')) {
        handleInputChange('collectivite', undefined);
      }
    } else {
      setAvailableCollectivites([]);
    }
  }, [formData.province, formData.territoire]);

  const handleInputChange = (field: keyof CadastralContributionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionTypeChange = (type: 'urbaine' | 'rurale') => {
    setSectionType(type);
    
    // Réinitialiser tous les champs de localisation sauf la province
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
    
    // Réinitialiser les listes
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'owner' | 'title') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non valide",
        description: "Seuls les fichiers JPG, PNG, WEBP et PDF sont acceptés",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 MB",
        variant: "destructive"
      });
      return;
    }
    
    if (type === 'owner') {
      setOwnerDocFile(file);
    } else {
      setTitleDocFile(file);
    }
  };

  const removeFile = (type: 'owner' | 'title') => {
    if (type === 'owner') {
      setOwnerDocFile(null);
    } else {
      setTitleDocFile(null);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('cadastral-documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('cadastral-documents')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    
    try {
      // Upload files if provided
      let ownerDocUrl = null;
      let titleDocUrl = null;

      if (ownerDocFile) {
        ownerDocUrl = await uploadFile(ownerDocFile, 'owner-documents');
        if (!ownerDocUrl) {
          toast({
            title: "Erreur de téléchargement",
            description: "Impossible de télécharger le document du propriétaire",
            variant: "destructive"
          });
          setUploading(false);
          return;
        }
      }

      if (titleDocFile) {
        titleDocUrl = await uploadFile(titleDocFile, 'title-documents');
        if (!titleDocUrl) {
          toast({
            title: "Erreur de téléchargement",
            description: "Impossible de télécharger le document de titre",
            variant: "destructive"
          });
          setUploading(false);
          return;
        }
      }

      // Upload tax receipt files and transform data
      const taxHistoryData = await Promise.all(
        taxRecords.map(async (tax) => {
          let receiptUrl = null;
          if (tax.receiptFile) {
            receiptUrl = await uploadFile(tax.receiptFile, 'tax-receipts');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du reçu de taxe');
            }
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

      // Upload mortgage receipt files and transform data
      const mortgageHistoryData = await Promise.all(
        mortgageRecords.map(async (mortgage) => {
          let receiptUrl = null;
          if (mortgage.receiptFile) {
            receiptUrl = await uploadFile(mortgage.receiptFile, 'mortgage-documents');
            if (!receiptUrl) {
              throw new Error('Erreur lors du téléchargement du document d\'hypothèque');
            }
          }
          return {
            mortgageAmountUsd: parseFloat(mortgage.mortgageAmount),
            durationMonths: parseInt(mortgage.duration),
            creditorName: mortgage.creditorName,
            creditorType: mortgage.creditorType,
            contractDate: mortgage.contractDate,
            mortgageStatus: mortgage.mortgageStatus,
            receiptUrl: receiptUrl || undefined
          };
        })
      );
      
      // Transform building permits data
      const buildingPermitsData = buildingPermits.length > 0 ? buildingPermits.map(permit => ({
        permitNumber: permit.permitNumber,
        issuingService: permit.issuingService,
        issueDate: permit.issueDate,
        validityMonths: parseInt(permit.validityMonths),
        administrativeStatus: permit.administrativeStatus,
        issuingServiceContact: permit.issuingServiceContact || undefined
      })) : undefined;
      
      // Transform GPS coordinates data
      const gpsCoordinatesData = gpsCoordinates.length > 0 ? gpsCoordinates.map(coord => ({
        borne: coord.borne,
        lat: parseFloat(coord.lat),
        lng: parseFloat(coord.lng)
      })) : undefined;

      // Add document URLs to form data
      const dataToSubmit = {
        ...formData,
        ownerDocumentUrl: ownerDocUrl || undefined,
        titleDocumentUrl: titleDocUrl || undefined,
        taxHistory: taxHistoryData.length > 0 ? taxHistoryData as any : undefined,
        mortgageHistory: mortgageHistoryData.length > 0 ? mortgageHistoryData as any : undefined,
        buildingPermits: buildingPermitsData,
        gpsCoordinates: gpsCoordinatesData,
      };

      const result = await submitContribution(dataToSubmit);
      
      if (result.success && result.code) {
        setGeneratedCode(result.code);
        setShowSuccess(true);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors du téléchargement",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const addPreviousOwner = () => {
    setPreviousOwners([...previousOwners, {
      name: '',
      legalStatus: '',
      startDate: '',
      endDate: '',
      mutationType: '',
      surveyDate: '',
      surveyorName: '',
      pvReferenceNumber: ''
    }]);
  };

  const removePreviousOwner = (index: number) => {
    setPreviousOwners(previousOwners.filter((_, i) => i !== index));
  };

  const updatePreviousOwner = (index: number, field: string, value: string) => {
    const updated = [...previousOwners];
    updated[index] = { ...updated[index], [field]: value };
    setPreviousOwners(updated);
  };

  // Fonctions pour gérer les taxes
  const addTaxRecord = () => {
    setTaxRecords([...taxRecords, {
      taxType: '',
      taxYear: '',
      taxAmount: '',
      paymentStatus: '',
      paymentDate: '',
      receiptFile: null
    }]);
  };

  const removeTaxRecord = (index: number) => {
    setTaxRecords(taxRecords.filter((_, i) => i !== index));
  };

  const updateTaxRecord = (index: number, field: string, value: string) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], [field]: value };
    setTaxRecords(updated);
  };

  const handleTaxFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...taxRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setTaxRecords(updated);
    }
  };

  const removeTaxFile = (index: number) => {
    const updated = [...taxRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setTaxRecords(updated);
  };

  // Fonctions pour gérer les hypothèques
  const addMortgageRecord = () => {
    setMortgageRecords([...mortgageRecords, {
      mortgageAmount: '',
      duration: '',
      creditorName: '',
      creditorType: '',
      contractDate: '',
      mortgageStatus: '',
      receiptFile: null
    }]);
  };

  const removeMortgageRecord = (index: number) => {
    setMortgageRecords(mortgageRecords.filter((_, i) => i !== index));
  };

  const updateMortgageRecord = (index: number, field: string, value: string) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], [field]: value };
    setMortgageRecords(updated);
  };

  const handleMortgageFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximale est de 5 MB",
          variant: "destructive"
        });
        return;
      }
      const updated = [...mortgageRecords];
      updated[index] = { ...updated[index], receiptFile: file };
      setMortgageRecords(updated);
    }
  };

  const removeMortgageFile = (index: number) => {
    const updated = [...mortgageRecords];
    updated[index] = { ...updated[index], receiptFile: null };
    setMortgageRecords(updated);
  };
  
  // Fonctions pour gérer les permis de construire
  const addBuildingPermit = () => {
    setBuildingPermits([...buildingPermits, {
      permitNumber: '',
      issuingService: '',
      issueDate: '',
      validityMonths: '36',
      administrativeStatus: 'En attente',
      issuingServiceContact: ''
    }]);
  };
  
  const removeBuildingPermit = (index: number) => {
    setBuildingPermits(buildingPermits.filter((_, i) => i !== index));
  };
  
  const updateBuildingPermit = (index: number, field: string, value: string) => {
    const updated = [...buildingPermits];
    updated[index] = { ...updated[index], [field]: value };
    setBuildingPermits(updated);
  };
  
  // Fonctions pour gérer les coordonnées GPS
  const addGPSCoordinate = () => {
    setGpsCoordinates([...gpsCoordinates, {
      borne: `Borne ${gpsCoordinates.length + 1}`,
      lat: '',
      lng: ''
    }]);
  };
  
  const removeGPSCoordinate = (index: number) => {
    setGpsCoordinates(gpsCoordinates.filter((_, i) => i !== index));
  };
  
  const updateGPSCoordinate = (index: number, field: string, value: string) => {
    const updated = [...gpsCoordinates];
    updated[index] = { ...updated[index], [field]: value };
    setGpsCoordinates(updated);
  };
  
  const captureCurrentLocation = (index: number) => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Capture en cours",
      description: "Récupération de votre position GPS...",
    });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const updated = [...gpsCoordinates];
        updated[index] = {
          ...updated[index],
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6)
        };
        setGpsCoordinates(updated);
        
        toast({
          title: "Position capturée",
          description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
      },
      (error) => {
        let errorMessage = "Impossible de récupérer votre position";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Veuillez autoriser l'accès à votre position";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Position indisponible";
            break;
          case error.TIMEOUT:
            errorMessage = "La demande de position a expiré";
            break;
        }
        
        toast({
          title: "Erreur de géolocalisation",
          description: errorMessage,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Fonctions pour gérer les côtés de la parcelle
  const addParcelSide = () => {
    const sideNumber = parcelSides.length + 1;
    setParcelSides([...parcelSides, {
      name: `Côté ${sideNumber}`,
      length: ''
    }]);
  };

  const removeParcelSide = (index: number) => {
    if (parcelSides.length > 2) {
      setParcelSides(parcelSides.filter((_, i) => i !== index));
    }
  };

  const updateParcelSide = (index: number, field: 'name' | 'length', value: string) => {
    const updated = [...parcelSides];
    updated[index] = { ...updated[index], [field]: value };
    setParcelSides(updated);
  };


  const handleClose = () => {
    setFormData({ parcelNumber: parcelNumber, whatsappNumber: '' });
    setShowSuccess(false);
    setGeneratedCode('');
    setRequestWhatsAppNotif(false);
    setOwnerDocFile(null);
    setTitleDocFile(null);
    setSectionType('');
    setSectionTypeAutoDetected(false);
    setPreviousOwners([]);
    setTaxRecords([]);
    setMortgageRecords([]);
    setObligationType('taxes');
    setParcelSides([
      { name: 'Côté Nord', length: '' },
      { name: 'Côté Sud', length: '' },
      { name: 'Côté Est', length: '' },
      { name: 'Côté Ouest', length: '' }
    ]);
    setAvailableQuartiers([]);
    setAvailableAvenues([]);
    onOpenChange(false);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <CheckCircle2 className="h-20 w-20 text-primary relative animate-scale-in" />
            </div>
            <DialogTitle className="text-2xl text-center font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Merci pour votre contribution !
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre contribution pour la parcelle <strong className="text-foreground">{parcelNumber}</strong> a été enregistrée.
              Elle sera vérifiée par notre équipe.
            </DialogDescription>
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 rounded-xl w-full border border-primary/20 shadow-lg backdrop-blur-sm animate-scale-in">
              <p className="text-sm text-muted-foreground mb-3 font-medium">Votre Code Contributeur Cadastral :</p>
              <p className="text-3xl font-bold text-primary text-center tracking-wider font-mono">{generatedCode}</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-background/80 rounded-md">Valeur : 5 USD</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="px-2 py-1 bg-background/80 rounded-md">Expire dans 90 jours</span>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground max-w-sm">
              Vous pouvez utiliser ce code pour payer vos prochains services cadastraux.
            </p>
            <Button onClick={handleClose} className="w-full shadow-lg hover:shadow-xl transition-all">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="text-2xl font-semibold">Contribuer aux informations cadastrales</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Parcelle : <strong className="text-foreground font-semibold">{parcelNumber}</strong>
            <br />
            <span className="text-sm">Renseignez les informations que vous possédez sur cette parcelle.</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full px-6 pb-6">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1 rounded-lg shadow-inner">
            <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Général
            </TabsTrigger>
            <TabsTrigger value="location" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Localisation
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Historiques
            </TabsTrigger>
            <TabsTrigger value="obligations" className="data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
              Obligations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6 animate-fade-in">
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

            {formData.propertyTitleType && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="titleReference">Numéro de référence du titre</Label>
                <Input
                  id="titleReference"
                  placeholder="Ex: TF-123456 ou CE-987654"
                  value={formData.titleReferenceNumber || ''}
                  onChange={(e) => handleInputChange('titleReferenceNumber', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Numéro de référence figurant sur le document de propriété
                </p>
              </div>
            )}

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
                max={new Date().toISOString().split('T')[0]}
                value={formData.currentOwnerSince || ''}
                onChange={(e) => handleInputChange('currentOwnerSince', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Superficie</Label>
              
              <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-transparent border border-border/50">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Dimensions de chaque côté (en mètres)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez les dimensions de chaque côté de la parcelle
                  </p>
                </div>

                <div className="space-y-2">
                  {parcelSides.map((side, index) => (
                    <div key={index} className="flex items-center gap-2 animate-fade-in">
                      <Input
                        placeholder="Nom du côté"
                        value={side.name}
                        onChange={(e) => updateParcelSide(index, 'name', e.target.value)}
                        className="flex-1 transition-all focus:scale-[1.01]"
                      />
                      <Input
                        type="number"
                        placeholder="Longueur"
                        value={side.length}
                        onChange={(e) => updateParcelSide(index, 'length', e.target.value)}
                        className="w-32 transition-all focus:scale-[1.01]"
                      />
                      <span className="text-xs text-muted-foreground w-6">m</span>
                      {parcelSides.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParcelSide(index)}
                          className="hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParcelSide}
                  className="w-full hover:bg-primary/5 transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un côté
                </Button>

                {formData.areaSqm && (
                  <div className="p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 animate-scale-in">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Superficie calculée
                    </p>
                    <p className="text-3xl font-bold text-primary mb-2">{formData.areaSqm} m²</p>
                    <p className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded-md inline-block">
                      {parcelSides.length === 2 && "Calcul rectangulaire simple"}
                      {parcelSides.length === 4 && "Calcul rectangulaire (4 côtés)"}
                      {parcelSides.length > 4 && "Approximation basée sur les dimensions"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionType">Type de construction</Label>
              <Select onValueChange={(value) => handleInputChange('constructionType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Résidentielle">Résidentielle</SelectItem>
                  <SelectItem value="Commerciale">Commerciale</SelectItem>
                  <SelectItem value="Industrielle">Industrielle</SelectItem>
                  <SelectItem value="Agricole">Agricole</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                  <SelectItem value="Terrain nu">Terrain nu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constructionNature">Nature de construction</Label>
              <Select onValueChange={(value) => handleInputChange('constructionNature', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la nature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Durable">Durable</SelectItem>
                  <SelectItem value="Semi-durable">Semi-durable</SelectItem>
                  <SelectItem value="Précaire">Précaire</SelectItem>
                  <SelectItem value="Non bâti">Non bâti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="declaredUsage">Usage déclaré</Label>
              <Select onValueChange={(value) => handleInputChange('declaredUsage', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner l'usage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Habitation">Habitation</SelectItem>
                  <SelectItem value="Commerce">Commerce</SelectItem>
                  <SelectItem value="Bureau">Bureau</SelectItem>
                  <SelectItem value="Industrie">Industrie</SelectItem>
                  <SelectItem value="Agriculture">Agriculture</SelectItem>
                  <SelectItem value="Usage mixte">Usage mixte</SelectItem>
                  <SelectItem value="Entrepôt">Entrepôt</SelectItem>
                  <SelectItem value="Terrain vacant">Terrain vacant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File uploads section */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="text-sm font-semibold">Pièces jointes (optionnel)</h4>
              
              {/* Owner document */}
              <div className="space-y-2">
                <Label htmlFor="ownerDoc">Document d'identité du propriétaire</Label>
                {!ownerDocFile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="ownerDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'owner')}
                      className="cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{ownerDocFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('owner')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP ou PDF - Max 5 MB
                </p>
              </div>

              {/* Title document */}
              <div className="space-y-2">
                <Label htmlFor="titleDoc">Document du titre de propriété</Label>
                {!titleDocFile ? (
                  <div className="flex items-center gap-2">
                    <Input
                      id="titleDoc"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={(e) => handleFileChange(e, 'title')}
                      className="cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1 truncate">{titleDocFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile('title')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WEBP ou PDF - Max 5 MB
                </p>
              </div>
            </div>
            
            {/* Section Permis de construire */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Permis de construire (optionnel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez les permis de construire si disponibles
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBuildingPermit}
                  className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {buildingPermits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                  <p className="text-sm">Aucun permis ajouté</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {buildingPermits.map((permit, index) => (
                    <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Permis #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBuildingPermit(index)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Numéro du permis</Label>
                          <Input
                            placeholder="ex: PC-2024-001"
                            value={permit.permitNumber}
                            onChange={(e) => updateBuildingPermit(index, 'permitNumber', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Date d'émission</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={permit.issueDate}
                            onChange={(e) => updateBuildingPermit(index, 'issueDate', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Service émetteur</Label>
                        <Input
                          placeholder="ex: Direction de l'Urbanisme"
                          value={permit.issuingService}
                          onChange={(e) => updateBuildingPermit(index, 'issuingService', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Validité (mois)</Label>
                          <Input
                            type="number"
                            placeholder="36"
                            value={permit.validityMonths}
                            onChange={(e) => updateBuildingPermit(index, 'validityMonths', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Statut administratif</Label>
                          <Select
                            value={permit.administrativeStatus}
                            onValueChange={(value) => updateBuildingPermit(index, 'administrativeStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="Conforme">Conforme</SelectItem>
                              <SelectItem value="Non autorisé">Non autorisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Contact du service</Label>
                        <Input
                          placeholder="ex: +243 XXX XXX XXX"
                          value={permit.issuingServiceContact}
                          onChange={(e) => updateBuildingPermit(index, 'issuingServiceContact', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6 mt-6 animate-fade-in">
            {/* Choix du type de section */}
            <div className="space-y-2 pb-4 border-b">
              <Label htmlFor="sectionType">Type de section *</Label>
              <Select 
                value={sectionType} 
                onValueChange={(value: 'urbaine' | 'rurale') => handleSectionTypeChange(value)}
                disabled={sectionTypeAutoDetected}
              >
                <SelectTrigger className={sectionTypeAutoDetected ? 'bg-muted/50 cursor-not-allowed' : ''}>
                  <SelectValue placeholder="Choisir le type de section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urbaine">Section Urbaine (SU)</SelectItem>
                  <SelectItem value="rurale">Section rurale (SR)</SelectItem>
                </SelectContent>
              </Select>
              {sectionTypeAutoDetected ? (
                <p className="text-xs text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Type détecté automatiquement à partir du préfixe "{parcelNumber.toUpperCase().startsWith('SU') ? 'SU' : 'SR'}"
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choisissez si vous renseignez un numéro SU (zone urbaine) ou SR (zone rurale)
                </p>
              )}
            </div>

            {/* Province - toujours visible */}
            {sectionType && (
              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Select 
                  value={formData.province} 
                  onValueChange={(value) => handleInputChange('province', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la province" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllProvinces().map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Section Urbaine (SU) - visible uniquement si type urbain sélectionné */}
            {sectionType === 'urbaine' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section Urbaine (SU)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones urbaines (numéro SU).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Select 
                    value={formData.ville}
                    onValueChange={(value) => handleInputChange('ville', value)}
                    disabled={!formData.province || availableVilles.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableVilles.length === 0 
                        ? "Aucune ville disponible"
                        : "Sélectionner la ville"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVilles.map(ville => (
                        <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">Commune</Label>
                  <Select 
                    value={formData.commune}
                    onValueChange={(value) => handleInputChange('commune', value)}
                    disabled={!formData.ville || availableCommunes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.ville 
                        ? "Sélectionner d'abord une ville" 
                        : availableCommunes.length === 0 
                        ? "Aucune commune disponible"
                        : "Sélectionner la commune"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCommunes.map(commune => (
                        <SelectItem key={commune} value={commune}>{commune}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quartier">Quartier</Label>
                  <Select 
                    value={formData.quartier}
                    onValueChange={(value) => handleInputChange('quartier', value)}
                    disabled={!formData.commune || availableQuartiers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.commune 
                        ? "Sélectionner d'abord une commune" 
                        : availableQuartiers.length === 0 
                        ? "Aucun quartier disponible - saisie manuelle possible"
                        : "Sélectionner le quartier"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuartiers.map(quartier => (
                        <SelectItem key={quartier} value={quartier}>{quartier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableQuartiers.length === 0 && formData.commune && (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Saisir le nom du quartier"
                        value={formData.quartier || ''}
                        onChange={(e) => handleInputChange('quartier', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aucun quartier prédéfini - saisie manuelle</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avenue">Avenue</Label>
                  <Select 
                    value={formData.avenue}
                    onValueChange={(value) => handleInputChange('avenue', value)}
                    disabled={!formData.quartier || availableAvenues.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.quartier 
                        ? "Sélectionner d'abord un quartier" 
                        : availableAvenues.length === 0 
                        ? "Aucune avenue disponible - saisie manuelle possible"
                        : "Sélectionner l'avenue"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAvenues.map(avenue => (
                        <SelectItem key={avenue} value={avenue}>{avenue}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableAvenues.length === 0 && formData.quartier && (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Saisir le nom de l'avenue"
                        value={formData.avenue || ''}
                        onChange={(e) => handleInputChange('avenue', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Aucune avenue prédéfinie - saisie manuelle</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Rurale (SR) - visible uniquement si type rural sélectionné */}
            {sectionType === 'rurale' && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-semibold text-muted-foreground">Section rurale (SR)</h4>
                <p className="text-xs text-muted-foreground">
                  Remplissez ces champs pour les zones rurales (numéro SR).
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="territoire">Territoire</Label>
                  <Select 
                    value={formData.territoire}
                    onValueChange={(value) => handleInputChange('territoire', value)}
                    disabled={!formData.province || availableTerritoires.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.province 
                        ? "Sélectionner d'abord une province" 
                        : availableTerritoires.length === 0 
                        ? "Aucun territoire disponible"
                        : "Sélectionner le territoire"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTerritoires.map(territoire => (
                        <SelectItem key={territoire} value={territoire}>{territoire}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collectivite">Collectivité</Label>
                  <Select 
                    value={formData.collectivite}
                    onValueChange={(value) => handleInputChange('collectivite', value)}
                    disabled={!formData.territoire || availableCollectivites.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.territoire 
                        ? "Sélectionner d'abord un territoire" 
                        : availableCollectivites.length === 0 
                        ? "Aucune collectivité disponible"
                        : "Sélectionner la collectivité"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCollectivites.map(collectivite => (
                        <SelectItem key={collectivite} value={collectivite}>{collectivite}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupement">Groupement</Label>
                  <Input
                    id="groupement"
                    placeholder="ex: Katoyi"
                    value={formData.groupement || ''}
                    onChange={(e) => handleInputChange('groupement', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input
                    id="village"
                    placeholder="ex: Mushaki"
                    value={formData.village || ''}
                    onChange={(e) => handleInputChange('village', e.target.value)}
                    disabled={!formData.collectivite}
                  />
                  <p className="text-xs text-muted-foreground">
                    {!formData.collectivite ? "Sélectionner d'abord une collectivité" : "Saisie manuelle - optionnel"}
                  </p>
                </div>
              </div>
            )}
            
            {/* Coordonnées GPS des bornes */}
            {sectionType && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Coordonnées GPS des bornes (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les coordonnées GPS de chaque borne du terrain
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGPSCoordinate}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {gpsCoordinates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
                    <p className="text-sm">Aucune coordonnée GPS ajoutée</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gpsCoordinates.map((coord, index) => (
                      <div key={index} className="border rounded-xl p-4 space-y-3 bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Nom de la borne"
                            value={coord.borne}
                            onChange={(e) => updateGPSCoordinate(index, 'borne', e.target.value)}
                            className="flex-1 mr-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGPSCoordinate(index)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Latitude</Label>
                              <Input
                                type="number"
                                step="0.000001"
                                placeholder="ex: -1.674"
                                value={coord.lat}
                                onChange={(e) => updateGPSCoordinate(index, 'lat', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Longitude</Label>
                              <Input
                                type="number"
                                step="0.000001"
                                placeholder="ex: 29.224"
                                value={coord.lng}
                                onChange={(e) => updateGPSCoordinate(index, 'lng', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => captureCurrentLocation(index)}
                            className="w-full gap-2 hover:bg-primary/10 transition-all"
                          >
                            <MapPin className="h-4 w-4" />
                            Capturer ma position actuelle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Historique de propriété (optionnel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ajoutez les anciens propriétaires que vous connaissez
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPreviousOwner}
                  className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {previousOwners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Aucun ancien propriétaire ajouté</p>
                    <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {previousOwners.map((owner, index) => (
                    <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Propriétaire #{index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePreviousOwner(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label>Nom de l'ancien propriétaire</Label>
                        <Input
                          placeholder="ex: Jean Mukendi"
                          value={owner.name}
                          onChange={(e) => updatePreviousOwner(index, 'name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Statut juridique</Label>
                        <Select
                          value={owner.legalStatus}
                          onValueChange={(value) => updatePreviousOwner(index, 'legalStatus', value)}
                        >
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

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Date début</Label>
                          <Input
                            type="date"
                            max={formData.currentOwnerSince || new Date().toISOString().split('T')[0]}
                            value={owner.startDate}
                            onChange={(e) => updatePreviousOwner(index, 'startDate', e.target.value)}
                          />
                          {owner.startDate && owner.endDate && owner.startDate > owner.endDate && (
                            <p className="text-xs text-destructive">La date de début doit être avant la date de fin</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Date fin</Label>
                          <Input
                            type="date"
                            min={owner.startDate || undefined}
                            max={formData.currentOwnerSince || new Date().toISOString().split('T')[0]}
                            value={owner.endDate}
                            onChange={(e) => updatePreviousOwner(index, 'endDate', e.target.value)}
                          />
                          {owner.endDate && formData.currentOwnerSince && owner.endDate > formData.currentOwnerSince && (
                            <p className="text-xs text-destructive">La date de fin doit être avant la date du propriétaire actuel</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Type de mutation</Label>
                        <Select
                          value={owner.mutationType}
                          onValueChange={(value) => updatePreviousOwner(index, 'mutationType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Vente">Vente</SelectItem>
                            <SelectItem value="Donation">Donation</SelectItem>
                            <SelectItem value="Succession">Succession</SelectItem>
                            <SelectItem value="Expropriation">Expropriation</SelectItem>
                            <SelectItem value="Échange">Échange</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Informations de bornage intégrées */}
                      <div className="pt-3 border-t space-y-3">
                        <Label className="text-sm font-medium text-muted-foreground">Bornage (optionnel)</Label>
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Numéro de référence du PV</Label>
                          <Input
                            placeholder="ex: PV/2024/001"
                            value={owner.pvReferenceNumber || ''}
                            onChange={(e) => updatePreviousOwner(index, 'pvReferenceNumber', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Date du bornage</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={owner.surveyDate || ''}
                            onChange={(e) => updatePreviousOwner(index, 'surveyDate', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Nom du géomètre</Label>
                          <Input
                            placeholder="ex: Géomètre Kalala"
                            value={owner.surveyorName || ''}
                            onChange={(e) => updatePreviousOwner(index, 'surveyorName', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="obligations" className="space-y-6 mt-6 animate-fade-in">
            {/* Switch Taxes/Hypothèques redesigné */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit shadow-inner">
              <Button
                type="button"
                variant={obligationType === 'taxes' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('taxes')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Taxes
              </Button>
              <Button
                type="button"
                variant={obligationType === 'mortgages' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setObligationType('mortgages')}
                className="transition-all hover:scale-105 shadow-sm"
              >
                Hypothèques
              </Button>
            </div>

            {/* Section Taxes */}
            {obligationType === 'taxes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Historique des taxes (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les taxes que vous connaissez pour cette parcelle
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTaxRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {taxRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Aucune taxe ajoutée</p>
                      <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {taxRecords.map((tax, index) => (
                      <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Taxe #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTaxRecord(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Type de taxe</Label>
                          <Select
                            value={tax.taxType}
                            onValueChange={(value) => updateTaxRecord(index, 'taxType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type de taxe" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Impôt foncier annuel">Impôt foncier annuel</SelectItem>
                              <SelectItem value="Impôt sur les revenus locatifs">Impôt sur les revenus locatifs</SelectItem>
                              <SelectItem value="Taxe de superficie">Taxe de superficie</SelectItem>
                              <SelectItem value="Taxe de plus-value immobilière">Taxe de plus-value immobilière</SelectItem>
                              <SelectItem value="Taxe d'habitation">Taxe d'habitation</SelectItem>
                              <SelectItem value="Autre taxe">Autre taxe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Année fiscale</Label>
                          <Select
                            value={tax.taxYear}
                            onValueChange={(value) => updateTaxRecord(index, 'taxYear', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner l'année" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - i;
                                return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Années fiscales valides uniquement</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant payé (USD)</Label>
                          <Input
                            type="number"
                            placeholder="ex: 150"
                            value={tax.taxAmount}
                            onChange={(e) => updateTaxRecord(index, 'taxAmount', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Statut de paiement</Label>
                          <Select
                            value={tax.paymentStatus}
                            onValueChange={(value) => updateTaxRecord(index, 'paymentStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Payé">Payé</SelectItem>
                              <SelectItem value="Payé partiellement">Payé partiellement</SelectItem>
                              <SelectItem value="En attente">En attente</SelectItem>
                              <SelectItem value="En retard">En retard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Date de paiement</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={tax.paymentDate}
                            onChange={(e) => updateTaxRecord(index, 'paymentDate', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        {/* Pièce jointe pour la taxe */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!tax.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleTaxFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{tax.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTaxFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Reçu de paiement (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section Hypothèques */}
            {obligationType === 'mortgages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Hypothèque (optionnel)</Label>
                    <p className="text-xs text-muted-foreground">
                      Ajoutez les hypothèques que vous connaissez pour cette parcelle
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMortgageRecord}
                    className="gap-2 hover:bg-primary/5 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>

                {mortgageRecords.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 animate-fade-in">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">Aucune hypothèque ajoutée</p>
                      <p className="text-xs mt-1">Cliquez sur "Ajouter" pour commencer</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {mortgageRecords.map((mortgage, index) => (
                      <div key={index} className="border rounded-xl p-5 space-y-4 relative bg-gradient-to-br from-muted/30 to-transparent hover:shadow-md transition-all animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold bg-primary/10 px-3 py-1 rounded-full">Hypothèque #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMortgageRecord(index)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label>Montant de l'hypothèque (USD)</Label>
                          <Input
                            type="number"
                            placeholder="ex: 50000"
                            value={mortgage.mortgageAmount}
                            onChange={(e) => updateMortgageRecord(index, 'mortgageAmount', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Durée (mois)</Label>
                          <Input
                            type="number"
                            placeholder="ex: 120"
                            value={mortgage.duration}
                            onChange={(e) => updateMortgageRecord(index, 'duration', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nom du créancier</Label>
                          <Input
                            placeholder="ex: Banque XYZ"
                            value={mortgage.creditorName}
                            onChange={(e) => updateMortgageRecord(index, 'creditorName', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Type de créancier</Label>
                          <Select
                            value={mortgage.creditorType}
                            onValueChange={(value) => updateMortgageRecord(index, 'creditorType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Banque">Banque</SelectItem>
                              <SelectItem value="Microfinance">Microfinance</SelectItem>
                              <SelectItem value="Coopérative">Coopérative</SelectItem>
                              <SelectItem value="Particulier">Particulier</SelectItem>
                              <SelectItem value="Autre institution">Autre institution</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Date du contrat</Label>
                          <Input
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            value={mortgage.contractDate}
                            onChange={(e) => updateMortgageRecord(index, 'contractDate', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">Ne peut pas être dans le futur</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Statut de l'hypothèque</Label>
                          <Select
                            value={mortgage.mortgageStatus}
                            onValueChange={(value) => updateMortgageRecord(index, 'mortgageStatus', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Remboursée">Remboursée</SelectItem>
                              <SelectItem value="En défaut">En défaut</SelectItem>
                              <SelectItem value="Renégociée">Renégociée</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Pièce jointe pour l'hypothèque */}
                        <div className="space-y-2 pt-2 border-t">
                          <Label>Pièce justificative (optionnel)</Label>
                          {!mortgage.receiptFile ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                onChange={(e) => handleMortgageFileChange(index, e)}
                                className="cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="text-sm flex-1 truncate">{mortgage.receiptFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMortgageFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Contrat ou justificatif (JPG, PNG, WEBP ou PDF - Max 5 MB)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-3 px-6 py-4 border-t bg-muted/20">
          <Checkbox 
            id="whatsapp" 
            checked={requestWhatsAppNotif}
            onCheckedChange={(checked) => setRequestWhatsAppNotif(checked as boolean)}
            className="transition-all"
          />
          <Label htmlFor="whatsapp" className="text-sm cursor-pointer hover:text-primary transition-colors">
            M'informer par WhatsApp si les informations sont validées
          </Label>
        </div>

        {requestWhatsAppNotif && (
          <div className="px-6 pb-4 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number" className="text-sm font-medium">Numéro WhatsApp</Label>
              <Input
                id="whatsapp-number"
                placeholder="+243 XXX XXX XXX"
                value={formData.whatsappNumber || ''}
                onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                className="transition-all focus:scale-[1.01]"
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 px-6 pb-6">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={loading} 
            className="flex-1 h-12 hover:bg-muted transition-all hover:scale-[1.02]"
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || uploading} 
            className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            {(loading || uploading) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {uploading ? 'Téléchargement...' : 'Soumettre la contribution'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadastralContributionDialog;
