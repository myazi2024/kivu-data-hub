import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { GenerationStep } from './types';

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStep: number;
  visible: boolean;
}

const statusIcon: Record<GenerationStep['status'], React.ReactNode> = {
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  done: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
};

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  steps,
  currentStep,
  visible,
}) => {
  if (!visible) return null;

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressPercent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Progression de la génération</span>
        <span className="text-muted-foreground">{progressPercent}%</span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
              i === currentStep ? 'bg-primary/5' : ''
            }`}
          >
            {statusIcon[step.status]}
            <span
              className={
                step.status === 'done'
                  ? 'text-muted-foreground line-through'
                  : step.status === 'error'
                  ? 'text-destructive'
                  : ''
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GenerationProgress;
