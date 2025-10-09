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
          emailRedirectTo: redirectUrl
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-20 text-amber-400/10 text-8xl">♠</div>
        <div className="absolute bottom-20 left-20 text-amber-400/10 text-7xl">♥</div>
        <div className="absolute top-1/2 left-10 text-purple-400/10 text-6xl">♣</div>
        <div className="absolute top-1/3 right-10 text-amber-400/10 text-5xl">♦</div>
      </div>

      {/* Gradient glow effects */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex flex-col items-center space-y-3 group">
            {/* Logo with background */}
            <div className="relative">
              <div className="absolute -inset-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl p-3 shadow-2xl group-hover:shadow-amber-500/30 transition-all duration-500 ring-1 ring-white/20 group-hover:ring-amber-400/30">
                <img 
                  src="/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png" 
                  alt="EPC Logo" 
                  className="w-16 h-16 object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
            {/* Company Name */}
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
                Event Poker Club
              </span>
              <span className="text-sm text-slate-400 tracking-wider mt-1">EPC</span>
            </div>
          </Link>
        </div>

        <Card className="bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-black/90 border-2 border-amber-400/20 shadow-2xl backdrop-blur-xl animate-fade-in animation-delay-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-white mb-2">Добро пожаловать</CardTitle>
            <CardDescription className="text-slate-400">
              Войдите в систему или создайте новый аккаунт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-amber-400/10">
                <TabsTrigger 
                  value="signin"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white"
                >
                  Вход
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white"
                >
                  Регистрация
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-400/30 text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}


              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="player@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-900/50 border-amber-400/20 text-white placeholder:text-slate-500 focus:border-amber-400/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-slate-300">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="bg-slate-900/50 border-amber-400/20 text-white placeholder:text-slate-500 focus:border-amber-400/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-amber-400"
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
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all duration-300" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Вход...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Войти
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="bg-slate-900/50 border-amber-400/20 text-white placeholder:text-slate-500 focus:border-amber-400/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-300">Пароль</Label>
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
                        className="bg-slate-900/50 border-amber-400/20 text-white placeholder:text-slate-500 focus:border-amber-400/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-amber-400"
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
                    <p className="text-xs text-slate-500">
                      Минимум 6 символов
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
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg hover:shadow-amber-500/30 transition-all duration-300" 
                    disabled={loading || !privacyConsent}
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Регистрация...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Зарегистрироваться
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

            <div className="mt-6 text-center">
              <Link 
                to="/" 
                className="text-sm text-slate-400 hover:text-amber-400 transition-colors inline-flex items-center gap-2 group"
              >
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                Вернуться на главную
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}