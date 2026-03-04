import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function InvestmentCalculator() {
  const { i18n } = useTranslation('common');
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(25); // Average EGX return

  const isRTL = i18n.language === 'ar';

  const calculateGrowth = () => {
    const data = [];
    let balance = 0;
    const monthlyRate = rate / 100 / 12;

    for (let i = 0; i <= years; i++) {
      if (i > 0) {
        for (let m = 0; m < 12; m++) {
          balance = (balance + monthly) * (1 + monthlyRate);
        }
      }
      data.push({
        year: i,
        total: Math.round(balance),
        principal: monthly * 12 * i
      });
    }
    return data;
  };

  const chartData = calculateGrowth();
  const finalValue = chartData[chartData.length - 1].total;
  const totalInvested = monthly * 12 * years;
  const profit = finalValue - totalInvested;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Inputs */}
      <div className="card-base p-8 space-y-8">
        <div className="flex items-center gap-3 mb-4">
          <Calculator className="text-violet-500 w-6 h-6" />
          <h3 className="text-xl font-bold">{isRTL ? 'حاسبة الاستثمار' : 'Investment Calculator'}</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-4 flex justify-between">
              <span>{isRTL ? 'الاستثمار الشهري' : 'Monthly Investment'}</span>
              <span className="text-violet-500 font-bold">{monthly.toLocaleString()} EGP</span>
            </label>
            <input 
              type="range" min="500" max="50000" step="500"
              value={monthly}
              onChange={e => setMonthly(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-4 flex justify-between">
              <span>{isRTL ? 'عدد السنوات' : 'Years'}</span>
              <span className="text-violet-500 font-bold">{years} {isRTL ? 'سنة' : 'Years'}</span>
            </label>
            <input 
              type="range" min="1" max="30"
              value={years}
              onChange={e => setYears(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-4 flex justify-between">
              <span>{isRTL ? 'العائد السنوي المتوقع' : 'Expected Annual Return'}</span>
              <span className="text-violet-500 font-bold">{rate}%</span>
            </label>
            <input 
              type="range" min="5" max="50"
              value={rate}
              onChange={e => setRate(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-500 uppercase tracking-tighter">
              <span>{isRTL ? 'متحفظ' : 'Conservative'} (15%)</span>
              <span>{isRTL ? 'متوسط' : 'Average'} (25%)</span>
              <span>{isRTL ? 'متفائل' : 'Optimistic'} (40%)</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t dark:border-white/5 border-slate-100">
          <div className="flex items-start gap-3 p-4 bg-violet-500/5 rounded-2xl border border-violet-500/10">
            <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              {isRTL 
                ? 'هذه الأرقام تقديرية بناءً على العوائد التاريخية للبورصة المصرية. الاستثمار يحمل مخاطر وقد تختلف النتائج.'
                : 'These figures are estimates based on historical EGX returns. Investing carries risks and actual results may vary.'}
            </p>
          </div>
        </div>
      </div>

      {/* Results & Chart */}
      <div className="lg:col-span-2 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-base p-6">
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'القيمة النهائية' : 'Final Value'}</h4>
            <p className="text-2xl font-bold text-violet-500">{finalValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">EGP</span></p>
          </div>
          <div className="card-base p-6">
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'إجمالي المستثمر' : 'Total Principal'}</h4>
            <p className="text-2xl font-bold">{totalInvested.toLocaleString()} <span className="text-xs font-normal text-slate-500">EGP</span></p>
          </div>
          <div className="card-base p-6">
            <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'صافي الربح' : 'Net Profit'}</h4>
            <p className="text-2xl font-bold text-emerald-500">+{profit.toLocaleString()} <span className="text-xs font-normal text-slate-500">EGP</span></p>
          </div>
        </div>

        <div className="card-base p-8 h-[400px]">
          <h3 className="text-lg font-bold mb-6">{isRTL ? 'توقعات نمو الثروة' : 'Wealth Growth Projection'}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" dark:stroke="#1e293b" vertical={false} />
              <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
              <ReTooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="total" name={isRTL ? 'إجمالي الثروة' : 'Total Wealth'} stroke="#8b5cf6" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="principal" name={isRTL ? 'رأس المال' : 'Principal'} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
