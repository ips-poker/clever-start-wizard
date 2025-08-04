import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizationResult {
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  optimizedUrl: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, bucket, path } = await req.json()
    
    console.log('Starting image optimization for:', imageUrl)
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get TinyPNG API key
    const tinyPngApiKey = Deno.env.get('TINYPNG_API_KEY')
    if (!tinyPngApiKey) {
      throw new Error('TinyPNG API key not configured')
    }
    
    // Download the original image
    console.log('Downloading original image...')
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`)
    }
    
    const originalImageData = await imageResponse.arrayBuffer()
    const originalSize = originalImageData.byteLength
    
    console.log(`Original image size: ${originalSize} bytes`)
    
    // Optimize with TinyPNG
    console.log('Optimizing image with TinyPNG...')
    const optimizeResponse = await fetch('https://api.tinify.com/shrink', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${tinyPngApiKey}`)}`,
        'Content-Type': 'application/octet-stream'
      },
      body: originalImageData
    })
    
    if (!optimizeResponse.ok) {
      const error = await optimizeResponse.text()
      throw new Error(`TinyPNG optimization failed: ${error}`)
    }
    
    const optimizeResult = await optimizeResponse.json()
    console.log('TinyPNG result:', optimizeResult)
    
    // Download optimized image
    const optimizedResponse = await fetch(optimizeResult.output.url)
    const optimizedImageData = await optimizedResponse.arrayBuffer()
    const optimizedSize = optimizedImageData.byteLength
    
    console.log(`Optimized image size: ${optimizedSize} bytes`)
    
    // Calculate compression ratio
    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100
    
    // Generate new filename with timestamp to avoid caching issues
    const timestamp = Date.now()
    const pathParts = path.split('.')
    const extension = pathParts.pop()
    const baseName = pathParts.join('.')
    const newPath = `${baseName}_optimized_${timestamp}.${extension}`
    
    // Upload optimized image to Supabase Storage
    console.log(`Uploading optimized image to ${bucket}/${newPath}`)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(newPath, optimizedImageData, {
        contentType: optimizeResult.output.type || 'image/jpeg',
        upsert: true
      })
    
    if (uploadError) {
      throw new Error(`Failed to upload optimized image: ${uploadError.message}`)
    }
    
    // Get public URL for the optimized image
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(newPath)
    
    const result: OptimizationResult = {
      success: true,
      originalSize,
      optimizedSize,
      compressionRatio: Math.round(compressionRatio * 100) / 100,
      optimizedUrl: publicUrl
    }
    
    console.log('Image optimization completed:', result)
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('Error optimizing image:', error)
    
    const result: OptimizationResult = {
      success: false,
      originalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
      optimizedUrl: '',
      error: error.message
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})