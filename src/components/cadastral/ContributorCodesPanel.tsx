import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCadastralContribution } from '@/hooks/useCadastralContribution';
import { Gift, Clock, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ContributorCodesPanel: React.FC = () => {
  const { codes, fetchUserCodes } = useCadastralContribution();
  const { toast } = useToast();

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Mes Codes Contributeur Cadastral (CCC)
          </CardTitle>
          <CardDescription>
            Gagnez des codes CCC en contribuant aux informations cadastrales. 
            Chaque code vaut 5 USD et peut être utilisé pour payer vos services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeCodes.length === 0 && usedCodes.length === 0 && expiredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Vous n'avez pas encore de codes CCC</p>
              <p className="text-sm mt-2">
                Contribuez aux informations cadastrales pour en gagner
              </p>
            </div>
          ) : (
            <>
              {activeCodes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-primary">Codes actifs ({activeCodes.length})</h3>
                  {activeCodes.map((code) => (
                    <Card key={code.id} className="border-primary/20 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-lg">{code.code}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(code.code)}
                                className="h-7 w-7 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Parcelle : {code.parcel_number}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Expire le {format(new Date(code.expires_at), 'dd MMMM yyyy', { locale: fr })}
                            </div>
                          </div>
                          <Badge variant="default" className="bg-primary">
                            {code.value_usd} USD
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {usedCodes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Codes utilisés ({usedCodes.length})</h3>
                  {usedCodes.map((code) => (
                    <Card key={code.id} className="opacity-60">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-bold text-sm line-through">{code.code}</p>
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Utilisé le {code.used_at ? format(new Date(code.used_at), 'dd/MM/yyyy', { locale: fr }) : '-'}
                            </p>
                          </div>
                          <Badge variant="outline">
                            Utilisé
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {expiredCodes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Codes expirés ({expiredCodes.length})</h3>
                  {expiredCodes.map((code) => (
                    <Card key={code.id} className="opacity-60">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-mono font-bold text-sm line-through">{code.code}</p>
                            <p className="text-xs text-muted-foreground">
                              Expiré le {format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: fr })}
                            </p>
                          </div>
                          <Badge variant="destructive" className="opacity-70">
                            Expiré
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContributorCodesPanel;
