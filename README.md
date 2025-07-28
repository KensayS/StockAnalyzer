Stock Analyzer - AI-Powered Financial Analysis
AI-generated stock analysis using real-time news and financial data through RAG (Retrieval-Augmented Generation).
🚀 Features

Real-time news analysis (NewsAPI)
Financial fundamentals (P/E, ROE, market cap)
AI insights via Google Gemini
Semantic search with vector embeddings

🛠️ Tech Stack
Frontend: React, Tailwind CSS
Backend: Supabase, Deno, PostgreSQL + pgvector
AI: Google Gemini (embeddings + generation)
Data: NewsAPI, Financial Modeling Prep
🎯 Supported Stocks
GOOG, AAPL, AMZN, MSFT, TSLA, NVDA, META, BRK-B, SPY, VOO, QQQ, VTI, IVV
🔧 How It Works

Ingest: News + financials → embeddings → vector database
Query: User selects ticker → similarity search → AI analysis
Output: Comprehensive analysis with citations

📊 Key Components

/ingest - Data collection & embedding generation
/rag-analysis - Main analysis endpoint
/vector-search - Semantic search
React UI - Stock selector & results display
