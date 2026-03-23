import { Clock, CheckCircle2, XCircle, AlertCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TimelineEvent {
  date: string;
  status: "pending" | "approved" | "rejected" | "appeal_submitted" | "appeal_accepted" | "appeal_rejected";
  title: string;
  description?: string;
}

interface PermitTimelineProps {
  permit: any;
}

export function PermitTimeline({ permit }: PermitTimelineProps) {
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Soumission initiale
    events.push({
      date: permit.created_at,
      status: "pending",
      title: "Demande soumise",
      description: `Demande d'autorisation pour la parcelle ${permit.parcel_number}`,
    });

    // Révision
    if (permit.reviewed_at) {
      events.push({
        date: permit.reviewed_at,
        status: permit.status === "approved" ? "approved" : "pending",
        title: "Demande en cours d'examen",
        description: "Votre demande est en cours de traitement",
      });
    }

    // Approbation ou rejet
    if (permit.status === "approved" || permit.status === "verified") {
      events.push({
        date: permit.verified_at || permit.reviewed_at,
        status: "approved",
        title: "Permis délivré",
        description: "Votre autorisation de bâtir a été délivrée avec succès",
      });
    } else if (permit.status === "rejected" && permit.rejection_date) {
      events.push({
        date: permit.rejection_date,
        status: "rejected",
        title: "Demande refusée",
        description: `${permit.rejection_reasons?.length || 0} raison(s) de refus`,
      });
    }

    // Recours
    if (permit.appeal_submitted && permit.appeal_submission_date) {
      events.push({
        date: permit.appeal_submission_date,
        status: "appeal_submitted",
        title: "Recours soumis",
        description: "Votre recours est en cours d'examen",
      });

      if (permit.appeal_status === "accepted") {
        events.push({
          date: new Date().toISOString(),
          status: "appeal_accepted",
          title: "Recours accepté",
          description: "Votre recours a été accepté, le permis va être délivré",
        });
      } else if (permit.appeal_status === "rejected") {
        events.push({
          date: new Date().toISOString(),
          status: "appeal_rejected",
          title: "Recours rejeté",
          description: "Votre recours a été rejeté",
        });
      }
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getStatusIcon = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "approved":
      case "appeal_accepted":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
      case "appeal_rejected":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "appeal_submitted":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "pending":
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getEstimatedProcessingTime = () => {
    const createdDate = new Date(permit.created_at);
    const now = new Date();
    const daysPassed = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedDays = 30; // Estimation de 30 jours pour le traitement

    if (permit.status === "pending") {
      const remainingDays = Math.max(0, estimatedDays - daysPassed);
      return {
        total: estimatedDays,
        remaining: remainingDays,
        percentage: Math.min(100, (daysPassed / estimatedDays) * 100),
      };
    }

    return null;
  };

  const events = getTimelineEvents();
  const processingTime = getEstimatedProcessingTime();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Historique de la demande</span>
          {permit.status === "pending" && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              En traitement
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {processingTime && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Délai de traitement estimé</span>
              <span className="font-medium">~{processingTime.remaining} jours restants</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${processingTime.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="relative space-y-4">
          {events.map((event, index) => (
            <div key={index} className="relative flex gap-4">
              {/* Ligne verticale */}
              {index < events.length - 1 && (
                <div className="absolute left-[10px] top-8 h-full w-px bg-border" />
              )}

              {/* Icône */}
              <div className="relative z-10 flex-shrink-0 rounded-full bg-background p-1">
                {getStatusIcon(event.status)}
              </div>

              {/* Contenu */}
              <div className="flex-1 space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{event.title}</h4>
                  <time className="text-xs text-muted-foreground">
                    {format(new Date(event.date), "d MMM yyyy", { locale: fr })}
                  </time>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
