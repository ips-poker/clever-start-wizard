import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Diamond, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PlayerBalanceCardProps {
  playerId: string;
  onBalanceUpdate?: (balance: number) => void;
}

export function PlayerBalanceCard({ playerId, onBalanceUpdate }: PlayerBalanceCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalWon: 0, totalSpent: 0, totalPurchased: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('diamond_wallets')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No wallet found - player needs diamonds from admin
          setBalance(0);
          onBalanceUpdate?.(0);
        } else {
          throw error;
        }
      } else if (data) {
        setBalance(data.balance);
        setStats({
          totalWon: data.total_won,
          totalSpent: data.total_spent,
          totalPurchased: data.total_purchased
        });
        onBalanceUpdate?.(data.balance);
      }
    } catch (error) {
      console.error('Error fetching diamond balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Subscribe to wallet changes
    const channel = supabase
      .channel(`diamonds-${playerId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'diamond_wallets',
          filter: `player_id=eq.${playerId}`
        },
        (payload: any) => {
          if (payload.new) {
            setBalance(payload.new.balance);
            setStats({
              totalWon: payload.new.total_won,
              totalSpent: payload.new.total_spent,
              totalPurchased: payload.new.total_purchased
            });
            onBalanceUpdate?.(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-cyan-500/20" />
            <div className="space-y-2">
              <div className="h-4 w-20 bg-cyan-500/20 rounded" />
              <div className="h-6 w-24 bg-cyan-500/20 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profit = stats.totalWon - stats.totalSpent;

  return (
    <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border-cyan-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Diamond className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ваши алмазы</p>
              <p className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {balance?.toLocaleString()} 💎
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={fetchBalance}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {(stats.totalWon > 0 || stats.totalSpent > 0) && (
          <div className="mt-4 pt-4 border-t border-cyan-500/10 grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Выиграно
              </p>
              <p className="font-semibold text-green-500">
                +{stats.totalWon.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Потрачено
              </p>
              <p className="font-semibold text-red-500">
                -{stats.totalSpent.toLocaleString()}
              </p>
            </div>
          </div>
        )}
        
        {profit !== 0 && (
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground">Профит</p>
            <p className={`font-bold ${profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {profit > 0 ? '+' : ''}{profit.toLocaleString()} 💎
            </p>
          </div>
        )}

        {balance === 0 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
            <p className="text-sm text-amber-400">
              Обратитесь к администратору для пополнения алмазов
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
