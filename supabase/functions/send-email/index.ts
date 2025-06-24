import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

interface EmailRequest {
  to_email: string
  to_name: string
  subject: string
  html_content: string
  text_content: string
  template_id?: string
  variables?: Record<string, any>
}

interface EmailTemplate {
  template_id: string
  subject: string
  html_content: string
  text_content: string
  variables: string[]
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, to_name, subject, html_content, text_content, template_id, variables = {} }: EmailRequest = await req.json()

    // Get email service configuration from environment
    const emailProvider = Deno.env.get('EMAIL_PROVIDER') || 'sendgrid'
    
    let emailResult
    
    if (emailProvider === 'sendgrid') {
      emailResult = await sendWithSendGrid({
        to_email,
        to_name,
        subject,
        html_content,
        text_content,
        variables
      })
    } else if (emailProvider === 'resend') {
      emailResult = await sendWithResend({
        to_email,
        to_name,
        subject,
        html_content,
        text_content,
        variables
      })
    } else {
      // Fallback: log email instead of sending
      emailResult = await logEmailFallback({
        to_email,
        to_name,
        subject,
        html_content,
        text_content,
        variables
      })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        provider: emailProvider,
        result: emailResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email sending failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function sendWithSendGrid(emailData: any) {
  const apiKey = Deno.env.get('SENDGRID_API_KEY')
  if (!apiKey) {
    throw new Error('SendGrid API key not configured')
  }

  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@agileforge.com'
  const fromName = Deno.env.get('FROM_NAME') || 'AgileForge'

  // Replace template variables in content
  let processedHtml = emailData.html_content
  let processedText = emailData.text_content
  let processedSubject = emailData.subject

  for (const [key, value] of Object.entries(emailData.variables)) {
    const placeholder = `{{${key}}}`
    processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), String(value))
    processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value))
    processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value))
  }

  const payload = {
    personalizations: [
      {
        to: [
          {
            email: emailData.to_email,
            name: emailData.to_name
          }
        ],
        subject: processedSubject
      }
    ],
    from: {
      email: fromEmail,
      name: fromName
    },
    content: [
      {
        type: 'text/plain',
        value: processedText
      },
      {
        type: 'text/html',
        value: processedHtml
      }
    ]
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SendGrid API error: ${response.status} ${errorText}`)
  }

  return {
    provider: 'sendgrid',
    status: response.status,
    message_id: response.headers.get('x-message-id')
  }
}

async function sendWithResend(emailData: any) {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) {
    throw new Error('Resend API key not configured')
  }

  const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@agileforge.com'

  // Replace template variables
  let processedHtml = emailData.html_content
  let processedText = emailData.text_content
  let processedSubject = emailData.subject

  for (const [key, value] of Object.entries(emailData.variables)) {
    const placeholder = `{{${key}}}`
    processedHtml = processedHtml.replace(new RegExp(placeholder, 'g'), String(value))
    processedText = processedText.replace(new RegExp(placeholder, 'g'), String(value))
    processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value))
  }

  const payload = {
    from: fromEmail,
    to: [emailData.to_email],
    subject: processedSubject,
    html: processedHtml,
    text: processedText
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  return {
    provider: 'resend',
    status: response.status,
    message_id: result.id
  }
}

async function logEmailFallback(emailData: any) {
  // Log email to console (development fallback)
  console.log('📧 EMAIL FALLBACK (would send email):')
  console.log('To:', emailData.to_email, '(' + emailData.to_name + ')')
  console.log('Subject:', emailData.subject)
  console.log('Variables:', emailData.variables)
  console.log('---')
  
  return {
    provider: 'fallback',
    status: 200,
    message: 'Email logged to console (development mode)'
  }
} 