import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, ArrowLeft, Smartphone } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaApple } from "react-icons/fa";

// Validation schemas
const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email doit contenir moins de 255 caractères"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
});

const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .max(255, "L'email doit contenir moins de 255 caractères"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(100, "Le mot de passe doit contenir moins de 100 caractères"),
  fullName: z
    .string()
    .trim()
    .min(1, "Le nom complet est requis")
    .max(100, "Le nom doit contenir moins de 100 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets"),
  organization: z
    .string()
    .trim()
    .max(200, "Le nom de l'organisation doit contenir moins de 200 caractères")
    .optional()
});

const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Le numéro de téléphone est requis")
    .regex(/^\+\d{1,4}\s?\d{6,14}$/, "Format de numéro invalide. Utilisez le format international (+243...)")
});

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
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

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs with zod
    const validationResult = signInSchema.safeParse({
      email: email.trim(),
      password
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Erreur de validation",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const validatedData = validationResult.data;
    setIsLoading(true);
    
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur la plateforme BIC",
        });
        window.location.href = '/';
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

    // Validate inputs with zod
    const validationResult = signUpSchema.safeParse({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      organization: organization.trim() || undefined
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Erreur de validation",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const validatedData = validationResult.data;
    setIsLoading(true);
    
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.fullName,
            organization: validatedData.organization || null,
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
          window.location.href = '/';
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

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number with zod
    const validationResult = phoneSchema.safeParse({
      phoneNumber: phoneNumber.trim()
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Erreur de validation",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    const validatedData = validationResult.data;
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: validatedData.phoneNumber,
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4">
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
          <h1 className="text-2xl font-bold text-foreground">Bureau de l'Immobilier du Congo</h1>
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
                        <Label htmlFor="signin-password">Mot de passe</Label>
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