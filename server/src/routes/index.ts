/**
 * API Routes
 */

import { Express, Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { PokerGameManager } from '../game/PokerGameManager.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

// Request schemas
const CreateTableSchema = z.object({
  name: z.string().min(1).max(100),
  gameType: z.enum(['holdem', 'omaha', 'shortdeck', 'pineapple', 'ofc']).default('holdem'),
  tableType: z.enum(['cash', 'tournament', 'sitgo']).default('cash'),
  maxPlayers: z.number().int().min(2).max(10).default(9),
  smallBlind: z.number().int().min(1).default(10),
  bigBlind: z.number().int().min(2).default(20),
  ante: z.number().int().min(0).default(0),
  minBuyIn: z.number().int().min(0).default(400),
  maxBuyIn: z.number().int().min(0).default(2000)
});

export function setupRoutes(app: Express, gameManager: PokerGameManager, supabase: SupabaseClient): void {
  
  // Get all tables
  app.get('/api/tables', async (req: Request, res: Response) => {
    try {
      const tables = gameManager.getAllTables();
      
      res.json({
        success: true,
        tables: tables.map(t => ({
          ...t.getPublicState(),
          playerCount: t.getPlayerCount(),
          handInProgress: t.isHandInProgress()
        }))
      });
    } catch (error) {
      logger.error('Failed to get tables', { error: String(error) });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // Get single table
  app.get('/api/tables/:id', async (req: Request, res: Response) => {
    try {
      const table = gameManager.getTable(req.params.id);
      
      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }
      
      res.json({
        success: true,
        table: table.getPublicState()
      });
    } catch (error) {
      logger.error('Failed to get table', { error: String(error) });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // Create table (admin only)
  app.post('/api/tables', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const result = CreateTableSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid request',
          details: result.error.issues 
        });
      }
      
      const config = result.data;
      
      const table = await gameManager.createTable({
        id: crypto.randomUUID(),
        ...config,
        actionTimeSeconds: 30,
        timeBankSeconds: 60
      });
      
      res.status(201).json({
        success: true,
        table: table.getPublicState()
      });
    } catch (error) {
      logger.error('Failed to create table', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to create table' });
    }
  });
  
  // Delete table (admin only)
  app.delete('/api/tables/:id', async (req: Request, res: Response) => {
    try {
      const success = await gameManager.removeTable(req.params.id);
      
      if (!success) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete table', { error: String(error) });
      res.status(500).json({ success: false, error: 'Failed to delete table' });
    }
  });
  
  // Get server stats
  app.get('/api/stats', (req: Request, res: Response) => {
    const stats = gameManager.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    });
  });
  
  // Player endpoints
  app.get('/api/players/:id', async (req: Request, res: Response) => {
    try {
      const { data: player, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins, avatar_url')
        .eq('id', req.params.id)
        .single();
      
      if (error || !player) {
        return res.status(404).json({ success: false, error: 'Player not found' });
      }
      
      res.json({ success: true, player });
    } catch (error) {
      logger.error('Failed to get player', { error: String(error) });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // Get player balance
  app.get('/api/players/:id/balance', async (req: Request, res: Response) => {
    try {
      const { data: balance, error } = await supabase
        .from('player_balances')
        .select('balance, total_won, total_lost, hands_played')
        .eq('player_id', req.params.id)
        .single();
      
      if (error || !balance) {
        return res.status(404).json({ success: false, error: 'Balance not found' });
      }
      
      res.json({ success: true, balance });
    } catch (error) {
      logger.error('Failed to get balance', { error: String(error) });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // Leaderboard
  app.get('/api/leaderboard', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, elo_rating, games_played, wins, avatar_url')
        .order('elo_rating', { ascending: false })
        .limit(limit);
      
      if (error) {
        throw error;
      }
      
      res.json({ success: true, players });
    } catch (error) {
      logger.error('Failed to get leaderboard', { error: String(error) });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
  
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });
}
