import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PlayerBalanceCardProps {
  playerId: string;
  onBalanceUpdate?: (balance: number) => void;
}

export function PlayerBalanceCard({ playerId, onBalanceUpdate }: PlayerBalanceCardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState({ totalWon: 0, totalLost: 0, handsPlayed: 0 });
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('player_balances')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No balance found, create one
          await supabase.rpc('ensure_player_balance', { p_player_id: playerId });
          setBalance(10000);
          onBalanceUpdate?.(10000);
        } else {
          throw error;
        }
      } else if (data) {
        setBalance(data.balance);
        setStats({
          totalWon: data.total_won,
          totalLost: data.total_lost,
          handsPlayed: data.hands_played
        });
        onBalanceUpdate?.(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Subscribe to balance changes
    const channel = supabase
      .channel(`balance-${playerId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'player_balances',
          filter: `player_id=eq.${playerId}`
        },
        (payload: any) => {
          if (payload.new) {
            setBalance(payload.new.balance);
            setStats({
              totalWon: payload.new.total_won,
              totalLost: payload.new.total_lost,
              handsPlayed: payload.new.hands_played
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
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20" />
            <div className="space-y-2">
              <div className="h-4 w-20 bg-primary/20 rounded" />
              <div className="h-6 w-24 bg-primary/20 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profit = stats.totalWon - stats.totalLost;

  return (
    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ваш баланс</p>
              <p className="text-xl font-bold text-primary">
                {balance?.toLocaleString()} фишек
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={fetchBalance}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {stats.handsPlayed > 0 && (
          <div className="mt-4 pt-4 border-t border-primary/10 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Раздач</p>
              <p className="font-semibold">{stats.handsPlayed}</p>
            </div>
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
                Проиграно
              </p>
              <p className="font-semibold text-red-500">
                -{stats.totalLost.toLocaleString()}
              </p>
            </div>
          </div>
        )}
        
        {profit !== 0 && (
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground">Итого</p>
            <p className={`font-bold ${profit > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {profit > 0 ? '+' : ''}{profit.toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
