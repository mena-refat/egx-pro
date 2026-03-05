import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  BrainCircuit, 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  BarChart3, 
  Newspaper,
  ChevronLeft,
  Star,
  Zap,
  ExternalLink,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import { getStockName, getStockInfo } from '../lib/egxStocks';
import { Stock, AnalysisResult } from '../types';

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  url: string;
}

interface StockAnalysisProps {
  stock: Stock;
  onBack: () => void;
}

export default function StockAnalysis({ stock, onBack }: StockAnalysisProps) {
  const { i18n } = useTranslation('common');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRTL = i18n.language === 'ar';

  const getAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/analysis/${stock.ticker}`);
      if (res.data && res.data.analysis) {
        setAnalysis(res.data.analysis);
      } else {
        console.error('Unexpected response format:', res.data);
        throw new Error('Invalid analysis format from server');
      }
    } catch (err: unknown) {
      console.error('AI Analysis failed', err);
      if (err && typeof err === 'object' && 'response' in err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setError((err as any).response?.data?.error || 'Failed to generate analysis');
      } else {
        setError('Failed to generate analysis');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getNews = async () => {
      setNewsLoading(true);
      try {
        const res = await api.get(`/stocks/news/${stock.ticker}`);
        if (res.data) {
          setNews(res.data);
        }
      } catch (err) {
        console.error('News fetch failed', err);
      } finally {
        setNewsLoading(false);
      }
    };

    getNews();
  }, [stock.ticker]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          {isRTL ? 'العودة للأسهم' : 'Back to Stocks'}
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full">
          <Zap className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">AI Intelligence Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Report */}
        <div className="lg:col-span-2 space-y-8">
          <section className="card-base p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-4xl font-bold mb-2 dark:text-white text-slate-900">{getStockName(stock.ticker, isRTL ? 'ar' : 'en')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stock.ticker}</p>
                {getStockInfo(stock.ticker)?.nameEn && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{getStockInfo(stock.ticker)!.nameEn}</p>
                )}
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${(stock.change || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {(stock.price || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP
                </div>
                <div className={`text-sm font-bold ${(stock.change || 0) >= 0 ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                  {(stock.change || 0) >= 0 ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
            
            {!analysis && !loading && !error && (
              <div className="text-center py-12 border border-dashed border-slate-700 rounded-2xl">
                <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{isRTL ? 'تحليل الذكاء الاصطناعي' : 'AI Analysis'}</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  {isRTL 
                    ? 'احصل على تحليل شامل للسهم باستخدام أحدث نماذج الذكاء الاصطناعي.' 
                    : 'Get a comprehensive analysis of this stock using state-of-the-art AI models.'}
                </p>
                <button 
                  onClick={getAnalysis}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto"
                >
                  <Zap className="w-4 h-4" />
                  {isRTL ? 'توليد التحليل' : 'Generate Analysis'}
                </button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <BrainCircuit className="w-12 h-12 text-violet-500" />
                </motion.div>
                <div className="text-center">
                  <h3 className="text-xl font-bold mb-2">{isRTL ? 'جاري تحليل البيانات...' : 'Analyzing Market Data...'}</h3>
                  <p className="text-slate-500 text-sm">{isRTL ? 'Claude يقوم بفحص المؤشرات الفنية والأساسية لـ ' : 'Claude is scanning fundamentals and technicals for '} {getStockName(stock.ticker, isRTL ? 'ar' : 'en')}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-500 mb-4">{error}</p>
                <button 
                  onClick={getAnalysis}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  {isRTL ? 'إعادة المحاولة' : 'Retry'}
                </button>
              </div>
            )}

            {analysis && !loading && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-white/5 mb-8">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic">"{analysis.summary}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-violet-500 font-bold">
                      <BarChart3 className="w-5 h-5" />
                      {isRTL ? 'التحليل الأساسي' : 'Fundamental Analysis'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
                      <p><span className="text-slate-900 dark:text-slate-200 font-medium">{isRTL ? 'النظرة العامة:' : 'Outlook:'}</span> {analysis.fundamental?.outlook}</p>
                      <p><span className="text-slate-900 dark:text-slate-200 font-medium">{isRTL ? 'المؤشرات:' : 'Ratios:'}</span> {analysis.fundamental?.ratios}</p>
                      <p className="text-emerald-500 font-bold">Verdict: {analysis.fundamental?.verdict}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-500 font-bold">
                      <TrendingUp className="w-5 h-5" />
                      {isRTL ? 'التحليل الفني' : 'Technical Analysis'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 space-y-2">
                      <p><span className="text-slate-900 dark:text-slate-200 font-medium">{isRTL ? 'الإشارة:' : 'Signal:'}</span> {analysis.technical?.signal}</p>
                      <p><span className="text-slate-900 dark:text-slate-200 font-medium">{isRTL ? 'المؤشرات:' : 'Indicators:'}</span> {analysis.technical?.indicators}</p>
                      <p><span className="text-slate-900 dark:text-slate-200 font-medium">{isRTL ? 'المستويات:' : 'Levels:'}</span> {analysis.technical?.levels}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </section>

          <section className="card-base p-8">
            <div className="flex items-center gap-2 text-amber-500 font-bold mb-6">
              <Newspaper className="w-5 h-5" />
              {isRTL ? 'تحليل الأخبار والمشاعر' : 'News & Sentiment Analysis'}
            </div>
            
            {analysis && (
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">{analysis.sentiment}</p>
            )}

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {isRTL ? 'آخر الأخبار اللحظية' : 'Latest Real-Time News'}
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {newsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                  </div>
                ) : (
                  news.map((item, idx) => (
                    <a 
                      key={idx} 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-500' :
                          item.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                          'bg-slate-500/10 text-slate-500'
                        }`}>
                          {item.sentiment || 'neutral'}
                        </span>
                        <span className="text-[10px] text-slate-500">{new Date(item.publishedAt).toLocaleDateString(i18n.language)}</span>
                      </div>
                      <h5 className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-violet-500 transition-colors mb-1">{item.title}</h5>
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>{item.source}</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </a>
                  ))
                )}
                {!newsLoading && news.length === 0 && (
                  <p className="text-center py-8 text-slate-500 text-sm italic">{isRTL ? 'لا توجد أخبار متاحة حالياً' : 'No news available at the moment'}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar Verdict */}
        <div className="space-y-6">
          {analysis ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="card-base p-8 text-center">
                <h3 className="text-slate-500 text-xs uppercase tracking-widest mb-4">{isRTL ? 'التقييم النهائي' : 'Overall Verdict'}</h3>
                <div className={`text-3xl font-black mb-4 ${analysis.verdict?.includes('Buy') ? 'text-emerald-500' : analysis.verdict?.includes('Sell') ? 'text-red-500' : 'text-amber-500'}`}>
                  {analysis.verdict}
                </div>
                <div className="flex justify-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-5 h-5 ${i <= 4 ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                  ))}
                </div>
                <div className="pt-6 border-t dark:border-white/5 border-slate-100">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-tighter">{isRTL ? 'السعر المستهدف (12 شهر)' : '12-Month Price Target'}</p>
                  <div className="flex justify-between items-end">
                    <div className="text-center">
                      <span className="block text-[10px] text-slate-400">Low</span>
                      <span className="font-bold text-red-500">{analysis.priceTarget?.low}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-slate-400">Base</span>
                      <span className="text-2xl font-black dark:text-white text-slate-900">{analysis.priceTarget?.base}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[10px] text-slate-400">High</span>
                      <span className="font-bold text-emerald-500">{analysis.priceTarget?.high}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-base p-6">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold mb-4">
                  <Target className="w-4 h-4" />
                  <span className="text-sm">{isRTL ? 'مناسب لـ' : 'Suitability'}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{analysis.suitability}</p>
              </div>

              <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">{isRTL ? 'إخلاء مسؤولية' : 'Disclaimer'}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">{analysis.disclaimer}</p>
              </div>
            </motion.div>
          ) : (
            <div className="card-base p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full min-h-[300px]">
              <BrainCircuit className="w-12 h-12 mb-4 opacity-50" />
              <p>{isRTL ? 'قم بتوليد التحليل لعرض التقييم النهائي' : 'Generate analysis to view overall verdict'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
