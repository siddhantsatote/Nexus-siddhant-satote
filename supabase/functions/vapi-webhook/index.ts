// Supabase Edge Function to handle Vapi.ai webhooks
// Deploy with: supabase functions deploy vapi-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Pune area coordinates mapping
const PUNE_GEO_MAP: Record<string, { lat: number; lng: number }> = {
  'hinjewadi': { lat: 18.5913, lng: 73.7389 },
  'hinjawadi': { lat: 18.5913, lng: 73.7389 },
  'kothrud': { lat: 18.5074, lng: 73.8077 },
  'viman nagar': { lat: 18.5679, lng: 73.9143 },
  'shaniwar wada': { lat: 18.5195, lng: 73.8553 },
  'camp': { lat: 18.5248, lng: 73.8785 },
  'magarpatta': { lat: 18.5089, lng: 73.9259 },
  'hadapsar': { lat: 18.5089, lng: 73.9259 },
  'baner': { lat: 18.5590, lng: 73.7799 },
  'aundh': { lat: 18.5580, lng: 73.8075 },
  'swargate': { lat: 18.5018, lng: 73.8636 },
  'pashan': { lat: 18.5397, lng: 73.7915 },
  'bavdhan': { lat: 18.5146, lng: 73.7796 },
  'sangvi': { lat: 18.5721, lng: 73.8080 },
  'wakad': { lat: 18.5987, lng: 73.7512 },
  'pimpri': { lat: 18.6298, lng: 73.7997 },
  'chinchwad': { lat: 18.6416, lng: 73.7715 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'katraj': { lat: 18.4575, lng: 73.8674 },
  'kondhwa': { lat: 18.4638, lng: 73.8985 },
  'kharadi': { lat: 18.5511, lng: 73.9407 },
  'koregaon park': { lat: 18.5362, lng: 73.8939 },
  'deccan': { lat: 18.5167, lng: 73.8408 },
}

function extractPuneCoords(text: string): { lat: number; lng: number } | null {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const [area, coords] of Object.entries(PUNE_GEO_MAP)) {
    if (lower.includes(area)) {
      return coords
    }
  }
  // Default to Pune center if no match but mentioned Pune
  if (lower.includes('pune')) {
    return { lat: 18.5204, lng: 73.8567 }
  }
  return null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VapiCallData {
  call?: {
    id: string;
    phoneNumber?: string;
    status?: string;
    startedAt?: string;
    endedAt?: string;
    duration?: number;
  };
  message?: {
    type: string;
    transcript?: string;
    call?: {
      id: string;
    };
  };
  transcript?: string;
  summary?: string;
  structuredData?: {
    priority?: string;
    incident_type?: string;
    location?: string;
    patient_count?: number;
    patient_condition?: string;
    caller_name?: string;
    callback_number?: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: VapiCallData = await req.json()
    console.log('Vapi webhook received:', JSON.stringify(payload, null, 2))

    // Handle different Vapi event types
    const messageType = payload.message?.type || 'end-of-call-report'

    if (messageType === 'end-of-call-report' || payload.structuredData) {
      // This is the final call report with extracted data
      const callData = payload.call || payload.message?.call
      const structured = payload.structuredData || {}

      // 1. Save to call_logs table
      const { data: callLog, error: callError } = await supabase
        .from('call_logs')
        .insert({
          vapi_call_id: callData?.id || `call-${Date.now()}`,
          caller_phone: callData?.phoneNumber || 'unknown',
          transcript: payload.transcript || '',
          summary: payload.summary || '',
          priority: structured.priority || 'P3',
          incident_type: structured.incident_type || 'other',
          location_raw: structured.location || '',
          patient_count: structured.patient_count || 1,
          patient_condition: structured.patient_condition || '',
          caller_name: structured.caller_name || '',
          callback_number: structured.callback_number || '',
          call_duration: callData?.duration || 0,
          call_status: 'completed',
          raw_payload: payload
        })
        .select()
        .single()

      if (callError) {
        console.error('Error saving call log:', callError)
        throw callError
      }

      console.log('Call log saved:', callLog)

      // 2. Auto-create incident for P1, P2, or P3 calls
      const locationText = structured.location || payload.transcript || ''
      const coords = extractPuneCoords(locationText)
      
      // Create incident for all priorities (so they show on map)
      const incidentData: Record<string, unknown> = {
        priority: structured.priority || 'P3',
        incident_type: structured.incident_type || 'other',
        status: 'open',
        caller_description: payload.transcript || payload.summary || 'AI Call - No transcript',
        location_raw: structured.location || '',
        ai_triage_json: {
          source: 'vapi_call',
          call_id: callData?.id,
          structured_data: structured,
          auto_created: true
        }
      }

      // Add coordinates if found
      if (coords) {
        incidentData.location_lat = coords.lat
        incidentData.location_lng = coords.lng
      } else {
        // Default to random Pune location if no coords found
        incidentData.location_lat = 18.45 + Math.random() * 0.15
        incidentData.location_lng = 73.78 + Math.random() * 0.15
      }

      const { data: incident, error: incError } = await supabase
        .from('incidents')
        .insert(incidentData)
        .select()
        .single()

      if (incError) {
        console.error('Error creating incident:', incError)
      } else {
        console.log('Incident auto-created:', incident)

        // Link incident to call log
        await supabase
          .from('call_logs')
          .update({ linked_incident_id: incident.id })
          .eq('id', callLog.id)
      }

      return new Response(
        JSON.stringify({ success: true, call_log_id: callLog.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For other message types (status updates, etc.), just acknowledge
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
