import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface AppealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributionId: string;
  parcelNumber: string;
  rejectionReasons: string[];
  onSuccess: () => void;
}

export function AppealDialog({
  open,
  onOpenChange,
  contributionId,
  parcelNumber,
  rejectionReasons,
  onSuccess
}: AppealDialogProps) {
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!justification.trim()) {
      toast.error("Veuillez fournir une justification pour votre recours");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('cadastral_contributions')
        .update({
          appeal_submitted: true,
          appeal_submission_date: new Date().toISOString(),
          appeal_status: 'pending',
          appeal_data: {
            justification: justification.trim(),
            original_rejection_reasons: rejectionReasons,
            submission_date: new Date().toISOString()
          }
        })
        .eq('id', contributionId);

      if (error) throw error;

      toast.success("Recours soumis avec succès");
      onSuccess();
      onOpenChange(false);
      setJustification("");
    } catch (error) {
      console.error('Error submitting appeal:', error);
      toast.error("Erreur lors de la soumission du recours");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Soumettre un recours
          </DialogTitle>
          <DialogDescription>
            Parcelle: {parcelNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Raisons du refus :</p>
            <ul className="text-sm space-y-1">
              {rejectionReasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification du recours <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="justification"
              placeholder="Expliquez pourquoi vous contestez ce refus et fournissez les éléments qui justifient votre recours..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 50 caractères
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || justification.trim().length < 50}
            >
              {loading ? "Soumission..." : "Soumettre le recours"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
