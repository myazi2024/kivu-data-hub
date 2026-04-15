import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppAppearance } from "@/hooks/useAppAppearance";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorFallbackContent = ({ onReset }: { onReset: () => void }) => {
  const { config } = useAppAppearance();

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        {config.logo_url ? (
          <div className="flex justify-center">
            <img
              src={String(config.logo_url)}
              alt={String(config.app_name || 'Logo')}
              className="h-14 w-14 object-contain"
            />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">Une erreur est survenue</h1>
        <p className="text-muted-foreground">
          L'application a rencontré un problème inattendu. Veuillez rafraîchir la page.
        </p>
        <Button onClick={onReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorFallbackContent onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
