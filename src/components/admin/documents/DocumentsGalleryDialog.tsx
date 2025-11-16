import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Image as ImageIcon, Download, ExternalLink, File } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DocumentsGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcelNumber: string;
  ownerDocumentUrl: string | null;
  propertyTitleDocumentUrl: string | null;
  buildingPermits: any;
  taxHistory: any;
  mortgageHistory: any;
  ownershipHistory: any;
  boundaryHistory: any;
}

export const DocumentsGalleryDialog: React.FC<DocumentsGalleryDialogProps> = ({
  open,
  onOpenChange,
  parcelNumber,
  ownerDocumentUrl,
  propertyTitleDocumentUrl,
  buildingPermits,
  taxHistory,
  mortgageHistory,
  ownershipHistory,
  boundaryHistory
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Compter tous les documents
  const countDocuments = () => {
    let count = 0;
    if (ownerDocumentUrl) count++;
    if (propertyTitleDocumentUrl) count++;
    if (buildingPermits && Array.isArray(buildingPermits)) {
      buildingPermits.forEach(permit => {
        if (permit.attachmentUrl) count++;
      });
    }
    if (taxHistory && Array.isArray(taxHistory)) {
      taxHistory.forEach(tax => {
        if (tax.receiptUrl) count++;
      });
    }
    if (mortgageHistory && Array.isArray(mortgageHistory)) {
      mortgageHistory.forEach(mortgage => {
        if (mortgage.payments && Array.isArray(mortgage.payments)) {
          mortgage.payments.forEach((payment: any) => {
            if (payment.receiptUrl) count++;
          });
        }
      });
    }
    if (ownershipHistory && Array.isArray(ownershipHistory)) {
      ownershipHistory.forEach(ownership => {
        if (ownership.documentUrl) count++;
      });
    }
    if (boundaryHistory && Array.isArray(boundaryHistory)) {
      boundaryHistory.forEach(boundary => {
        if (boundary.documentUrl) count++;
      });
    }
    return count;
  };

  const renderDocument = (url: string, label: string) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    
    return (
      <Card 
        key={url} 
        className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => isImage ? setSelectedImage(url) : window.open(url, '_blank')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{label}</p>
            <p className="text-xs text-muted-foreground">
              {isImage ? 'Image' : 'Document'}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </Card>
    );
  };

  const totalDocs = countDocuments();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Documents - Parcelle {parcelNumber}
              <Badge variant="secondary" className="ml-2">{totalDocs} document(s)</Badge>
            </DialogTitle>
          </DialogHeader>

          {totalDocs === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun document attaché à cette contribution</p>
            </div>
          ) : (
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="main">Principaux</TabsTrigger>
                <TabsTrigger value="permits">Permis</TabsTrigger>
                <TabsTrigger value="obligations">Obligations</TabsTrigger>
                <TabsTrigger value="history">Historique</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[500px] mt-4">
                <TabsContent value="main" className="space-y-2 mt-0">
                  {ownerDocumentUrl && renderDocument(ownerDocumentUrl, 'Document Propriétaire')}
                  {propertyTitleDocumentUrl && renderDocument(propertyTitleDocumentUrl, 'Titre de Propriété')}
                  {(!ownerDocumentUrl && !propertyTitleDocumentUrl) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun document principal</p>
                  )}
                </TabsContent>

                <TabsContent value="permits" className="space-y-2 mt-0">
                  {buildingPermits && Array.isArray(buildingPermits) && buildingPermits.length > 0 ? (
                    buildingPermits.map((permit, idx) => 
                      permit.attachmentUrl && renderDocument(
                        permit.attachmentUrl, 
                        `Permis ${permit.permitType || ''} - ${permit.permitNumber || `N°${idx + 1}`}`
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun document de permis</p>
                  )}
                </TabsContent>

                <TabsContent value="obligations" className="space-y-3 mt-0">
                  {/* Taxes */}
                  {taxHistory && Array.isArray(taxHistory) && taxHistory.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Taxes</h4>
                      <div className="space-y-2">
                        {taxHistory.map((tax, idx) => 
                          tax.receiptUrl && renderDocument(
                            tax.receiptUrl,
                            `Taxe ${tax.taxYear || ''} - ${tax.amountUsd || 0}$`
                          )
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Hypothèques */}
                  {mortgageHistory && Array.isArray(mortgageHistory) && mortgageHistory.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Hypothèques</h4>
                      <div className="space-y-2">
                        {mortgageHistory.map((mortgage, idx) => 
                          mortgage.payments && Array.isArray(mortgage.payments) && 
                          mortgage.payments.map((payment: any, pidx: number) =>
                            payment.receiptUrl && renderDocument(
                              payment.receiptUrl,
                              `Paiement hypothèque ${mortgage.creditorName} - ${payment.amountUsd}$`
                            )
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {(!taxHistory || taxHistory.length === 0) && (!mortgageHistory || mortgageHistory.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun document d'obligation</p>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-3 mt-0">
                  {/* Historique propriété */}
                  {ownershipHistory && Array.isArray(ownershipHistory) && ownershipHistory.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Mutations</h4>
                      <div className="space-y-2">
                        {ownershipHistory.map((ownership, idx) => 
                          ownership.documentUrl && renderDocument(
                            ownership.documentUrl,
                            `Mutation - ${ownership.ownerName}`
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Historique bornage */}
                  {boundaryHistory && Array.isArray(boundaryHistory) && boundaryHistory.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Bornages</h4>
                      <div className="space-y-2">
                        {boundaryHistory.map((boundary, idx) => 
                          boundary.documentUrl && renderDocument(
                            boundary.documentUrl,
                            `PV Bornage - ${boundary.pvReferenceNumber}`
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {(!ownershipHistory || ownershipHistory.length === 0) && (!boundaryHistory || boundaryHistory.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun document historique</p>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox pour les images */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl">
            <img 
              src={selectedImage} 
              alt="Aperçu" 
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
