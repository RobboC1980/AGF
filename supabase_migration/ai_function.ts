// Supabase Edge Function for AI Integration
// This would be deployed to your Supabase project as an Edge Function

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import OpenAI from "https://esm.sh/openai@4.10.0";

// Initialize OpenAI
const openaiClient = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Response interface
interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokens_used?: number;
  processing_time?: number;
  model_used?: string;
}

// Type for AI request
interface AIRequest {
  prompt: string;
  template_name?: string;
  variables?: Record<string, any>;
  max_tokens?: number;
  temperature?: number;
  model?: string;
}

// Helper for generating AI completions
async function generateCompletion(
  req: AIRequest,
  userId: string
): Promise<APIResponse> {
  const startTime = Date.now();
  
  try {
    const model = req.model || "gpt-4o";
    const maxTokens = req.max_tokens || 2048;
    const temperature = req.temperature || 0.7;
    
    let prompt = req.prompt;
    
    // If template name and variables provided, format the prompt
    if (req.template_name && req.variables) {
      // In a real implementation, you'd load templates from a database
      prompt = formatPrompt(req.template_name, req.variables);
    }
    
    // Call OpenAI
    const completion = await openaiClient.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature,
    });
    
    const responseText = completion.choices[0].message.content || "";
    const tokensUsed = completion.usage?.total_tokens || 0;
    const processingTime = Date.now() - startTime;
    
    // Save completion to database
    const { error } = await supabaseClient
      .from("ai_completions")
      .insert({
        user_id: userId,
        prompt: prompt,
        completion: responseText,
        model: model,
        tokens_used: tokensUsed,
      });
      
    if (error) {
      console.error("Error saving completion:", error);
    }
    
    // Return the successful response
    return {
      success: true,
      data: {
        text: responseText,
        // Parse the response based on template expectations
        // In a real implementation, you'd parse JSON or structured data here
      },
      tokens_used: tokensUsed,
      processing_time: processingTime,
      model_used: model,
    };
    
  } catch (error) {
    console.error("Error generating completion:", error);
    return {
      success: false,
      error: `AI generation failed: ${error.message}`,
    };
  }
}

// Template formatting function (stub implementation)
function formatPrompt(templateName: string, variables: Record<string, any>): string {
  // In a real implementation, you'd load templates from a database
  // and properly format them with the provided variables
  
  // For demonstration purposes:
  let template = "Default template with variables: ";
  
  // Add all variables to the template
  Object.keys(variables).forEach(key => {
    template += `\n${key}: ${JSON.stringify(variables[key])}`;
  });
  
  return template;
}

// Serve HTTP requests
serve(async (req) => {
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // CORS headers
  const headers = new Headers({
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  });
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  
  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers }
      );
    }
    
    // Validate JWT with Supabase Auth
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers }
      );
    }
    
    // Parse request body
    const requestData: AIRequest = await req.json();
    
    // Generate AI completion
    const result = await generateCompletion(requestData, user.id);
    
    // Return the response
    return new Response(JSON.stringify(result), { headers });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: `Server error: ${error.message}` }),
      { status: 500, headers }
    );
  }
}); 