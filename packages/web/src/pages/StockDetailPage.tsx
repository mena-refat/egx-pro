import { useParams, useNavigate } from 'react-router-dom';
import StockAnalysis from '../components/features/stocks/StockAnalysis';
import { getStockInfo, EGX_STOCKS } from '../lib/egxStocks';
import { Stock } from '../types';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();

  if (!ticker) return null;

  const upper = ticker.toUpperCase();
  const info = getStockInfo(upper);

  // Validate ticker exists in EGX list
  const knownTicker = EGX_STOCKS.find((s) => s.ticker === upper);
  if (!knownTicker) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-4xl font-bold text-[var(--text-muted)]">404</p>
        <p className="text-lg text-[var(--text-secondary)]">
          Stock <span className="font-mono font-bold">{upper}</span> not found
        </p>
        <button
          type="button"
          onClick={() => navigate('/stocks')}
          className="mt-2 px-5 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Stocks
        </button>
      </div>
    );
  }

  // Render immediately — useStockAnalysis inside StockAnalysis will fetch live data
  const stock: Stock = {
    ticker: upper,
    name: info?.nameAr ?? info?.nameEn ?? upper,
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    sector: '',
    description: '',
  };

  return (
    <StockAnalysis
      stock={stock}
      onBack={() => navigate('/stocks')}
    />
  );
}
