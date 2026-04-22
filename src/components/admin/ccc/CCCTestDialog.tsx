import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { TestResult } from './types';

interface CCCTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: TestResult[];
}

export const CCCTestDialog: React.FC<CCCTestDialogProps> = ({ open, onOpenChange, results }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-3 md:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-base md:text-lg">Tests d'Intégrité CCC</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 md:space-y-3">
          {results.map((result, idx) => (
            <div key={idx} className="p-2 md:p-3 rounded border">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="mt-0.5">
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-500" />}
                  {result.status === 'warning' && <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs md:text-sm">{result.test}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{result.message}</p>
                  {result.details && (
                    <pre className="text-[10px] md:text-xs bg-secondary p-1.5 md:p-2 rounded mt-1 md:mt-2 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ))}

          {results.length > 0 && (
            <div className="pt-2 md:pt-3 border-t">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4 text-xs md:text-sm">
                <div className="flex items-center gap-1 md:gap-2">
                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                  <span>{results.filter(r => r.status === 'success').length} succès</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
                  <span>{results.filter(r => r.status === 'warning').length} avert.</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                  <span>{results.filter(r => r.status === 'error').length} erreurs</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CCCTestDialog;
