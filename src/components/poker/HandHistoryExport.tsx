import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileJson, 
  Copy, 
  Check,
  History,
  ChevronDown
} from 'lucide-react';
import { 
  HandHistoryData, 
  formatHandHistoryPokerStars, 
  formatHandHistoryJSON,
  downloadHandHistory,
  buildHandHistoryData
} from '@/utils/handHistoryFormatter';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HandHistoryExportProps {
  handHistory: any[];
  className?: string;
}

export function HandHistoryExport({ handHistory, className }: HandHistoryExportProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'pokerstars' | 'json'>('pokerstars');
  const [selectedHand, setSelectedHand] = useState<HandHistoryData | null>(null);
  const [copied, setCopied] = useState(false);

  // Convert raw hand history to formatted data
  const convertToHandHistoryData = (raw: any): HandHistoryData => {
    return buildHandHistoryData({
      handId: raw.handId || raw.id || `hand_${Date.now()}`,
      tableId: raw.tableId || 'unknown',
      tableName: raw.tableName,
      gameType: raw.gameType || "Hold'em No Limit",
      smallBlind: raw.smallBlind || raw.stakes?.smallBlind || 10,
      bigBlind: raw.bigBlind || raw.stakes?.bigBlind || 20,
      ante: raw.ante || raw.stakes?.ante,
      timestamp: raw.timestamp || raw.startedAt || new Date(),
      dealerSeat: raw.dealerSeat || 1,
      smallBlindSeat: raw.smallBlindSeat || 2,
      bigBlindSeat: raw.bigBlindSeat || 3,
      players: raw.players || [],
      communityCards: raw.communityCards || [],
      pot: raw.pot || raw.totalPot || 0,
      rake: raw.rake || 0,
      actions: raw.actions || [],
      winners: raw.winners || []
    });
  };

  const handleExportAll = (format: 'pokerstars' | 'json') => {
    if (handHistory.length === 0) {
      toast.error('Нет рук для экспорта');
      return;
    }
    
    const formattedData = handHistory.map(convertToHandHistoryData);
    downloadHandHistory(formattedData, format);
    toast.success(`Экспортировано ${formattedData.length} рук в формате ${format === 'pokerstars' ? 'PokerStars' : 'JSON'}`);
  };

  const handleExportSingle = (hand: any, format: 'pokerstars' | 'json') => {
    const formattedData = convertToHandHistoryData(hand);
    downloadHandHistory(formattedData, format);
    toast.success(`Рука экспортирована в формате ${format === 'pokerstars' ? 'PokerStars' : 'JSON'}`);
  };

  const handlePreview = (hand: any) => {
    setSelectedHand(convertToHandHistoryData(hand));
    setPreviewOpen(true);
  };

  const handleCopyToClipboard = async () => {
    if (!selectedHand) return;
    
    const content = previewFormat === 'pokerstars' 
      ? formatHandHistoryPokerStars(selectedHand)
      : formatHandHistoryJSON(selectedHand);
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Скопировано в буфер обмена');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Ошибка копирования');
    }
  };

  const getPreviewContent = () => {
    if (!selectedHand) return '';
    return previewFormat === 'pokerstars' 
      ? formatHandHistoryPokerStars(selectedHand)
      : formatHandHistoryJSON(selectedHand);
  };

  if (handHistory.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <Download className="h-4 w-4" />
            Экспорт
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleExportAll('pokerstars')}>
            <FileText className="h-4 w-4 mr-2" />
            Все руки (PokerStars)
            <Badge variant="secondary" className="ml-auto text-xs">
              {handHistory.length}
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExportAll('json')}>
            <FileJson className="h-4 w-4 mr-2" />
            Все руки (JSON)
            <Badge variant="secondary" className="ml-auto text-xs">
              {handHistory.length}
            </Badge>
          </DropdownMenuItem>
          
          {handHistory.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Последние руки
              </div>
              {handHistory.slice(-5).reverse().map((hand, idx) => (
                <DropdownMenuItem 
                  key={idx} 
                  onClick={() => handlePreview(hand)}
                  className="flex items-center gap-2"
                >
                  <History className="h-3 w-3" />
                  <span className="truncate">
                    Рука #{hand.handId?.slice(-8) || idx + 1}
                  </span>
                  {hand.winners?.[0] && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      +{hand.winners[0].amount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              История руки
            </DialogTitle>
            <DialogDescription>
              Просмотр и экспорт истории руки
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between gap-2 pb-2">
            <div className="flex gap-2">
              <Button
                variant={previewFormat === 'pokerstars' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewFormat('pokerstars')}
              >
                <FileText className="h-4 w-4 mr-1" />
                PokerStars
              </Button>
              <Button
                variant={previewFormat === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewFormat('json')}
              >
                <FileJson className="h-4 w-4 mr-1" />
                JSON
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToClipboard}
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </Button>
              <Button
                size="sm"
                onClick={() => selectedHand && downloadHandHistory(selectedHand, previewFormat)}
              >
                <Download className="h-4 w-4 mr-1" />
                Скачать
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/30 p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
              {getPreviewContent()}
            </pre>
          </ScrollArea>
          
          {selectedHand && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
              <span>Пот: <span className="font-medium text-foreground">{selectedHand.pot.toLocaleString()}</span></span>
              {selectedHand.rake > 0 && (
                <span>Рейк: <span className="font-medium text-foreground">{selectedHand.rake.toLocaleString()}</span></span>
              )}
              <span>Игроков: <span className="font-medium text-foreground">{selectedHand.players.length}</span></span>
              {selectedHand.communityCards.length > 0 && (
                <span>Борд: <span className="font-medium text-foreground">{selectedHand.communityCards.join(' ')}</span></span>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
