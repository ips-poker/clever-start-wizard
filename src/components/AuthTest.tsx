import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function AuthTest() {
  const [email, setEmail] = useState("casinofix@ya.ru");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testDirectAuth = async () => {
    setLoading(true);
    try {
      console.log('Testing direct auth...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Auth error:', error);
        setResult({ error: error.message });
        toast({
          title: "Ошибка авторизации",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('Auth success:', data);
        setResult({ success: true, data });
        toast({
          title: "Успешно",
          description: "Авторизация прошла успешно",
        });
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setResult({ error: error.message });
      toast({
        title: "Неожиданная ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testEdgeFunction = async () => {
    setLoading(true);
    try {
      console.log('Testing edge function auth...');
      
      const { data, error } = await supabase.functions.invoke('test-auth', {
        body: { email, password }
      });

      if (error) {
        console.error('Edge function error:', error);
        setResult({ error: error.message });
      } else {
        console.log('Edge function success:', data);
        setResult({ success: true, data });
      }
    } catch (error: any) {
      console.error('Edge function unexpected error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('email, user_role')
        .eq('email', email)
        .single();

      if (error) {
        console.error('Connection error:', error);
        setResult({ error: error.message });
      } else {
        console.log('Connection success:', data);
        setResult({ success: true, data });
      }
    } catch (error: any) {
      console.error('Connection unexpected error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Тест авторизации</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
          <label className="text-sm font-medium">Пароль</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Button 
            onClick={testConnection} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Тест подключения к БД
          </Button>
          
          <Button 
            onClick={testDirectAuth} 
            disabled={loading || !password}
            className="w-full"
          >
            Тест прямой авторизации
          </Button>
          
          <Button 
            onClick={testEdgeFunction} 
            disabled={loading || !password}
            variant="secondary"
            className="w-full"
          >
            Тест через Edge Function
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}