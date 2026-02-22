const RESEND_API_URL = 'https://api.resend.com/emails'

interface EmailPayload {
  from: string
  to: string | string[]
  subject: string
  html: string
  text?: string
}

interface ResendResponse {
  id: string
}

export async function sendEmail(payload: EmailPayload): Promise<ResendResponse> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      from: payload.from || 'LaundrLink <noreply@laundrlink.com.au>',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }

  return res.json() as Promise<ResendResponse>
}
