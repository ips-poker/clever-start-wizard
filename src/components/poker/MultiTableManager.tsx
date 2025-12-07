import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  Plus, X, Maximize2, Minimize2, Grid, Layers,
  ChevronLeft, ChevronRight, Settings, LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Table info for multi-table view
export interface TableInfo {
  id: string;
  name: string;
  blinds: string;
  pot: number;
  isMyTurn: boolean;
  phase: string;
  playerCount: number;
  maxPlayers: number;
  isTournament?: boolean;
  tournamentName?: string;
}

// Layout types
export type TableLayout = 'single' | 'tile-2' | 'tile-4' | 'tile-6' | 'cascade' | 'stack';

interface MultiTableManagerProps {
  tables: TableInfo[];
  activeTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onCloseTable: (tableId: string) => void;
  onAddTable: () => void;
  layout: TableLayout;
  onLayoutChange: (layout: TableLayout) => void;
  maxTables?: number;
  children: (tableId: string, isActive: boolean, style: React.CSSProperties) => React.ReactNode;
}

// Layout configurations
const LAYOUT_CONFIGS: Record<TableLayout, { cols: number; rows: number; maxVisible: number }> = {
  'single': { cols: 1, rows: 1, maxVisible: 1 },
  'tile-2': { cols: 2, rows: 1, maxVisible: 2 },
  'tile-4': { cols: 2, rows: 2, maxVisible: 4 },
  'tile-6': { cols: 3, rows: 2, maxVisible: 6 },
  'cascade': { cols: 1, rows: 1, maxVisible: 4 },
  'stack': { cols: 1, rows: 1, maxVisible: 8 },
};

