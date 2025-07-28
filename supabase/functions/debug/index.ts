// debug-db.ts - Run this to test your database setup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log("🔍 Environment check:");
console.log("SUPABASE_URL:", SUPABASE_URL);
console.log("SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY);
console.log("SERVICE_ROLE_KEY length:", SUPABASE_SERVICE_ROLE_KEY?.length || 0);

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("\n🔍 Testing database connection...");

// Test 1: Check if we can connect at all
console.log("\n1️⃣ Testing basic connection...");
try {
  const { data, error } = await sb.auth.getUser();
  console.log("Auth test result:", { data: !!data, error: !!error });
} catch (e) {
  console.error("❌ Auth connection failed:", e);
}

// Test 2: List all tables in public schema
console.log("\n2️⃣ Listing all tables in public schema...");
try {
  const { data, error } = await sb
    .rpc('exec', {
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `
    });

  if (error) {
    console.error("❌ Table listing failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Tables found:", data);
  }
} catch (e) {
  console.error("❌ Exception listing tables:", e);
}

// Test 3: Try direct SQL query to vectors table
console.log("\n3️⃣ Direct SQL query to vectors table...");
try {
  const { data, error } = await sb
    .rpc('exec', {
      sql: "SELECT COUNT(*) as count FROM public.vectors;"
    });

  if (error) {
    console.error("❌ Direct SQL failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Direct SQL succeeded:", data);
  }
} catch (e) {
  console.error("❌ Exception with direct SQL:", e);
}

// Test 4: Check table structure if it exists
console.log("\n4️⃣ Checking vectors table structure...");
try {
  const { data, error } = await sb
    .rpc('exec', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vectors'
        ORDER BY ordinal_position;
      `
    });

  if (error) {
    console.error("❌ Structure check failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Table structure:", data);
  }
} catch (e) {
  console.error("❌ Exception checking structure:", e);
}

// Test 5: Check if table exists and structure using .from()
console.log("\n5️⃣ Checking table with .from()...");
try {
  const { data, error } = await sb
    .from("vectors")
    .select("*")
    .limit(0); // Don't fetch data, just check structure

  if (error) {
    console.error("❌ .from() check failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Table 'vectors' accessible via .from()");
  }
} catch (e) {
  console.error("❌ Exception with .from():", e);
}

console.log("\n🏁 Debug complete");