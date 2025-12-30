import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCadastralContribution } from '@/hooks/useCadastralContribution';
import { Gift, Clock, CheckCircle2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getCodeStatus } from '@/utils/cccCodeUtils';

const ContributorCodesPanel: React.FC = () => {
  const { codes, fetchUserCodes } = useCadastralContribution();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchUserCodes();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Code copié",
      description: "Le code a été copié dans le presse-papiers",
    });
  };

  const activeCodes = codes.filter(c => !c.is_used && new Date(c.expires_at) > new Date());
  const usedCodes = codes.filter(c => c.is_used);
  const expiredCodes = codes.filter(c => !c.is_used && new Date(c.expires_at) <= new Date());

  // Paginated active codes
  const paginatedActiveCodes = activeCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(activeCodes.length / itemsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Mes Codes Contributeur Cadastral (CCC)
        </CardTitle>
        <CardDescription>
          Gagnez des codes CCC en contribuant aux informations cadastrales. 
          La valeur de chaque code (0.50 à 5 USD) dépend de la complétude de votre contribution (29 champs dont pièces jointes).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {activeCodes.length === 0 && usedCodes.length === 0 && expiredCodes.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Aucun code CCC disponible</h3>
            <p className="text-muted-foreground text-sm">
              Contribuez aux informations cadastrales pour gagner des codes CCC
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeCodes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <span className="text-primary">Codes actifs</span>
                  <Badge variant="secondary" className="rounded-full">{activeCodes.length}</Badge>
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {paginatedActiveCodes.map((code) => (
                    <Card key={code.id} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40 transition-all">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-lg">{code.code}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(code.code)}
                                className="h-7 w-7 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <Badge className="bg-primary text-primary-foreground">
                              {code.value_usd} USD
                            </Badge>
                          </div>
                          
                          <div className="space-y-1.5 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="font-medium">Parcelle:</span>
                              <span className="font-mono">{code.parcel_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Expire le {format(new Date(code.expires_at), 'dd MMMM yyyy', { locale: fr })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Pagination for active codes */}
                {activeCodes.length > itemsPerPage && (
                  <div className="flex items-center justify-between pt-3 mt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, activeCodes.length)} sur {activeCodes.length}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs px-2">{currentPage}/{totalPages}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {usedCodes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                  <span>Codes utilisés</span>
                  <Badge variant="outline" className="rounded-full">{usedCodes.length}</Badge>
                </h3>
                <div className="space-y-2">
                  {usedCodes.map((code) => (
                    <Card key={code.id} className="border-muted bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="space-y-0.5">
                              <p className="font-mono font-bold text-sm line-through">{code.code}</p>
                              <p className="text-xs text-muted-foreground">
                                Utilisé le {code.used_at ? format(new Date(code.used_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{code.value_usd} USD</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {expiredCodes.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                  <span>Codes expirés</span>
                  <Badge variant="outline" className="rounded-full">{expiredCodes.length}</Badge>
                </h3>
                <div className="space-y-2">
                  {expiredCodes.map((code) => (
                    <Card key={code.id} className="border-destructive/30 bg-destructive/5">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="font-mono font-bold text-sm line-through">{code.code}</p>
                            <p className="text-xs text-muted-foreground">
                              Expiré le {format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-xs">Expiré</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContributorCodesPanel;
