import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { logger } from '../_shared/logger.ts'

type EmailTemplate =
  | 'order-confirmation'
  | 'order-delivered'
  | 'pro-job-assigned'
  | 'hub-order-received'
  | 'driver-job-assigned'

interface EmailRequest {
  to: string
  template: EmailTemplate
  order_id?: string
  data: Record<string, string | number>
}

function renderTemplate(template: EmailTemplate, data: Record<string, string | number>): { subject: string; html: string } {
  switch (template) {
    case 'order-confirmation':
      return {
        subject: `Order ${data.order_number} Confirmed — LaundrLink`,
        html: `
          <h2>Your laundry is on its way! 🧺</h2>
          <p>Hi ${data.customer_name},</p>
          <p>Your order <strong>${data.order_number}</strong> has been confirmed.</p>
          <p><strong>Pickup:</strong> ${data.pickup_date}</p>
          <p><strong>Estimated delivery:</strong> ${data.delivery_date}</p>
          <p>Track your order in the LaundrLink app.</p>
          <p>— The LaundrLink Team</p>
        `,
      }

    case 'order-delivered':
      return {
        subject: `Order ${data.order_number} Delivered ✅`,
        html: `
          <h2>Fresh laundry delivered! ✅</h2>
          <p>Hi ${data.customer_name},</p>
          <p>Your order <strong>${data.order_number}</strong> has been delivered.</p>
          <p>We hope you love the results! Please take a moment to rate your experience in the app.</p>
          <p>— The LaundrLink Team</p>
        `,
      }

    case 'pro-job-assigned':
      return {
        subject: `New Job Assigned — Order ${data.order_number}`,
        html: `
          <h2>New job ready for you 🧺</h2>
          <p>Hi ${data.pro_name},</p>
          <p>A new laundry job has been assigned to you.</p>
          <p><strong>Order:</strong> ${data.order_number}</p>
          <p><strong>Service:</strong> ${data.service_type}</p>
          <p><strong>Due:</strong> ${data.due_date}</p>
          <p>Open the LaundrLink app to accept and view details.</p>
        `,
      }

    case 'hub-order-received':
      return {
        subject: `New Order Received — ${data.order_number}`,
        html: `
          <h2>New order in your queue 📦</h2>
          <p>Hi ${data.hub_name},</p>
          <p>Order <strong>${data.order_number}</strong> has been confirmed and is heading your way.</p>
          <p><strong>Service:</strong> ${data.service_type}</p>
          <p><strong>Pickup date:</strong> ${data.pickup_date}</p>
          <p>Log in to your hub dashboard to manage the order.</p>
        `,
      }

    case 'driver-job-assigned':
      return {
        subject: `Delivery Job — Order ${data.order_number}`,
        html: `
          <h2>Delivery job assigned 🚗</h2>
          <p>Hi ${data.driver_name},</p>
          <p>You have a new delivery job for order <strong>${data.order_number}</strong>.</p>
          <p>Open the LaundrLink driver app to view details and navigate.</p>
        `,
      }

    default:
      return { subject: 'LaundrLink Notification', html: '<p>You have a new notification.</p>' }
  }
}

serve(async (req: Request) => {
  const start = Date.now()
  if (req.method === 'OPTIONS') return handleCors()

  try {
    // Only callable from service role
    const authHeader = req.headers.get('Authorization')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!authHeader?.includes(serviceKey ?? '__none__')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: EmailRequest = await req.json()
    const { to, template, order_id, data } = body

    if (!to || !template) {
      return new Response(JSON.stringify({ error: 'to and template are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    logger.info('send-email.invoked', { template, order_id })

    const { subject, html } = renderTemplate(template, data)
    const result = await sendEmail({ to, subject, html })

    // Log notification in DB
    if (order_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      await supabase.from('notifications').insert({
        order_id,
        channel: 'email',
        event_type: template,
        content: subject,
      })
    }

    logger.duration('send-email.completed', start, { template, resend_id: result.id })

    return new Response(JSON.stringify({ sent: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logger.error('send-email.error', err as Error, {})
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
