import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Coins, User } from 'lucide-react';
import { addTransaction } from './CreditTransactions';

export function CreatePlayerWithBalance() {
  const [playerName, setPlayerName] = useState('');
  const [initialBalance, setInitialBalance] = useState('10000');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      toast.error('Укажите имя игрока');
      return;
    }

    const balance = parseInt(initialBalance) || 10000;
    if (balance < 0) {
      toast.error('Баланс не может быть отрицательным');
      return;
    }

    setLoading(true);

    try {
      // Create player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          name: playerName.trim(),
          email: email.trim() || null,
          telegram: telegram.trim() || null,
        })
        .select()
        .single();

      if (playerError) {
        if (playerError.code === '23505') {
          toast.error('Игрок с таким именем уже существует');
        } else {
          throw playerError;
        }
        return;
      }

      // Create balance
      const { error: balanceError } = await supabase
        .from('player_balances')
        .insert({
          player_id: playerData.id,
          balance: balance,
        });

      if (balanceError) {
        // Rollback player creation
        await supabase.from('players').delete().eq('id', playerData.id);
        throw balanceError;
      }

      // Log transaction
      addTransaction({
        player_id: playerData.id,
        player_name: playerData.name,
        type: 'credit',
        amount: balance,
        balance_before: 0,
        balance_after: balance,
        description: 'Начальный баланс при создании аккаунта',
      });

      toast.success(`Игрок ${playerName} создан с балансом ${balance.toLocaleString()}`);
      
      // Reset form
      setPlayerName('');
      setEmail('');
      setTelegram('');
      setInitialBalance('10000');
    } catch (error: any) {
      console.error('Error creating player:', error);
      toast.error('Ошибка при создании игрока');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Создать игрока
        </CardTitle>
        <CardDescription>
          Создание нового игрока с начальным балансом
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Имя игрока *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Введите имя..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Начальный баланс</Label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="10000"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email (опционально)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Telegram ID (опционально)</Label>
            <Input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="123456789"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleCreate} disabled={loading} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {loading ? 'Создание...' : 'Создать игрока'}
          </Button>
          
          <div className="flex gap-2 ml-auto">
            {[5000, 10000, 50000, 100000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setInitialBalance(amount.toString())}
                className={initialBalance === amount.toString() ? 'border-primary' : ''}
              >
                {amount >= 1000 ? `${amount / 1000}k` : amount}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
