import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlobalCacheManager } from '@/hooks/useDataSync';
import { useToast } from '@/hooks/use-toast';
import { Trash2, RefreshCw, Database, Clock } from 'lucide-react';

export function CacheDebugPanel() {
  const { toast } = useToast();
  const [cacheInfo, setCacheInfo] = React.useState(GlobalCacheManager.getCacheInfo());

  const refreshCacheInfo = () => {
    setCacheInfo(GlobalCacheManager.getCacheInfo());
  };

  const clearAllCache = () => {
    GlobalCacheManager.clearAll();
    setCacheInfo([]);
    toast({
      title: "Кэш очищен",
      description: "Все данные кэша удалены",
    });
  };

  const clearExpiredCache = () => {
    GlobalCacheManager.clearExpired();
    refreshCacheInfo();
    toast({
      title: "Устаревший кэш очищен",
      description: "Удалены только истекшие записи кэша",
    });
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ru-RU');
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д назад`;
    if (hours > 0) return `${hours}ч назад`;
    return `${minutes}м назад`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Управление кэшем данных
        </CardTitle>
        <CardDescription>
          Информация о кэшированных данных и инструменты управления
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={refreshCacheInfo} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
          <Button 
            onClick={clearExpiredCache} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Очистить устаревший
          </Button>
          <Button 
            onClick={clearAllCache} 
            variant="destructive" 
            size="sm"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Очистить все
          </Button>
        </div>

        {/* Cache Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">
              {cacheInfo.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Всего записей
            </div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">
              {cacheInfo.filter(cache => !cache.expired).length}
            </div>
            <div className="text-sm text-muted-foreground">
              Активных
            </div>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-600">
              {cacheInfo.filter(cache => cache.expired).length}
            </div>
            <div className="text-sm text-muted-foreground">
              Устаревших
            </div>
          </div>
        </div>

        {/* Cache Items */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Записи кэша:</h4>
          {cacheInfo.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Нет записей в кэше
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cacheInfo.map((cache, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate">
                      {cache.key}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(cache.timestamp)} • {getTimeAgo(cache.timestamp)}
                    </div>
                  </div>
                  <Badge 
                    variant={cache.expired ? "destructive" : "secondary"}
                    className="ml-2"
                  >
                    {cache.expired ? "Устарел" : "Активен"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}