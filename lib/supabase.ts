import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client for use with Clerk
export const createClerkSupabaseClient = (supabaseAccessToken?: string) => {
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
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
};

// Default client for non-authenticated requests
export const supabase = createClerkSupabaseClient(); 