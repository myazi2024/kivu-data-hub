import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';

interface CCCFormProgressProps {
  currentStep: number;
  completionPercentage: number;
  steps: string[];
}

export const CCCFormProgress: React.FC<CCCFormProgressProps> = ({
  currentStep,
  completionPercentage,
  steps
}) => {
  return (
    <Card className="p-4 sm:p-6 mb-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Progression du formulaire</h4>
          <span className="text-sm font-bold text-primary">
            {Math.round(completionPercentage)}%
          </span>
        </div>
        
        <Progress value={completionPercentage} className="h-2" />
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs ${
                index <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="truncate">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
