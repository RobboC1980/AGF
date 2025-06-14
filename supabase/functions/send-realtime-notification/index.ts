import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RealtimeNotificationRequest {
  user_id: string
  notification_id: string
  type: string
  title: string
  message: string
  priority: string
  data?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      user_id, 
      notification_id, 
      type, 
      title, 
      message, 
      priority, 
      data 
    } = await req.json() as RealtimeNotificationRequest

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Prepare notification payload
    const notificationPayload = {
      id: notification_id,
      user_id,
      type,
      title,
      message,
      priority,
      data: data || {},
      timestamp: new Date().toISOString(),
      read: false
    }

    // Send to user-specific channel
    const userChannel = `user:${user_id}:notifications`
    
    // Use Supabase Realtime to broadcast the notification
    const { error: broadcastError } = await supabaseClient
      .channel(userChannel)
      .send({
        type: 'broadcast',
        event: 'new_notification',
        payload: notificationPayload
      })

    if (broadcastError) {
      throw new Error(`Broadcast error: ${broadcastError.message}`)
    }

    // Also send to general notifications channel for the user
    const { error: generalBroadcastError } = await supabaseClient
      .channel('notifications')
      .send({
        type: 'broadcast',
        event: 'notification_update',
        payload: {
          user_id,
          notification: notificationPayload,
          action: 'created'
        }
      })

    if (generalBroadcastError) {
      console.warn('General broadcast failed:', generalBroadcastError.message)
    }

    // Update user's unread notification count
    const { data: currentUser, error: userError } = await supabaseClient
      .from('users')
      .select('unread_notifications')
      .eq('id', user_id)
      .single()

    if (!userError && currentUser) {
      const newCount = (currentUser.unread_notifications || 0) + 1
      
      await supabaseClient
        .from('users')
        .update({ unread_notifications: newCount })
        .eq('id', user_id)

      // Broadcast unread count update
      await supabaseClient
        .channel(`user:${user_id}:status`)
        .send({
          type: 'broadcast',
          event: 'unread_count_update',
          payload: {
            user_id,
            unread_count: newCount
          }
        })
    }

    // Log the real-time notification
    await supabaseClient
      .from('realtime_logs')
      .insert({
        user_id,
        notification_id,
        channel: userChannel,
        event_type: 'new_notification',
        payload: notificationPayload,
        sent_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Real-time notification sent successfully',
        notification_id,
        channel: userChannel
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Real-time notification error:', error)
    
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