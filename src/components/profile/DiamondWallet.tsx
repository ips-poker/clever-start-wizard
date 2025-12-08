import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gem, Plus, History, TrendingUp, TrendingDown, Gift, Trophy, ShoppingCart, Loader2, Sparkles, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface DiamondWalletProps {
  playerId: string;
  playerName?: string;
}

interface WalletData {
  balance: number;
  total_purchased: number;
  total_spent: number;
  total_won: number;
}

interface Transaction {
  id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  transaction_type: string;
  description: string | null;
  payment_amount: number | null;
  created_at: string;
}

const PURCHASE_OPTIONS = [
  { rubles: 100, diamonds: 500 },
  { rubles: 200, diamonds: 1000 },
  { rubles: 500, diamonds: 2500 },
  { rubles: 1000, diamonds: 5000 },
  { rubles: 2000, diamonds: 10000 },
  { rubles: 5000, diamonds: 25000 },
];

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'purchase':
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    case 'admin_add':
    case 'bonus':
      return <Gift className="h-4 w-4 text-purple-500" />;
    case 'admin_remove':
    case 'tournament_entry':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case 'tournament_prize':
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 'refund':
      return <TrendingUp className="h-4 w-4 text-blue-500" />;
    default:
      return <Gem className="h-4 w-4" />;
  }
};

const getTransactionLabel = (type: string) => {
  switch (type) {
    case 'purchase':
      return 'Покупка';
    case 'admin_add':
      return 'Начисление';
    case 'admin_remove':
      return 'Списание';
    case 'tournament_entry':
      return 'Вступ. взнос';
    case 'tournament_prize':
      return 'Приз';
    case 'refund':
      return 'Возврат';
    case 'bonus':
      return 'Бонус';
    default:
      return type;
  }
};

export const DiamondWallet: React.FC<DiamondWalletProps> = ({ playerId, playerName }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    loadWalletData();
  }, [playerId]);

  const loadWalletData = async () => {
    try {
      // Ensure wallet exists
      await supabase.rpc('ensure_diamond_wallet', { p_player_id: playerId });

      // Load wallet
      const { data: walletData } = await supabase
        .from('diamond_wallets')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (walletData) {
        setWallet(walletData);
      }

      // Load transactions
      const { data: txData } = await supabase
        .from('diamond_transactions')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (!amount || amount < 100) {
      toast.error('Минимальная сумма покупки: 100 ₽');
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.rpc('purchase_diamonds', {
        p_player_id: playerId,
        p_rubles: amount
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; balance_after?: number };
      
      if (result.success) {
        toast.success(`Успешно приобретено ${(amount / 100) * 500} алмазов!`);
        setPurchaseDialogOpen(false);
        setSelectedAmount(null);
        setCustomAmount('');
        loadWalletData();
      } else {
        toast.error(result.error || 'Ошибка покупки');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка покупки');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-background to-muted/30 border-primary/20">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-background via-background to-cyan-950/20 border-cyan-500/30 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Gem className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Кошелёк алмазов</CardTitle>
              <p className="text-sm text-muted-foreground">Игровая валюта</p>
            </div>
          </div>
          
          <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Купить
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-cyan-500" />
                  Покупка алмазов
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Курс: <span className="text-cyan-500 font-semibold">100 ₽ = 500 💎</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  {PURCHASE_OPTIONS.map((option) => (
                    <Button
                      key={option.rubles}
                      variant={selectedAmount === option.rubles ? "default" : "outline"}
                      className={`h-auto py-3 flex-col ${
                        selectedAmount === option.rubles 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-500' 
                          : 'hover:border-cyan-500/50'
                      }`}
                      onClick={() => {
                        setSelectedAmount(option.rubles);
                        setCustomAmount('');
                      }}
                    >
                      <span className="text-lg font-bold">{option.diamonds.toLocaleString()} 💎</span>
                      <span className="text-xs opacity-80">{option.rubles} ₽</span>
                    </Button>
                  ))}
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">или своя сумма</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Сумма в рублях (мин. 100)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    min={100}
                    step={100}
                  />
                </div>
                
                {(selectedAmount || customAmount) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 text-center"
                  >
                    <p className="text-sm text-muted-foreground">Вы получите:</p>
                    <p className="text-2xl font-bold text-cyan-400">
                      {((selectedAmount || parseInt(customAmount) || 0) / 100 * 500).toLocaleString()} 💎
                    </p>
                  </motion.div>
                )}
                
                <Button 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                  onClick={handlePurchase}
                  disabled={purchasing || (!selectedAmount && (!customAmount || parseInt(customAmount) < 100))}
                >
                  {purchasing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="h-4 w-4 mr-2" />
                  )}
                  Оплатить {selectedAmount || customAmount || 0} ₽
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-6">
        {/* Balance Display */}
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl" />
          <Sparkles className="absolute top-4 right-4 h-6 w-6 text-cyan-500/30" />
          
          <div className="relative">
            <p className="text-sm text-muted-foreground mb-1">Текущий баланс</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {wallet?.balance.toLocaleString() || 0}
              </span>
              <Gem className="h-8 w-8 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4 text-green-500" />
              <span className="text-xs">Куплено</span>
            </div>
            <p className="text-lg font-semibold text-green-500">
              {wallet?.total_purchased.toLocaleString() || 0}
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs">Потрачено</span>
            </div>
            <p className="text-lg font-semibold text-red-500">
              {wallet?.total_spent.toLocaleString() || 0}
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">Выиграно</span>
            </div>
            <p className="text-lg font-semibold text-yellow-500">
              {wallet?.total_won.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">История операций</h3>
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              <AnimatePresence>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Нет операций</p>
                  </div>
                ) : (
                  transactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          {getTransactionIcon(tx.transaction_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {getTransactionLabel(tx.transaction_type)}
                            </Badge>
                            {tx.payment_amount && (
                              <span className="text-xs text-muted-foreground">
                                {tx.payment_amount} ₽
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(tx.created_at), 'd MMM, HH:mm', { locale: ru })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} 💎
                        </p>
                        <p className="text-xs text-muted-foreground">
                          → {tx.balance_after.toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiamondWallet;
