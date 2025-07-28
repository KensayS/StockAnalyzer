// supabase/functions/ingest/index.ts

import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("⚙️ Ingest function initializing");

// Supabase client
const SUPABASE_URL              = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Third-party API keys
const NEWSAPI_KEY    = Deno.env.get("NEWSAPI_KEY")!;
const FMP_API_KEY    = Deno.env.get("FMP_API_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

// Helper: call Gemini embedContent endpoint per docs
async function embedText(text: string): Promise<number[]> {
  console.log("🔗 Embedding text (len:", text.length, ")");
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

  console.log("🔍 Embed status:", resp.status);
  
  if (!resp.ok) {
    const errorText = await resp.text();
    console.error("❌ Embedding API error:", errorText);
    throw new Error(`Embedding API failed: ${resp.status} ${errorText}`);
  }

  const json = await resp.json();
  const values = json.embedding?.values;
  if (!Array.isArray(values)) {
    console.error("📦 Full embedding response:", JSON.stringify(json, null, 2));
    throw new Error("Invalid embedding response structure");
  }

  console.log("✅ Received embedding with dimensions:", values.length);
  return values;
}

serve(async () => {
  console.log("▶️ Handler invoked at", new Date().toISOString());
  
  // Clear entire vectors table before ingest
  console.log("🧹 Clearing existing vectors table");
  const { error: delError } = await sb.from('vectors').delete().neq('id', '');
  if (delError) console.error("❌ Error clearing vectors table:", delError);

  const tickers = [
    "GOOG", "BRK-B", "AAPL", "AMZN", "MSFT", "TSLA", "NVDA", "META",
    "SPY", "VOO", "QQQ", "VTI", "IVV"
  ];

  for (const ticker of tickers) {
    // 1️⃣ NewsAPI ingestion
    console.log(`📰 Fetching news for ${ticker}`);
    let news: any;
    try {
      const r = await fetch(
        `https://newsapi.org/v2/everything?q=${ticker}&pageSize=5&apiKey=${NEWSAPI_KEY}`
      );
      news = await r.json();
      if (!Array.isArray(news.articles)) throw new Error("Bad NewsAPI");
      console.log(`📰 Got ${news.articles.length} articles`);
    } catch (e) {
      console.error("❌ NewsAPI error for", ticker, e);
      continue;
    }

    for (const art of news.articles) {
      const text = [art.title, art.description].filter(Boolean).join("\n\n");
      if (!text.trim()) {
        console.log("⚠️ Skipping empty article");
        continue;
      }

      try {
        const emb = await embedText(text);
        
        try {
          const { error } = await sb
            .from("vectors")
            .upsert([
              {
                id: `${ticker}-news-${art.publishedAt}`,
                ticker,
                source: "NewsAPI",
                content: text,
                embedding: emb,
              }
            ], { onConflict: "id" });

          if (error) console.error("❌ Supabase upsert error:", error);
          else console.log(`💾 Upserted news ${ticker}@${art.publishedAt}`);
        } catch (insertError) {
          console.error("❌ Insert operation failed:", insertError);
        }
      } catch (e) {
        console.error("❌ Upsert news failed for", ticker, art.publishedAt, e);
      }
    }

    // 2️⃣ Financial Modeling Prep fundamentals
    console.log(`📊 Fetching fundamentals for ${ticker}`);
    let profileData, ratioData;
    try {
      const p = await fetch(
        `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`
      );
      profileData = (await p.json())[0];
      const r = await fetch(
        `https://financialmodelingprep.com/api/v3/ratios/${ticker}?limit=1&apikey=${FMP_API_KEY}`
      );
      ratioData = (await r.json())[0];

      console.log(
        "📊 Fundamentals:",
        "P/E=", ratioData.priceEarningsRatio,
        "ROE=", ratioData.returnOnEquity,
        "MarketCap=", profileData.mktCap
      );
    } catch (e) {
      console.error("❌ FMP error for", ticker, e, ratioData, profileData);
      continue;
    }

    const summary = [,
      `ROE: ${ratioData.returnOnEquity || 'N/A'}`,
      `MarketCap: ${profileData.mktCap || 'N/A'}`
    ].join(", ");

    try {
      const emb = await embedText(summary);
      const { error } = await sb
        .from("vectors")
        .upsert([
          {
            id: `${ticker}-fundamentals`,
            ticker,
            source: "FMP",
            content: summary,
            embedding: emb,
          }
        ], { onConflict: "id" });

      if (error) console.error("❌ Supabase upsert error:", error);
      else console.log(`💾 Upserted fundamentals for ${ticker}`);
    } catch (e) {
      console.error("❌ Upsert fundamentals failed for", ticker, e);
    }
  }

  console.log("🏁 Ingest complete");
  return new Response("ingest complete", { status: 200 });
});
