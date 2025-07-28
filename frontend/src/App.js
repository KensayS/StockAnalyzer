import React, { useState } from 'react';
import { Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const SUPABASE_URL = 'https://dmxjoviqyfaablocpnkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRteGpvdmlxeWZhYWJsb2NwbmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODc2MDYsImV4cCI6MjA2OTA2MzYwNn0.GX0eX_whhhjdG5SWACX8ihDystzuMheT3dsoTF9au78';

// List of tickers and their descriptions
const tickers = [
  { value: 'GOOG', label: 'Alphabet Inc.' },
  { value: 'BRK-B', label: 'Berkshire Hathaway Inc.' },
  { value: 'AAPL', label: 'Apple Inc.' },
  { value: 'AMZN', label: 'Amazon.com, Inc.' },
  { value: 'MSFT', label: 'Microsoft Corporation' },
  { value: 'TSLA', label: 'Tesla, Inc.' },
  { value: 'NVDA', label: 'NVIDIA Corporation' },
  { value: 'META', label: 'Meta Platforms, Inc.' },
  { value: 'SPY', label: 'SPDR S&P 500 ETF Trust' },
  { value: 'VOO', label: 'Vanguard S&P 500 ETF' },
  { value: 'QQQ', label: 'Invesco QQQ Trust' },
  { value: 'VTI', label: 'Vanguard Total Stock Market ETF' },
  { value: 'IVV', label: 'iShares Core S&P 500 ETF' }
];

export default function StockAnalyzer() {
  const [ticker, setTicker] = useState(tickers[0].value);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [context, setContext] = useState([]);

  const analyzeStock = async () => {
    if (!ticker) {
      setError('Please select a stock ticker');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis('');
    setContext([]);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rag-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          ticker,
          query: `Provide a concise analysis of ${ticker} stock`
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      const data = await response.json();
      setAnalysis(data.analysis);
      setContext(data.context || []);
    } catch (err) {
      setError(err.message || 'An error occurred during analysis');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => analyzeStock();

  const selected = tickers.find(t => t.value === ticker) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="w-12 h-12 text-purple-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">Stock Analyzer</h1>
          </div>
          <p className="text-slate-300 text-lg">Get AI-powered analysis of your favorite stocks.</p>
        </div>
        {/* Dropdown and description */}
        <div className="max-w-2xl mx-auto mb-8">
          <select
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            disabled={loading}
            className="w-full bg-slate-800/50 border border-slate-700 text-white py-3 px-4 rounded-xl mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {tickers.map(t => (
              <option key={t.value} value={t.value} className="bg-slate-900">
                {t.value} - {t.label}
              </option>
            ))}
          </select>
          <div className="text-center text-slate-400 mb-4">{selected.label}</div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white py-3 rounded-lg font-medium transition"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin inline" /> Analyzing...</> : 'Analyze'}
          </button>
        </div>
        {error && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}
        {analysis && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-8 prose prose-invert text-slate-200">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" /> Analysis for {ticker}
              </h2>
              <div className="whitespace-pre-wrap leading-relaxed">{analysis}</div>
            </div>
            {context.length > 0 && (
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-4">Data Sources</h3>
                <div className="space-y-4">
                  {context.map((item,i) => (
                    <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
                      <div className="flex justify-between mb-2">
                        <span className="text-purple-400 text-sm">{item.source}</span>
                        <span className="text-slate-400 text-xs">{(item.similarity*100).toFixed(1)}%</span>
                      </div>
                      <p className="text-slate-300 text-sm">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!analysis && !loading && !error && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-white mb-4">How to use</h3>
              <p className="text-slate-300">Select a ticker and click Analyze.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
