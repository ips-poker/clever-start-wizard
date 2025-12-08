import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpRight, ArrowDownRight, Download, Filter, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Transaction {
  id: string;
  player_id: string;
  player_name: string;
  type: 'credit' | 'debit' | 'win' | 'loss' | 'buyin' | 'cashout';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const TRANSACTIONS_STORAGE_KEY = 'poker_credit_transactions';

// Export function to add transaction from other components
export function addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>) {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions = stored ? JSON.parse(stored) : [];
    
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    
    transactions.unshift(newTransaction);
    // Keep only last 1000 transactions
    const trimmed = transactions.slice(0, 1000);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error adding transaction:', error);
  }
}

export function CreditTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadTransactions();
    
    // Refresh every 10 seconds
    const interval = setInterval(loadTransactions, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTransactions = () => {
    try {
      const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (stored) {
        setTransactions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Игрок', 'Тип', 'Сумма', 'До', 'После', 'Описание', 'Дата'].join(','),
      ...filteredTransactions.map(t => [
        t.id,
        t.player_name,
        t.type,
        t.amount,
        t.balance_before,
        t.balance_after,
        `"${t.description}"`,
        new Date(t.created_at).toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Начисление';
      case 'debit': return 'Списание';
      case 'win': return 'Выигрыш';
      case 'loss': return 'Проигрыш';
      case 'buyin': return 'Buy-in';
      case 'cashout': return 'Cashout';
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'credit':
      case 'win':
      case 'cashout':
        return 'default';
      case 'debit':
      case 'loss':
      case 'buyin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalCredits = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDebits = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Всего начислено</p>
                <p className="text-2xl font-bold text-green-500">+{totalCredits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Всего списано</p>
                <p className="text-2xl font-bold text-red-500">-{totalDebits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Всего операций</p>
                <p className="text-2xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>История транзакций</CardTitle>
              <CardDescription>Все операции с кредитами игроков</CardDescription>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Экспорт CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по игроку или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип операции" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="credit">Начисления</SelectItem>
                <SelectItem value="debit">Списания</SelectItem>
                <SelectItem value="win">Выигрыши</SelectItem>
                <SelectItem value="loss">Проигрыши</SelectItem>
                <SelectItem value="buyin">Buy-in</SelectItem>
                <SelectItem value="cashout">Cashout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[400px]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">До</TableHead>
                    <TableHead className="text-right">После</TableHead>
                    <TableHead>Описание</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.slice(0, 100).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="font-medium">{tx.player_name}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(tx.type)}>
                          {getTypeLabel(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {tx.balance_before.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.balance_after.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Нет транзакций
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
