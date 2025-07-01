import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Defensive environment variable access with fallbacks for build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key';

// Create Supabase client for use with Clerk
export const createClerkSupabaseClient = (supabaseAccessToken?: string) => {
  // During build time, environment variables might not be available
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && typeof window === 'undefined') {
    console.warn('Supabase URL not available during build time - using placeholder');
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: supabaseAccessToken ? {
          Authorization: `Bearer ${supabaseAccessToken}`,
        } : {},
      },
      auth: {
        persistSession: false,
      },
    }
  );
};

// Admin client with service role for server-side operations
// ONLY use this on the server-side!
export const createAdminClient = () => {
  // During build time, environment variables might not be available
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY && typeof window === 'undefined') {
    console.warn('Supabase service key not available during build time - using placeholder');
  }
  
  return createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );
};

// Default client for non-authenticated requests
export const supabase = createClerkSupabaseClient(); 