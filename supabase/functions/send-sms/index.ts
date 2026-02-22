import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { sendSMS } from '../_shared/twilio.ts'
import { logger } from '../_shared/logger.ts'

interface SMSRequest {
  to: string
  message: string
  order_id?: string
  event_type?: string
}

serve(async (req: Request) => {
  const start = Date.now()
  if (req.method === 'OPTIONS') return handleCors()

  try {
    // Only callable from service role (internal)
    const authHeader = req.headers.get('Authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!authHeader?.includes(serviceKey ?? '__none__')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: SMSRequest = await req.json()
    const { to, message, order_id, event_type } = body

    if (!to || !message) {
      return new Response(JSON.stringify({ error: 'to and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    logger.info('send-sms.invoked', { to: to.slice(0, 6) + '****', event_type, order_id })

    await sendSMS(to, message)

    // Log notification in DB if order_id provided
    if (order_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('notifications').insert({
        order_id,
        channel: 'sms',
        event_type: event_type ?? 'sms.sent',
        content: message,
      })
    }

    logger.duration('send-sms.completed', start, { event_type })

    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logger.error('send-sms.error', err as Error, {})
    return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
