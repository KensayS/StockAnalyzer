// supabase/functions/rag-analysis/index.ts

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

async function generateResponse(context: string, query: string): Promise<string> {
  const url = new URL(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
  );
  url.searchParams.set("key", GEMINI_API_KEY);

  const prompt = `You are a financial analyst. Based on the following context about a stock, provide a comprehensive analysis.

Context:
${context}

User Query: ${query}

Please provide a detailed analysis covering:
1. Recent news and developments
2. Investment implications
3. Key risks and opportunities

Keep your response informative but concise.`;

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    }),
  });

  if (!resp.ok) {
    throw new Error(`Generation failed: ${resp.status}`);
  }

  const json = await resp.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticker, query = `Provide a comprehensive analysis of ${ticker} stock` } = await req.json();
    
    if (!ticker) {
      return new Response(
        JSON.stringify({ error: "Missing ticker" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get embedding for the query
    const queryEmbedding = await embedText(query);
    
    // Perform vector similarity search to get relevant context
    const { data: searchResults, error: searchError } = await sb.rpc('match_vectors', {
      query_embedding: queryEmbedding,
      match_ticker: ticker.toUpperCase(),
      match_threshold: 0.1,
      match_count: 10
    });

    if (searchError) {
      console.error("Vector search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve context" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine all retrieved content as context
    const context = (searchResults || [])
      .map((result: any) => `${result.source}: ${result.content}`)
      .join('\n\n');

    if (!context) {
      return new Response(
        JSON.stringify({ 
          error: `No data found for ticker ${ticker}. Please make sure the data has been ingested.` 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate response using Gemini
    const analysis = await generateResponse(context, query);

    return new Response(
      JSON.stringify({ 
        analysis,
        context: searchResults || [],
        ticker: ticker.toUpperCase()
      }),
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