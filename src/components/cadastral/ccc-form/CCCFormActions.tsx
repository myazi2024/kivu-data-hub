import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CCCFormActionsProps {
  onSubmit: () => void;
  onSave?: () => void;
  loading?: boolean;
  uploading?: boolean;
  canSubmit?: boolean;
  errorMessage?: string;
}

export const CCCFormActions: React.FC<CCCFormActionsProps> = ({
  onSubmit,
  onSave,
  loading = false,
  uploading = false,
  canSubmit = true,
  errorMessage
}) => {
  return (
    <div className="space-y-4 pt-6 border-t">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {onSave && (
          <Button
            type="button"
            variant="outline"
            onClick={onSave}
            disabled={loading || uploading}
            className="w-full sm:w-auto touch-manipulation min-h-[44px]"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder le brouillon
          </Button>
        )}

        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || loading || uploading}
          className="w-full sm:flex-1 touch-manipulation min-h-[44px]"
        >
          {loading || uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploading ? 'Téléchargement...' : 'Soumission...'}
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Soumettre la contribution
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Plus vous renseignez de champs, plus votre code CCC aura de valeur (0.50 à 5 USD)
      </p>
    </div>
  );
};