export function MultiTableManager({
  tables,
  activeTableId,
  onSelectTable,
  onCloseTable,
  onAddTable,
  layout,
  onLayoutChange,
  maxTables = 8,
  children
}: MultiTableManagerProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);

  // Calculate table positions based on layout
  const getTableStyles = useCallback((index: number, total: number): React.CSSProperties => {
    const config = LAYOUT_CONFIGS[layout];
    
    switch (layout) {
      case 'single':
        return {
          position: 'absolute',
          inset: 0,
          zIndex: activeTableId === tables[index]?.id ? 10 : 1,
          opacity: activeTableId === tables[index]?.id ? 1 : 0,
          pointerEvents: activeTableId === tables[index]?.id ? 'auto' : 'none',
        };
        
      case 'tile-2':
      case 'tile-4':
      case 'tile-6': {
        const col = index % config.cols;
        const row = Math.floor(index / config.cols);
        const width = 100 / config.cols;
        const height = 100 / config.rows;
        
        return {
          position: 'absolute',
          left: `${col * width}%`,
          top: `${row * height}%`,
          width: `${width}%`,
          height: `${height}%`,
          padding: '4px',
          zIndex: activeTableId === tables[index]?.id ? 10 : 1,
        };
      }
      
      case 'cascade': {
        const offset = index * 30;
        return {
          position: 'absolute',
          left: `${offset}px`,
          top: `${offset}px`,
          right: `${(total - 1 - index) * 30}px`,
          bottom: `${(total - 1 - index) * 30}px`,
          zIndex: activeTableId === tables[index]?.id ? 10 : index,
        };
      }
      
      case 'stack':
        return {
          position: 'absolute',
          inset: 0,
          zIndex: activeTableId === tables[index]?.id ? 10 : 1,
          opacity: activeTableId === tables[index]?.id ? 1 : 0,
          pointerEvents: activeTableId === tables[index]?.id ? 'auto' : 'none',
          transform: activeTableId === tables[index]?.id ? 'scale(1)' : 'scale(0.95)',
          transition: 'all 0.2s ease',
        };
      
      default:
        return {};
    }
  }, [layout, activeTableId, tables]);

  // Tables with action needed (my turn)
  const actionNeeded = useMemo(() => 
    tables.filter(t => t.isMyTurn && t.id !== activeTableId),
    [tables, activeTableId]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Table tabs bar */}
      <div className="flex items-center gap-2 p-2 bg-slate-900/80 border-b border-white/10">
        {/* Table tabs */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {tables.map((table, index) => (
            <motion.button
              key={table.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onSelectTable(table.id)}
              onMouseEnter={() => setHoveredTable(table.id)}
              onMouseLeave={() => setHoveredTable(null)}
              className={cn(
                "relative flex items-center gap-2 px-3 py-1.5 rounded-lg",
                "transition-colors text-sm whitespace-nowrap",
                "border",
                activeTableId === table.id 
                  ? "bg-primary/20 border-primary text-white" 
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                table.isMyTurn && activeTableId !== table.id && "ring-2 ring-amber-500 ring-offset-1 ring-offset-slate-900"
              )}
            >
              {/* Table indicator */}
              <span className={cn(
                "w-2 h-2 rounded-full",
                table.isMyTurn ? "bg-amber-500 animate-pulse" : 
                table.phase === 'waiting' ? "bg-slate-500" : "bg-green-500"
              )} />
              
              {/* Table name */}
              <span className="max-w-20 truncate">
                {table.isTournament ? '🏆' : '💰'} {table.name || `Стол ${index + 1}`}
              </span>
              
              {/* Blinds badge */}
              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                {table.blinds}
              </Badge>
              
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTable(table.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-white/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
              
              {/* My turn indicator */}
              {table.isMyTurn && activeTableId !== table.id && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-[10px] font-bold text-black">!</span>
                </motion.div>
              )}
            </motion.button>
          ))}
          
          {/* Add table button */}
          {tables.length < maxTables && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={onAddTable}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Добавить стол</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Layout selector */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-2">
          {(['single', 'tile-2', 'tile-4'] as TableLayout[]).map((l) => (
            <TooltipProvider key={l}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={layout === l ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onLayoutChange(l)}
                    disabled={tables.length < (l === 'tile-4' ? 2 : l === 'tile-2' ? 2 : 1)}
                  >
                    {l === 'single' ? (
                      <Maximize2 className="w-3 h-3" />
                    ) : l === 'tile-2' ? (
                      <div className="flex gap-0.5">
                        <div className="w-1.5 h-3 bg-current rounded-sm" />
                        <div className="w-1.5 h-3 bg-current rounded-sm" />
                      </div>
                    ) : (
                      <LayoutGrid className="w-3 h-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {l === 'single' ? 'Один стол' : l === 'tile-2' ? '2 стола' : '4 стола'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      {/* Action needed notification */}
      <AnimatePresence>
        {actionNeeded.length > 0 && layout === 'single' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500/20 border-b border-amber-500/30 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-2 text-sm">
              <span className="text-amber-400">⚡ Ваш ход на:</span>
              {actionNeeded.map(table => (
                <Button
                  key={table.id}
                  variant="secondary"
                  size="sm"
                  className="h-6 text-xs bg-amber-500/20 hover:bg-amber-500/30"
                  onClick={() => onSelectTable(table.id)}
                >
                  {table.name}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tables area */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="sync">
          {tables.slice(0, LAYOUT_CONFIGS[layout].maxVisible).map((table, index) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={getTableStyles(index, tables.length)}
              className={cn(
                "overflow-hidden rounded-lg",
                layout !== 'single' && "border border-white/10",
                activeTableId === table.id && layout !== 'single' && "ring-2 ring-primary"
              )}
              onClick={() => layout !== 'single' && onSelectTable(table.id)}
            >
              {children(table.id, activeTableId === table.id, getTableStyles(index, tables.length))}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {tables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">Нет активных столов</p>
              <Button onClick={onAddTable} className="gap-2">
                <Plus className="w-4 h-4" />
                Добавить стол
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table navigation for single view */}
      {layout === 'single' && tables.length > 1 && (
        <div className="flex items-center justify-center gap-2 p-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const currentIndex = tables.findIndex(t => t.id === activeTableId);
              const prevIndex = currentIndex <= 0 ? tables.length - 1 : currentIndex - 1;
              onSelectTable(tables[prevIndex].id);
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex gap-1">
            {tables.map((table, index) => (
              <button
                key={table.id}
                onClick={() => onSelectTable(table.id)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  activeTableId === table.id ? "bg-primary w-4" : "bg-white/30 hover:bg-white/50",
                  table.isMyTurn && activeTableId !== table.id && "bg-amber-500"
                )}
              />
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const currentIndex = tables.findIndex(t => t.id === activeTableId);
              const nextIndex = currentIndex >= tables.length - 1 ? 0 : currentIndex + 1;
              onSelectTable(tables[nextIndex].id);
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Hook for managing multi-table state
export function useMultiTable(maxTables = 8) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [layout, setLayout] = useState<TableLayout>('single');

  const addTable = useCallback((table: TableInfo) => {
    if (tables.length >= maxTables) return false;
    
    setTables(prev => [...prev, table]);
    setActiveTableId(table.id);
    
    // Auto-adjust layout
    if (tables.length === 1) {
      setLayout('tile-2');
    } else if (tables.length === 3) {
      setLayout('tile-4');
    }
    
    return true;
  }, [tables.length, maxTables]);

  const removeTable = useCallback((tableId: string) => {
    setTables(prev => prev.filter(t => t.id !== tableId));
    
    if (activeTableId === tableId) {
      setActiveTableId(tables.find(t => t.id !== tableId)?.id || null);
    }
    
    // Auto-adjust layout
    if (tables.length <= 2) {
      setLayout('single');
    } else if (tables.length <= 3) {
      setLayout('tile-2');
    }
  }, [tables, activeTableId]);

  const updateTable = useCallback((tableId: string, updates: Partial<TableInfo>) => {
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, ...updates } : t
    ));
  }, []);

  const selectTable = useCallback((tableId: string) => {
    setActiveTableId(tableId);
  }, []);

  // Auto-switch to table where it's my turn
  const autoSwitchToAction = useCallback(() => {
    const actionTable = tables.find(t => t.isMyTurn && t.id !== activeTableId);
    if (actionTable) {
      setActiveTableId(actionTable.id);
    }
  }, [tables, activeTableId]);

  return {
    tables,
    activeTableId,
    layout,
    setLayout,
    addTable,
    removeTable,
    updateTable,
    selectTable,
    autoSwitchToAction,
  };
}
