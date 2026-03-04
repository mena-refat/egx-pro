import { useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronRight, 
  ChevronLeft, 
  Target, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Wallet, 
  Settings,
  CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const steps = [
  { id: 'level', icon: TrendingUp },
  { id: 'goal', icon: Target },
  { id: 'timeline', icon: Clock },
  { id: 'risk', icon: AlertTriangle },
  { id: 'budget', icon: Wallet },
  { id: 'prefs', icon: Settings },
];

const SECTORS = [
  { id: 'financial', en: 'Financial Services', ar: 'الخدمات المالية (غير المصرفية)' },
  { id: 'real_estate', en: 'Real Estate', ar: 'العقارات' },
  { id: 'basic_resources', en: 'Basic Resources', ar: 'الموارد الأساسية' },
  { id: 'industrial', en: 'Industrial Goods & Services', ar: 'السلع والخدمات الصناعية والسيارات' },
  { id: 'travel', en: 'Travel & Leisure', ar: 'السياحة والترفيه' },
  { id: 'food', en: 'Food & Beverages', ar: 'الأغذية والمشروبات والتبغ' },
  { id: 'healthcare', en: 'Health Care & Pharma', ar: 'الرعاية الصحية والأدوية' },
  { id: 'construction', en: 'Construction & Materials', ar: 'المقاولات والإنشاءات الهندسية' },
  { id: 'household', en: 'Personal & Household Products', ar: 'المنسوجات والسلع المعمرة' },
  { id: 'it', en: 'IT, Media & Communication', ar: 'الاتصالات والتكنولوجيا والإعلام' },
  { id: 'utilities', en: 'Utilities', ar: 'المرافق' },
  { id: 'diversified', en: 'Diversified', ar: 'متنوع' },
  { id: 'unknown', en: "I don't know yet", ar: 'لا أعرف بعد' },
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { i18n } = useTranslation('common');
  const [currentStep, setCurrentStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    level: '',
    goals: [] as string[],
    timeline: 5,
    risk: '',
    budget: 5000,
    sharia: false,
    sectors: [] as string[],
  });

  const isRTL = i18n.language === 'ar';

  const isStepValid = (dataToCheck = formData) => {
    switch (currentStep) {
      case 0: return dataToCheck.level !== '';
      case 1: return dataToCheck.goals.length > 0;
      case 2: return true;
      case 3: return dataToCheck.risk !== '';
      case 4: return true;
      case 5: return dataToCheck.sectors.length > 0;
      default: return true;
    }
  };

  const next = (updatedData?: Partial<typeof formData>) => {
    const dataToCheck = updatedData ? { ...formData, ...updatedData } : formData;
    
    if (!isStepValid(dataToCheck)) {
      setValidationError(isRTL ? 'يرجى اختيار إجابة للمتابعة' : 'Please select an answer to continue');
      return;
    }
    setValidationError(null);
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
    else handleFinish();
  };

  const back = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleFinish = async (isSkipped = false) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
        },
        body: JSON.stringify({
          riskTolerance: isSkipped ? 'moderate' : formData.risk,
          investmentHorizon: isSkipped ? 5 : formData.timeline,
          monthlyBudget: isSkipped ? 0 : formData.budget,
          shariaMode: isSkipped ? false : formData.sharia,
          interestedSectors: isSkipped ? [] : formData.sectors,
          onboardingCompleted: true,
        }),
      });
      if (res.ok) onComplete();
    } catch (err) {
      console.error('Failed to save onboarding', err);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'ما مستواك في الاستثمار؟' : 'What is your investment level?'}</h2>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'beginner', label: isRTL ? '🐣 مبتدئ تماماً' : '🐣 Total Beginner' },
                { id: 'basics', label: isRTL ? '📚 بعرف الأساسيات' : '📚 Know the Basics' },
                { id: 'intermediate', label: isRTL ? '📈 متوسط' : '📈 Intermediate' },
                { id: 'advanced', label: isRTL ? '🎯 متقدم' : '🎯 Advanced' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { 
                    const newLevel = opt.id;
                    setFormData({ ...formData, level: newLevel }); 
                    next({ level: newLevel }); 
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all text-right ${formData.level === opt.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'إيه هدفك من الاستثمار؟' : 'What is your investment goal?'}</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'home', label: isRTL ? '🏠 شراء شقة' : '🏠 Buy a Home' },
                { id: 'car', label: isRTL ? '🚗 شراء سيارة' : '🚗 Buy a Car' },
                { id: 'retirement', label: isRTL ? '👴 تقاعد' : '👴 Retirement' },
                { id: 'education', label: isRTL ? '🎓 تعليم أولاد' : '🎓 Education' },
                { id: 'growth', label: isRTL ? '💰 تنمية مدخرات' : '💰 Wealth Growth' },
                { id: 'travel', label: isRTL ? '✈️ سفر' : '✈️ Travel' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const goals = formData.goals.includes(opt.id) 
                      ? formData.goals.filter(g => g !== opt.id)
                      : [...formData.goals, opt.id];
                    setFormData({ ...formData, goals });
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${formData.goals.includes(opt.id) ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'خلال كام سنة عايز تحقق هدفك؟' : 'In how many years do you want to reach your goal?'}</h2>
            <div className="px-4">
              <input 
                type="range" min="1" max="30" 
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="flex justify-between mt-4 text-slate-400 text-sm">
                <span>1 {isRTL ? 'سنة' : 'Year'}</span>
                <span className="text-violet-400 font-bold text-xl">{formData.timeline} {isRTL ? 'سنة' : 'Years'}</span>
                <span>30 {isRTL ? 'سنة' : 'Years'}</span>
              </div>
              <p className="text-center mt-6 text-slate-400 italic">
                {formData.timeline <= 2 ? (isRTL ? 'قصير الأجل — مخاطرة منخفضة مناسبة' : 'Short term — Low risk suitable') :
                 formData.timeline <= 5 ? (isRTL ? 'متوسط الأجل — توازن نمو وأمان' : 'Medium term — Balance of growth and safety') :
                 (isRTL ? 'طويل الأجل — مناسب لأسهم النمو 🚀' : 'Long term — Suitable for growth stocks 🚀')}
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'لو السهم نزل 30%، إيه اللي هتعمله؟' : 'If a stock drops 30%, what would you do?'}</h2>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'conservative', label: isRTL ? '😰 هبيع فوراً' : '😰 Sell immediately' },
                { id: 'moderate', label: isRTL ? '😐 هستنى وأشوف' : '😐 Wait and see' },
                { id: 'aggressive', label: isRTL ? '😎 فرصة أشتري أكتر' : '😎 Opportunity to buy more' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { 
                    const newRisk = opt.id;
                    setFormData({ ...formData, risk: newRisk }); 
                    next({ risk: newRisk }); 
                  }}
                  className={`p-4 rounded-2xl border-2 transition-all text-right ${formData.risk === opt.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-slate-800/50 hover:border-white/20'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'قدر تستثمر كل شهر؟' : 'How much can you invest monthly?'}</h2>
            <div className="px-4">
              <div className="text-center mb-8">
                <span className="text-4xl font-bold text-violet-400">{formData.budget.toLocaleString()}</span>
                <span className="text-xl ml-2 text-slate-400">{isRTL ? 'جنيه' : 'EGP'}</span>
              </div>
              <input 
                type="range" min="500" max="100000" step="500"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
              <div className="grid grid-cols-3 gap-2 mt-8">
                {[1000, 5000, 10000, 20000, 50000].map(val => (
                  <button 
                    key={val}
                    onClick={() => setFormData({ ...formData, budget: val })}
                    className="py-2 bg-slate-800 rounded-xl text-sm hover:bg-slate-700 transition-colors"
                  >
                    {val >= 1000 ? `${val/1000}k` : val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center">{isRTL ? 'التفضيلات' : 'Preferences'}</h2>
            <div className="space-y-4">
              <button
                onClick={() => setFormData({ ...formData, sharia: !formData.sharia })}
                className={`w-full p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${formData.sharia ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-slate-800/50'}`}
              >
                <span>{isRTL ? 'تفضل استثمار متوافق مع الشريعة؟' : 'Prefer Sharia-compliant investments?'}</span>
                {formData.sharia && <CheckCircle2 className="text-emerald-500" />}
              </button>
              
              <div className="pt-4">
                <p className="text-sm text-slate-400 mb-3">{isRTL ? 'إيه القطاعات اللي تهمك؟' : 'Which sectors interest you?'}</p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-800/30 rounded-xl">
                  {SECTORS.map(sector => (
                    <button
                      key={sector.id}
                      onClick={() => {
                        const sectors = formData.sectors.includes(sector.id)
                          ? formData.sectors.filter(s => s !== sector.id)
                          : [...formData.sectors, sector.id];
                        setFormData({ ...formData, sectors });
                      }}
                      className={`px-4 py-2 rounded-full text-xs border transition-all ${formData.sectors.includes(sector.id) ? 'bg-violet-500 border-violet-500 text-white' : 'bg-slate-800 border-white/10 text-slate-400 hover:border-white/20'}`}
                    >
                      {isRTL ? sector.ar : sector.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-violet-500 w-6 h-6" />
            <span className="font-bold text-lg">EGX Pro</span>
          </div>
          <button 
            onClick={() => handleFinish(true)}
            className="text-sm text-slate-500 hover:text-white transition-colors"
          >
            {isRTL ? 'تخطي' : 'Skip'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {steps.map((step, i) => (
            <div 
              key={step.id} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-violet-500' : 'bg-slate-800'}`}
            />
          ))}
        </div>

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
          className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl min-h-[450px] flex flex-col"
        >
          <div className="flex-1">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-violet-500/10 rounded-2xl">
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="w-8 h-8 text-violet-500" />;
                })()}
              </div>
            </div>
            {renderStep()}
          </div>

          <div className="flex justify-between mt-12 pt-8 border-t border-white/5">
            <button
              onClick={back}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              {isRTL ? 'السابق' : 'Back'}
            </button>
            <div className="flex flex-col items-end gap-2">
              {validationError && <p className="text-red-500 text-sm">{validationError}</p>}
              <button
                onClick={next}
                className="flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-bold shadow-lg shadow-violet-600/20 transition-all active:scale-95"
              >
                {currentStep === steps.length - 1 ? (isRTL ? 'إنهاء' : 'Finish') : (isRTL ? 'التالي' : 'Next')}
                {currentStep !== steps.length - 1 && (isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />)}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
