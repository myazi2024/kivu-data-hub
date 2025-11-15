import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

interface PermitValidationScoreProps {
  permitData: any;
  requestType: "construction" | "regularization";
}

export function PermitValidationScore({ permitData, requestType }: PermitValidationScoreProps) {
  const validatePermitData = (): { score: number; issues: ValidationIssue[] } => {
    const issues: ValidationIssue[] = [];
    let totalFields = 0;
    let validFields = 0;

    // Validation des champs obligatoires
    const requiredFields = [
      { key: "requestType", label: "Type de demande" },
      { key: "issuingService", label: "Service émetteur" },
      { key: "contactPerson", label: "Personne de contact" },
      { key: "contactPhone", label: "Téléphone de contact" },
    ];

    if (requestType === "regularization") {
      requiredFields.push({ key: "previousPermitNumber", label: "Numéro du permis précédent" });
    }

    requiredFields.forEach(({ key, label }) => {
      totalFields++;
      if (!permitData?.[key] || permitData[key] === "") {
        issues.push({
          field: label,
          severity: "error",
          message: `${label} est obligatoire`,
        });
      } else {
        validFields++;
      }
    });

    // Validation du numéro de téléphone
    totalFields++;
    if (permitData?.contactPhone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(permitData.contactPhone)) {
        issues.push({
          field: "Téléphone",
          severity: "warning",
          message: "Le format du numéro de téléphone semble incorrect",
        });
      } else {
        validFields++;
      }
    }

    // Validation de l'email si présent
    if (permitData?.contactEmail) {
      totalFields++;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(permitData.contactEmail)) {
        issues.push({
          field: "Email",
          severity: "warning",
          message: "Le format de l'email semble incorrect",
        });
      } else {
        validFields++;
      }
    }

    // Calcul du score
    const score = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0;

    return { score, issues };
  };

  const { score, issues } = validatePermitData();

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (score >= 50) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Score de complétude</span>
          <div className="flex items-center gap-2">
            {getScoreIcon(score)}
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={score} className="h-2" />

        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold">Erreurs critiques ({errors.length})</span>
            </div>
            {errors.map((issue, idx) => (
              <div key={idx} className="ml-6 text-sm">
                <Badge variant="destructive" className="mr-2">
                  {issue.field}
                </Badge>
                <span className="text-muted-foreground">{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-semibold">Avertissements ({warnings.length})</span>
            </div>
            {warnings.map((issue, idx) => (
              <div key={idx} className="ml-6 text-sm">
                <Badge variant="outline" className="mr-2 border-yellow-600 text-yellow-600">
                  {issue.field}
                </Badge>
                <span className="text-muted-foreground">{issue.message}</span>
              </div>
            ))}
          </div>
        )}

        {score === 100 && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Demande complète et prête à être soumise</span>
          </div>
        )}

        {score < 80 && score >= 50 && (
          <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Complétez les informations pour améliorer vos chances d'approbation</span>
          </div>
        )}

        {score < 50 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Des informations essentielles manquent</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
