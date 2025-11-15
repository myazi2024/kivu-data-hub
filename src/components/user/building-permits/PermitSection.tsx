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
      <div className="space-y-2 md:space-y-3">
        <h3 className="text-xs md:text-sm font-semibold text-muted-foreground px-1">{title}</h3>
        <Card>
          <CardContent className="py-6 md:py-8 text-center px-4">
            <Building2 className="h-8 w-8 md:h-10 md:w-10 mx-auto text-muted-foreground/50 mb-2 md:mb-3" />
            <p className="text-xs md:text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      <h3 className="text-xs md:text-sm font-semibold flex items-center gap-2 px-1">
        {title}
        <span className="text-[10px] md:text-xs font-normal text-muted-foreground">({permits.length})</span>
      </h3>
      <div className="space-y-2 md:space-y-3">
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
