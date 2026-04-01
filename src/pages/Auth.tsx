import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, ArrowLeft, Smartphone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaApple } from "react-icons/fa";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  // Auth state cleanup is handled by useAuth provider

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur la plateforme BIC",
        });
        
        // Vérifier s'il y a une URL de redirection sauvegardée
        const redirectUrl = localStorage.getItem('auth_redirect_url');
        if (redirectUrl) {
          localStorage.removeItem('auth_redirect_url');
          window.location.href = redirectUrl;
        } else {
          window.location.href = '/';
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Vérifiez vos identifiants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {

      const redirectUrl = localStorage.getItem('auth_redirect_url') || '/';
      const finalRedirectUrl = redirectUrl.startsWith('/') 
        ? `${window.location.origin}${redirectUrl}`
        : `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: finalRedirectUrl,
          data: {
            full_name: fullName,
            organization: organization || null,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Inscription réussie",
          description: "Veuillez vérifier votre email pour confirmer votre compte",
        });
        
        // If user is automatically confirmed, redirect
        if (data.session) {
          if (redirectUrl !== '/') {
            localStorage.removeItem('auth_redirect_url');
            window.location.href = redirectUrl;
          } else {
            window.location.href = '/';
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'apple') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message || "Impossible de se connecter avec ce fournisseur",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email requis",
        description: "Veuillez entrer votre adresse email pour réinitialiser votre mot de passe",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Vérifiez votre boîte de réception pour réinitialiser votre mot de passe",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de réinitialisation",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de téléphone",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;

      toast({
        title: "Code envoyé",
        description: "Veuillez vérifier votre téléphone pour le code de vérification",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Retour à l'accueil</span>
      </Button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bureau d'Informations Cadastrales</h1>
          <p className="text-muted-foreground mt-2">Connectez-vous à votre espace</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentification</CardTitle>
            <CardDescription>
              Accédez à votre compte ou créez-en un nouveau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                {!showPhoneAuth ? (
                  <>
                    {/* Social Login Buttons */}
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOAuthSignIn('google')}
                        disabled={isLoading}
                      >
                        <FcGoogle className="mr-2 h-5 w-5" />
                        Continuer avec Google
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOAuthSignIn('facebook')}
                        disabled={isLoading}
                      >
                        <FaFacebook className="mr-2 h-5 w-5 text-[#1877F2]" />
                        Continuer avec Facebook
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOAuthSignIn('apple')}
                        disabled={isLoading}
                      >
                        <FaApple className="mr-2 h-5 w-5" />
                        Continuer avec Apple
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowPhoneAuth(true)}
                        disabled={isLoading}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        Continuer avec un téléphone
                      </Button>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Ou par email
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password">Mot de passe</Label>
                          <Button
                            type="button"
                            variant="link"
                            className="px-0 h-auto text-xs text-primary"
                            onClick={handleForgotPassword}
                          >
                            Mot de passe oublié ?
                          </Button>
                        </div>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="Votre mot de passe"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Se connecter
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full mb-4"
                      onClick={() => setShowPhoneAuth(false)}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour aux autres options
                    </Button>
                    
                    <form onSubmit={handlePhoneSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone-number">Numéro de téléphone</Label>
                        <Input
                          id="phone-number"
                          type="tel"
                          placeholder="+243 XX XXX XXXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Format international requis (ex: +243...)
                        </p>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Envoyer le code
                      </Button>
                    </form>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                {/* Social Signup Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={isLoading}
                  >
                    <FcGoogle className="mr-2 h-5 w-5" />
                    S'inscrire avec Google
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn('facebook')}
                    disabled={isLoading}
                  >
                    <FaFacebook className="mr-2 h-5 w-5 text-[#1877F2]" />
                    S'inscrire avec Facebook
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn('apple')}
                    disabled={isLoading}
                  >
                    <FaApple className="mr-2 h-5 w-5" />
                    S'inscrire avec Apple
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou par email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Nom complet *</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="Votre nom complet"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-organization">Organisation</Label>
                    <Input
                      id="signup-organization"
                      type="text"
                      placeholder="Votre organisation (optionnel)"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Au moins 8 caractères"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer un compte
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>En vous connectant, vous acceptez nos conditions d'utilisation</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;