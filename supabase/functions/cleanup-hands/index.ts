import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Cleanup stuck hands - use 'complete' phase (valid value)
    const { data, error } = await supabase
      .from('poker_hands')
      .update({ 
        completed_at: new Date().toISOString(), 
        phase: 'complete' 
      })
      .is('completed_at', null)
      .select('id, hand_number, table_id')

    if (error) throw error

    return new Response(JSON.stringify({ 
      success: true, 
      cleaned: data?.length || 0,
      hands: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
