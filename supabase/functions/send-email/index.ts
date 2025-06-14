import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to_email: string
  to_name: string
  template_id?: string
  subject: string
  html_content: string
  text_content: string
  variables: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, to_name, template_id, subject, html_content, text_content, variables } = await req.json() as EmailRequest

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Template variable substitution
    const substituteVariables = (content: string, vars: Record<string, any>): string => {
      let result = content
      for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        result = result.replace(regex, String(value))
      }
      return result
    }

    // Process templates
    const processedSubject = substituteVariables(subject, variables)
    const processedHtmlContent = substituteVariables(html_content, variables)
    const processedTextContent = substituteVariables(text_content, variables)

    // Send email using your preferred email service
    // This example uses a generic email service API
    const emailServiceUrl = Deno.env.get('EMAIL_SERVICE_URL')
    const emailServiceKey = Deno.env.get('EMAIL_SERVICE_KEY')

    if (!emailServiceUrl || !emailServiceKey) {
      throw new Error('Email service not configured')
    }

    const emailResponse = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: to_email, name: to_name }],
        subject: processedSubject,
        html: processedHtmlContent,
        text: processedTextContent,
        from: {
          email: Deno.env.get('FROM_EMAIL') ?? 'noreply@agileforge.com',
          name: 'AgileForge'
        }
      })
    })

    if (!emailResponse.ok) {
      throw new Error(`Email service error: ${emailResponse.statusText}`)
    }

    const emailResult = await emailResponse.json()

    // Log email sending
    await supabaseClient
      .from('email_logs')
      .insert({
        to_email,
        template_id,
        subject: processedSubject,
        status: 'sent',
        external_id: emailResult.id,
        sent_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: emailResult.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 