import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const { user, session, loading, userProfile } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      setRedirecting(true);
    }
  }, [loading, session]);

  // Показываем загрузку пока идет инициализация
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Редирект если нет сессии
  if (redirecting || !session || !user) {
    return <Navigate to="/auth" replace />;
  }

  // Ждём загрузку профиля для проверки прав админа
  if (requireAdmin && !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  // Проверяем права админа после загрузки профиля
  if (requireAdmin && userProfile?.user_role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Доступ запрещен
          </h1>
          <p className="text-muted-foreground">
            У вас нет прав администратора для доступа к этой странице
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}