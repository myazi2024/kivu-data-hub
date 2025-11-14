import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PermitCard } from "./PermitCard";

interface PermitSectionProps {
  title: string;
  permits: any[];
  emptyMessage: string;
  onAppealClick?: (permit: any) => void;
}

export function PermitSection({ title, permits, emptyMessage, onAppealClick }: PermitSectionProps) {
  if (permits.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <Card>
          <CardContent className="py-8 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-muted-foreground">({permits.length})</span>
      </h3>
      <div className="space-y-3">
        {permits.map((permit) => (
          <PermitCard 
            key={permit.id} 
            permit={permit}
            onAppealClick={onAppealClick ? () => onAppealClick(permit) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
