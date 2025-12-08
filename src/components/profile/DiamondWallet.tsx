import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Gem, Plus, History, TrendingUp, TrendingDown, Gift, Trophy, ShoppingCart, Loader2, Wallet, ChevronDown } from 'lucide-react';
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
];

const getTransactionIcon = (type: string) => {
  switch (type) {
    case 'purchase':
      return <ShoppingCart className="h-3 w-3 text-green-500" />;
    case 'admin_add':
    case 'bonus':
      return <Gift className="h-3 w-3 text-purple-500" />;
    case 'admin_remove':
    case 'tournament_entry':
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    case 'tournament_prize':
      return <Trophy className="h-3 w-3 text-yellow-500" />;
    case 'refund':
      return <TrendingUp className="h-3 w-3 text-blue-500" />;
    default:
      return <Gem className="h-3 w-3" />;
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
      return 'Взнос';
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
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, [playerId]);

  const loadWalletData = async () => {
    try {
      await supabase.rpc('ensure_diamond_wallet', { p_player_id: playerId });

      const { data: walletData } = await supabase
        .from('diamond_wallets')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (walletData) {
        setWallet(walletData);
      }

      const { data: txData } = await supabase
        .from('diamond_transactions')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(20);

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
      toast.error('Минимальная сумма: 100 ₽');
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
        toast.success(`+${(amount / 100) * 500} 💎`);
        setPurchaseDialogOpen(false);
        setSelectedAmount(null);
        setCustomAmount('');
        loadWalletData();
      } else {
        toast.error(result.error || 'Ошибка');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-syndikate-metal/90 brutal-border">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Compact Header with Balance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 brutal-border flex items-center justify-center shadow-lg">
              <Gem className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-cyan-400">
                  {wallet?.balance.toLocaleString() || 0}
                </span>
                <span className="text-sm text-muted-foreground">💎</span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Алмазы</p>
            </div>
          </div>
          
          <Dialog open={purchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 brutal-border h-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Gem className="h-4 w-4 text-cyan-500" />
                  Покупка алмазов
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-3 py-2">
                <p className="text-xs text-muted-foreground text-center">
                  100 ₽ = <span className="text-cyan-400 font-semibold">500 💎</span>
                </p>
                
                <div className="grid grid-cols-2 gap-2">
                  {PURCHASE_OPTIONS.map((option) => (
                    <Button
                      key={option.rubles}
                      variant={selectedAmount === option.rubles ? "default" : "outline"}
                      size="sm"
                      className={`h-auto py-2 flex-col ${
                        selectedAmount === option.rubles 
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600' 
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedAmount(option.rubles);
                        setCustomAmount('');
                      }}
                    >
                      <span className="font-bold">{option.diamonds.toLocaleString()} 💎</span>
                      <span className="text-[10px] opacity-70">{option.rubles} ₽</span>
                    </Button>
                  ))}
                </div>
                
                <Input
                  type="number"
                  placeholder="Своя сумма (мин. 100 ₽)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  min={100}
                  className="h-9 text-sm"
                />
                
                <Button 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 h-9"
                  onClick={handlePurchase}
                  disabled={purchasing || (!selectedAmount && (!customAmount || parseInt(customAmount) < 100))}
                >
                  {purchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>Купить {((selectedAmount || parseInt(customAmount) || 0) / 100 * 500).toLocaleString()} 💎</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mini Stats Row */}
        <div className="flex gap-2 text-[10px]">
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
            <ShoppingCart className="h-3 w-3 text-green-500" />
            <span className="text-green-400">{wallet?.total_purchased.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/10 rounded border border-red-500/20">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span className="text-red-400">{wallet?.total_spent.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 rounded border border-yellow-500/20">
            <Trophy className="h-3 w-3 text-yellow-500" />
            <span className="text-yellow-400">{wallet?.total_won.toLocaleString() || 0}</span>
          </div>
        </div>

        {/* Collapsible History */}
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full h-8 justify-between text-xs text-muted-foreground hover:text-foreground">
              <span className="flex items-center gap-2">
                <History className="h-3 w-3" />
                История ({transactions.length})
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <ScrollArea className="h-[200px] mt-2">
              <div className="space-y-1">
                <AnimatePresence>
                  {transactions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      <Wallet className="h-8 w-8 mx-auto mb-1 opacity-50" />
                      <p>Нет операций</p>
                    </div>
                  ) : (
                    transactions.map((tx, index) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-2 rounded bg-background/30 border border-border/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(tx.transaction_type)}
                          <div>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {getTransactionLabel(tx.transaction_type)}
                            </Badge>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              {format(new Date(tx.created_at), 'd MMM, HH:mm', { locale: ru })}
                            </p>
                          </div>
                        </div>
                        
                        <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default DiamondWallet;
