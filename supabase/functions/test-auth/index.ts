import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, password } = await req.json()

    console.log('Attempting login for:', email)

    // Попытка авторизации
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Проверка роли пользователя
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_role, email')
      .eq('user_id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
    }

    console.log('Login successful for:', email, 'Role:', profile?.user_role)

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user,
        profile: profile,
        session: authData.session
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})