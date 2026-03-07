import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, FileQuestion, ShieldOff, ServerCrash, LockKeyhole, ArrowRight, RefreshCw, LogIn } from 'lucide-react';

type ErrorCode = 401 | 403 | 404 | 500;

interface ErrorPageProps {
  code: ErrorCode;
  onPrimaryAction?: () => void;
}

const iconMap: Record<ErrorCode, React.ComponentType<{ className?: string }>> = {
  404: FileQuestion,
  403: ShieldOff,
  500: ServerCrash,
  401: LockKeyhole,
};

const actionIconMap: Record<ErrorCode, React.ComponentType<{ className?: string }>> = {
  404: ArrowRight,
  403: ArrowRight,
  500: RefreshCw,
  401: LogIn,
};

export function ErrorPage({ code, onPrimaryAction }: ErrorPageProps) {
  const { t, i18n } = useTranslation('common');

  const Icon = iconMap[code];
  const ActionIcon = actionIconMap[code];

  const titleKey =
    code === 404
      ? 'error.404.title'
      : code === 403
      ? 'error.403.title'
      : code === 500
      ? 'error.500.title'
      : 'error.401.title';

  const descriptionKey =
    code === 404
      ? 'error.404.description'
      : code === 403
      ? 'error.403.description'
      : code === 500
      ? 'error.500.description'
      : 'error.401.description';

  const buttonKey =
    code === 404
      ? 'error.404.action'
      : code === 403
      ? 'error.403.action'
      : code === 500
      ? 'error.500.action'
      : 'error.401.action';

  const handlePrimary = () => {
    if (onPrimaryAction) {
      onPrimaryAction();
    } else {
      // Default behavior: for 404/403/500 العودة للرئيسية، لـ 401 إلى شاشة الدخول
      if (code === 401) {
        window.location.href = '/';
      } else {
        window.location.href = '/';
      }
    }
  };

  const isRtl = i18n.language.startsWith('ar');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-violet-500 w-7 h-7" />
          <span className="text-xl font-bold tracking-tight">EGX Pro</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10 px-4 py-1 text-xs font-semibold text-violet-200 mb-2">
            {t('error.label', 'حدث خطأ')}
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/40 flex items-center justify-center">
                <Icon className="w-10 h-10 text-violet-300" />
              </div>
              <span className="absolute -bottom-3 inset-x-0 text-xs text-slate-400">
                {t('error.codeLabel', { code })}
              </span>
            </div>

            <div>
              <p className="text-6xl font-extrabold tracking-tight text-violet-500 mb-2">
                {code}
              </p>
              <h1 className="text-2xl font-bold mb-2">{t(titleKey)}</h1>
              <p className="text-slate-300 text-sm leading-relaxed">{t(descriptionKey)}</p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrimary}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 hover:bg-violet-400 text-white px-6 py-3 text-sm font-semibold shadow-lg shadow-violet-500/30 transition-colors"
              >
                {isRtl ? (
                  <>
                    <span>{t(buttonKey)}</span>
                    <ActionIcon className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <ActionIcon className="w-4 h-4" />
                    <span>{t(buttonKey)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

