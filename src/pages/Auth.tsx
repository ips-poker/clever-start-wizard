import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TelegramLoginWidget } from "@/components/auth/TelegramLoginWidget";
import { PrivacyConsent } from "@/components/PrivacyConsent";
import { Eye, EyeOff, LogIn, UserPlus, Spade, AlertCircle } from "lucide-react";
import { z } from "zod";
import syndikateLogo from "@/assets/syndikate-logo-main.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Validation schema
  const signUpSchema = z.object({
    email: z.string().trim().email({ message: "Неверный формат email" }).max(255, { message: "Email слишком длинный" }),
    password: z.string().min(6, { message: "Пароль должен содержать минимум 6 символов" }).max(128, { message: "Пароль слишком длинный" }),
    privacyConsent: z.boolean().refine(val => val === true, { message: "Необходимо согласие с политикой конфиденциальности" })
  });

  // Redirect if already authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Неверные учетные данные. Проверьте email и пароль.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Необходимо подтвердить email. Проверьте почту.");
        } else {
          setError(error.message);
        }
        return;
      }

      toast({
        title: "Успешный вход",
        description: "Добро пожаловать!",
      });
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Произошла ошибка при входе");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate input data
      const validationResult = signUpSchema.safeParse({
        email: email.trim(),
        password,
        privacyConsent
      });

      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Ошибка валидации данных";
        setError(errorMessage);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: validationResult.data.email,
        password: validationResult.data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            privacy_consent: true,
            terms_consent: true
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          setError("Пользователь с таким email уже зарегистрирован");
        } else if (error.message.includes("Password should be")) {
          setError("Пароль должен содержать минимум 6 символов");
        } else {
          setError(error.message);
        }
        return;
      }

      toast({
        title: "Регистрация успешна",
        description: "Проверьте почту для подтверждения аккаунта",
      });
      
      setEmail("");
      setPassword("");
      setPrivacyConsent(false);
    } catch (error) {
      console.error("Sign up error:", error);
      setError("Произошла ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      console.log("Testing Supabase connection...");
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .limit(1);
      
      if (error) {
        console.error("Connection test failed:", error);
        setError(`Ошибка подключения к базе данных: ${error.message}`);
      } else {
        console.log("Connection test successful");
        toast({
          title: "Подключение работает",
          description: "База данных доступна",
        });
      }
    } catch (error: any) {
      console.error("Connection test error:", error);
      setError(`Ошибка сети: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Industrial background pattern */}
      <div className="absolute inset-0 industrial-texture opacity-10 pointer-events-none" />
      
      {/* Neon glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-syndikate-orange/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-syndikate-red/5 rounded-full blur-3xl"></div>
      
      {/* Corner brackets decoration */}
      <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-syndikate-orange/30" />
      <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-syndikate-orange/30" />
      <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-syndikate-orange/30" />
      <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-syndikate-orange/30" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex flex-col items-center space-y-4 group">
            {/* Logo with brutal metal background */}
            <div className="relative">
              <div className="absolute -inset-4 bg-syndikate-orange/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative brutal-metal brutal-border p-4 shadow-2xl group-hover:shadow-neon-orange transition-all duration-500">
                <div className="absolute inset-0 industrial-texture opacity-20 pointer-events-none" />
                <img 
                  src={syndikateLogo} 
                  alt="SYNDICATE Logo" 
                  className="w-16 h-16 object-contain group-hover:scale-105 transition-transform duration-500 relative z-10"
                />
              </div>
            </div>
            {/* Company Name */}
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold font-mono uppercase tracking-wider neon-orange">
                SYNDICATE
              </span>
              <span className="text-xs text-muted-foreground tracking-widest mt-2 font-mono">[ POKER CLUB ]</span>
            </div>
          </Link>
        </div>

        <Card className="brutal-metal brutal-border shadow-2xl backdrop-blur-xl animate-fade-in animation-delay-200 relative overflow-hidden">
          <div className="absolute inset-0 industrial-texture opacity-10 pointer-events-none" />
          <CardHeader className="text-center relative z-10 border-b border-border/50">
            <CardTitle className="text-3xl font-mono uppercase tracking-wider neon-orange mb-2">
              // АВТОРИЗАЦИЯ
            </CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-xs">
              &gt; ВВЕДИТЕ УЧЕТНЫЕ ДАННЫЕ ДЛЯ ДОСТУПА К СИСТЕМЕ
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-border brutal-border">
                <TabsTrigger 
                  value="signin"
                  className="font-mono uppercase text-xs tracking-wider data-[state=active]:bg-syndikate-orange data-[state=active]:text-background data-[state=active]:shadow-neon-orange transition-all"
                >
                  &gt; ВХОД
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="font-mono uppercase text-xs tracking-wider data-[state=active]:bg-syndikate-orange data-[state=active]:text-background data-[state=active]:shadow-neon-orange transition-all"
                >
                  &gt; РЕГИСТРАЦИЯ
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="bg-syndikate-red/10 border-syndikate-red/50 brutal-border relative overflow-hidden">
                  <div className="absolute inset-0 industrial-texture opacity-20" />
                  <AlertCircle className="h-4 w-4 relative z-10" />
                  <AlertDescription className="font-mono text-xs relative z-10">{error}</AlertDescription>
                </Alert>
              )}


              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-foreground font-mono text-xs uppercase tracking-wider">
                      &gt; Email
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="player@epc.system"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-background/50 border-border brutal-border text-foreground placeholder:text-muted-foreground focus:border-syndikate-orange font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-foreground font-mono text-xs uppercase tracking-wider">
                      &gt; Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-background/50 border-border brutal-border text-foreground placeholder:text-muted-foreground focus:border-syndikate-orange font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-syndikate-orange"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-syndikate-orange hover:bg-syndikate-orange/90 text-background font-mono uppercase tracking-wider shadow-neon-orange transition-all duration-300 brutal-border" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        ВХОД...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        &gt; ВОЙТИ
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground font-mono text-xs uppercase tracking-wider">
                      &gt; Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@epc.system"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-background/50 border-border brutal-border text-foreground placeholder:text-muted-foreground focus:border-syndikate-orange font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground font-mono text-xs uppercase tracking-wider">
                      &gt; Пароль
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        minLength={6}
                        className="bg-background/50 border-border brutal-border text-foreground placeholder:text-muted-foreground focus:border-syndikate-orange font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-syndikate-orange"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      // Минимум 6 символов
                    </p>
                  </div>
                  
                  {/* Privacy Consent */}
                  <PrivacyConsent
                    checked={privacyConsent}
                    onCheckedChange={setPrivacyConsent}
                    disabled={loading}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-syndikate-orange hover:bg-syndikate-orange/90 text-background font-mono uppercase tracking-wider shadow-neon-orange transition-all duration-300 brutal-border" 
                    disabled={loading || !privacyConsent}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        РЕГИСТРАЦИЯ...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        &gt; ЗАРЕГИСТРИРОВАТЬСЯ
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Telegram Login Widget */}
            <TelegramLoginWidget 
              disabled={loading}
              onSuccess={() => {
                toast({
                  title: "Вход выполнен",
                  description: "Добро пожаловать в систему!",
                });
              }}
              requirePrivacyConsent={true}
            />

            <div className="mt-6 text-center border-t border-border/50 pt-6">
              <Link 
                to="/" 
                className="text-xs text-muted-foreground hover:text-syndikate-orange transition-colors inline-flex items-center gap-2 group font-mono uppercase tracking-wider"
              >
                <span className="group-hover:-translate-x-1 transition-transform">&lt;</span>
                ВЕРНУТЬСЯ НА ГЛАВНУЮ
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}