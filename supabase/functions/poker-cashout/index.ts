/**
 * Poker Cashout Edge Function
 * Returns diamonds to player wallet when leaving table
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { 
  checkRateLimit, 
  getClientIdentifier, 
  createRateLimitResponse,
  RATE_LIMIT_PRESETS 
} from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Zod схема для валидации входных данных
const CashoutSchema = z.object({
  playerId: z.string().uuid('Invalid player ID format'),
  tableId: z.string().uuid('Invalid table ID format').optional(),
  amount: z.number().int().min(0).max(1000000000).optional(), // Max 1 billion diamonds
  action: z.enum(['buy_in', 'cashout'], { 
    errorMap: () => ({ message: 'Action must be "buy_in" or "cashout"' })
  }),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Rate limiting - 10 requests per minute for financial operations
  const clientId = getClientIdentifier(req, 'poker-cashout');
  const rateLimitResult = checkRateLimit(clientId, RATE_LIMIT_PRESETS.financial);
  
  if (!rateLimitResult.allowed) {
    console.warn(`⚠️ Rate limit exceeded for ${clientId}`);
    return createRateLimitResponse(rateLimitResult, corsHeaders);
  }

  try {
    // Валидация входных данных
    const rawBody = await req.json();
    const parseResult = CashoutSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('❌ Input validation failed:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data', 
          details: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { playerId, tableId, amount, action } = parseResult.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Handle different actions
    if (action === 'buy_in') {
      // Deduct diamonds when joining table
      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid buy-in amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('diamond_wallets')
        .select('id, balance')
        .eq('player_id', playerId)
        .single();

      if (walletError || !wallet) {
        return new Response(
          JSON.stringify({ error: 'Wallet not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (wallet.balance < amount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance', balance: wallet.balance }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct from wallet
      const newBalance = wallet.balance - amount;
      const { error: updateError } = await supabase
        .from('diamond_wallets')
        .update({ 
          balance: newBalance,
          total_spent: supabase.rpc ? undefined : wallet.balance, // Will be handled by trigger
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Error deducting diamonds:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to deduct diamonds' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record transaction
      await supabase.from('diamond_transactions').insert({
        player_id: playerId,
        wallet_id: wallet.id,
        transaction_type: 'poker_buy_in',
        amount: -amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: `Buy-in за покерный стол ${tableId}`,
        reference_id: tableId
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'buy_in',
          amount,
          newBalance 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cashout') {
      // Return diamonds when leaving table
      if (!amount || amount <= 0) {
        // Nothing to return
        return new Response(
          JSON.stringify({ success: true, action: 'cashout', amount: 0 }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get current wallet
      const { data: wallet, error: walletError } = await supabase
        .from('diamond_wallets')
        .select('id, balance, total_won')
        .eq('player_id', playerId)
        .single();

      if (walletError || !wallet) {
        // Create wallet if not exists
        const { data: newWallet, error: createError } = await supabase
          .from('diamond_wallets')
          .insert({
            player_id: playerId,
            balance: amount,
            total_won: 0,
            total_spent: 0,
            total_purchased: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create wallet' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'cashout',
            amount,
            newBalance: amount 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add to wallet
      const newBalance = wallet.balance + amount;
      const { error: updateError } = await supabase
        .from('diamond_wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      if (updateError) {
        console.error('Error adding diamonds:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to return diamonds' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record transaction
      await supabase.from('diamond_transactions').insert({
        player_id: playerId,
        wallet_id: wallet.id,
        transaction_type: 'poker_cashout',
        amount: amount,
        balance_before: wallet.balance,
        balance_after: newBalance,
        description: `Выход из покерного стола ${tableId || 'unknown'}`,
        reference_id: tableId
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'cashout',
          amount,
          newBalance 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Poker cashout error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
