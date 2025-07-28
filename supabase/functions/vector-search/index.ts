// supabase/functions/vector-search/index.ts

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function embedText(text: string): Promise<number[]> {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
  );
  url.searchParams.set("key", GEMINI_API_KEY);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
    }),
  });

  if (!resp.ok) {
    throw new Error(`Embedding failed: ${resp.status}`);
  }

  const json = await resp.json();
  return json.embedding?.values || [];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, ticker, limit = 5 } = await req.json();
    
    if (!query || !ticker) {
      return new Response(
        JSON.stringify({ error: "Missing query or ticker" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get embedding for the query
    const queryEmbedding = await embedText(query);
    
    // Perform vector similarity search
    const { data, error } = await sb.rpc('match_vectors', {
      query_embedding: queryEmbedding,
      match_ticker: ticker,
      match_threshold: 0.1, // Adjust as needed
      match_count: limit
    });

    if (error) {
      console.error("Vector search error:", error);
      return new Response(
        JSON.stringify({ error: "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ results: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});