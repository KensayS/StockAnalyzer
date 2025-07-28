// invoke-ingest.js
import { createClient } from '@supabase/supabase-js'
import * as dotenv from "dotenv";
dotenv.config();

// Use CLOUD Supabase for production-ready setup
const SUPABASE_URL = process.env.SUPABASE_URL // Your cloud project URL  
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
console.log("Using CLOUD URL:", SUPABASE_URL)
console.log("Using key:", SUPABASE_KEY?.substring(0, 20) + "...")

if (!SUPABASE_KEY || !SUPABASE_URL) {
  console.error('⚠️  Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for your CLOUD project in your .env')
  process.exit(1)
}

// Point the client at the CLOUD Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runIngest() {
  const { data, error } = await supabase.functions.invoke('ingest')
  if (error) {
    console.error('❌ Ingest error:', error)
    process.exit(1)
  }
  console.log('✅ Ingest result:', data)
}

runIngest()