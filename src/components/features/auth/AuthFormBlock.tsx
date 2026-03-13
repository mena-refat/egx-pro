import React from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { AuthFormData } from '../../../hooks/useAuthPage';

type Props = {
  isLogin: boolean;
  register: UseFormRegister<AuthFormData>;
  errors: FieldErrors<AuthFormData>;
  isSubmitting: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  onSubmit: (e?: React.BaseSyntheticEvent) => void;
  authError: string;
  authMessage: { text: string; type: 'success' | 'error' } | null;
  onGoogleLogin: () => void;
};

export function AuthFormBlock({
  isLogin,
  register,
  errors,
  isSubmitting,
  showPassword,
  onTogglePassword,
  onSubmit,
  authError,
  authMessage,
  onGoogleLogin,
}: Props) {
  const { t } = useTranslation('common');

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <AnimatePresence mode="wait">
        {!isLogin && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Input
              {...register('fullName')}
              label={t('auth.fullName')}
              type="text"
              placeholder="Ahmed Mohamed"
              autoComplete="name"
              disabled={isSubmitting}
              error={errors.fullName?.message}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Input
        {...register('emailOrPhone')}
        label={t('auth.emailOrPhone')}
        type="text"
        autoComplete="username"
        placeholder={t('auth.placeholderEmailPhone')}
        disabled={isSubmitting}
        error={errors.emailOrPhone?.message}
      />
      <div className="relative">
        <Input
          {...register('password')}
          label={t('auth.password')}
          type={showPassword ? 'text' : 'password'}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder="••••••"
          disabled={isSubmitting}
          error={errors.password?.message}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onTogglePassword}
          aria-label={showPassword ? t('auth.hidePassword', { defaultValue: 'إخفاء كلمة المرور' }) : t('auth.showPassword', { defaultValue: 'إظهار كلمة المرور' })}
          className="absolute right-2 top-9 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          {showPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
        </Button>
      </div>
      {authMessage && (
        <p
          role="alert"
          aria-live="polite"
          className={`text-body p-3 rounded-xl border text-center ${
            authMessage.type === 'success'
              ? 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20'
              : 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20'
          }`}
        >
          {authMessage.text}
        </p>
      )}
      {authError && (
        <p role="alert" aria-live="polite" className="text-[var(--danger)] text-body bg-[var(--danger-bg)] p-3 rounded-xl border border-[var(--danger)]/20">
          {authError}
        </p>
      )}
      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={isSubmitting}
        loading={isSubmitting}
        icon={isSubmitting ? undefined : isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
        iconPosition="left"
        className="flex items-center justify-center gap-2"
      >
        {isSubmitting ? t('auth.loading') : isLogin ? t('auth.login') : t('auth.register')}
      </Button>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--bg-primary)] px-2 text-[var(--text-muted)]">{t('auth.or')}</span>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        fullWidth
        size="lg"
        onClick={onGoogleLogin}
        icon={
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        }
        iconPosition="left"
      >
        {t('auth.continueGoogle')}
      </Button>
    </form>
  );
}
