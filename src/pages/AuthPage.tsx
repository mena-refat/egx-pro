import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthPage } from '../hooks/useAuthPage';
import { AuthBranding } from '../components/features/auth/AuthBranding';
import { AuthCardTabs } from '../components/features/auth/AuthCardTabs';
import { AuthTwoFactorStep } from '../components/features/auth/AuthTwoFactorStep';
import { AuthFormBlock } from '../components/features/auth/AuthFormBlock';
import { AuthLangSwitcher } from '../components/features/auth/AuthLangSwitcher';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') ?? '';
  const { i18n } = useTranslation('common');

  const {
    isLogin,
    showPassword,
    setShowPassword,
    showTwoFactorInput,
    twoFactorOtp,
    setTwoFactorOtp,
    authError,
    authMessage,
    form,
    onSubmit,
    handleTwoFactorComplete,
    handleGoogleLogin,
    switchToLogin,
    switchToRegister,
    clearTwoFactor,
  } = useAuthPage(refCode);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = form;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 font-sans text-[var(--text-primary)]">
      <div className="w-full max-w-md">
        <AuthBranding />

        <motion.div layout className="bg-[var(--bg-card)] border border-[var(--border)] rounded-3xl p-8 shadow-[var(--shadow-xl)] card-elevated">
          <AuthCardTabs isLogin={isLogin} onLogin={switchToLogin} onRegister={switchToRegister} />

          {showTwoFactorInput ? (
            <AuthTwoFactorStep
              value={twoFactorOtp}
              onChange={setTwoFactorOtp}
              onComplete={handleTwoFactorComplete}
              onBack={clearTwoFactor}
              error={authError || null}
            />
          ) : (
            <AuthFormBlock
              isLogin={isLogin}
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onSubmit={handleSubmit(onSubmit)}
              authError={authError}
              authMessage={authMessage}
              onGoogleLogin={handleGoogleLogin}
            />
          )}

          <AuthLangSwitcher onChangeLanguage={(lng) => i18n.changeLanguage(lng)} />
        </motion.div>
      </div>
    </div>
  );
}
