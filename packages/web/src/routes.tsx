import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import PageLoader from './components/shared/PageLoader';
import {
  DashboardSkeleton,
  PortfolioSkeleton,
  MarketSkeleton,
  StocksSkeleton,
  StockDetailSkeleton,
  GoalsSkeleton,
  ProfileSkeleton,
  PredictionsSkeleton,
  AIPageSkeleton,
  DiscoverSkeleton,
  CalculatorSkeleton,
  UsernameSetupSkeleton,
  SettingsSkeleton,
} from './components/skeletons';

const DashboardPage          = lazy(() => import('./pages/DashboardPage'));

const SettingsLayout          = lazy(() => import('./components/layout/SettingsLayout'));
const AccountSettingsTab      = lazy(() => import('./components/features/settings/AccountSettingsTab').then(m => ({ default: m.AccountSettingsTab })));
const SecuritySettingsTab     = lazy(() => import('./components/features/settings/SecuritySettingsTab').then(m => ({ default: m.SecuritySettingsTab })));
const PreferencesSettingsTab  = lazy(() => import('./components/features/settings/PreferencesSettingsTab').then(m => ({ default: m.PreferencesSettingsTab })));
const SubscriptionTab         = lazy(() => import('./components/features/settings/SubscriptionTab').then(m => ({ default: m.SubscriptionTab })));
const DangerSettingsTab       = lazy(() => import('./components/features/settings/DangerSettingsTab').then(m => ({ default: m.DangerSettingsTab })));

const PortfolioTracker       = lazy(() => import('./components/features/portfolio/PortfolioTracker'));
const PortfolioOrdersPage    = lazy(() => import('./pages/PortfolioOrdersPage'));
const StockScreener          = lazy(() => import('./components/features/stocks/StockScreener'));
const MarketPage             = lazy(() => import('./pages/MarketPage'));
const GoalsPage              = lazy(() => import('./pages/GoalsPage'));
const InvestmentCalculator   = lazy(() => import('./components/features/calculator/InvestmentCalculator'));
const StockDetailPage        = lazy(() => import('./pages/StockDetailPage'));
const ProfilePage            = lazy(() => import('./components/features/profile/ProfilePage'));
const UsernameSetupPage      = lazy(() => import('./pages/UsernameSetupPage'));
const SocialProfilePage      = lazy(() => import('./pages/SocialProfilePage'));
const DiscoverPage           = lazy(() => import('./pages/DiscoverPage'));
const PredictionsPage        = lazy(() => import('./pages/PredictionsPage'));
const AIPage                 = lazy(() => import('./pages/AIPage'));
const AIAnalyzePage          = lazy(() => import('./pages/AIAnalyzePage'));
const AIComparePage          = lazy(() => import('./pages/AIComparePage'));
const AIRecommendationsPage  = lazy(() => import('./pages/AIRecommendationsPage'));
const SupportPage            = lazy(() => import('./pages/SupportPage'));
const BannedPage             = lazy(() => import('./pages/BannedPage'));

interface AppRoutesProps {
  currentWealth: number;
}

export function AppRoutes({ currentWealth }: AppRoutesProps) {
  return (
    <Routes>
      <Route path="/" element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense></ErrorBoundary>} />
      <Route path="/dashboard" element={<ErrorBoundary><Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense></ErrorBoundary>} />
      <Route path="/portfolio" element={<ErrorBoundary><Suspense fallback={<PortfolioSkeleton />}><PortfolioTracker /></Suspense></ErrorBoundary>} />
      <Route path="/portfolio/orders" element={<ErrorBoundary><Suspense fallback={<PortfolioSkeleton />}><PortfolioOrdersPage /></Suspense></ErrorBoundary>} />
      <Route path="/stocks" element={<ErrorBoundary><Suspense fallback={<StocksSkeleton />}><StockScreener /></Suspense></ErrorBoundary>} />
      <Route path="/stocks/:ticker" element={<ErrorBoundary><Suspense fallback={<StockDetailSkeleton />}><StockDetailPage /></Suspense></ErrorBoundary>} />
      <Route path="/market" element={<ErrorBoundary><Suspense fallback={<MarketSkeleton />}><MarketPage /></Suspense></ErrorBoundary>} />
      <Route path="/calculator" element={<ErrorBoundary><Suspense fallback={<CalculatorSkeleton />}><InvestmentCalculator /></Suspense></ErrorBoundary>} />
      <Route path="/goals" element={<ErrorBoundary><Suspense fallback={<GoalsSkeleton />}><GoalsPage currentWealth={currentWealth} /></Suspense></ErrorBoundary>} />

      <Route path="/settings" element={<ErrorBoundary><Suspense fallback={<SettingsSkeleton />}><SettingsLayout /></Suspense></ErrorBoundary>}>
        <Route index element={null} />
        <Route path="account"      element={<Suspense fallback={<div />}><AccountSettingsTab /></Suspense>} />
        <Route path="security"     element={<Suspense fallback={<div />}><SecuritySettingsTab /></Suspense>} />
        <Route path="preferences"  element={<Suspense fallback={<div />}><PreferencesSettingsTab /></Suspense>} />
        <Route path="subscription" element={<Suspense fallback={<div />}><SubscriptionTab /></Suspense>} />
        <Route path="danger"       element={<Suspense fallback={<div />}><DangerSettingsTab /></Suspense>} />
        {/* Redirects for old/moved routes */}
        <Route path="notifications" element={<Navigate to="/settings/preferences"              replace />} />
        <Route path="perks"         element={<Navigate to="/settings/subscription"             replace />} />
        <Route path="overview"      element={<Navigate to="/settings/subscription"             replace />} />
        <Route path="investor"      element={<Navigate to="/profile?tab=investor"             replace />} />
        <Route path="referral"      element={<Navigate to="/profile?tab=referral"              replace />} />
        <Route path="referrals"     element={<Navigate to="/profile?tab=referral"              replace />} />
        <Route path="achievements"  element={<Navigate to="/profile?tab=achievements"          replace />} />
      </Route>

      <Route path="/profile" element={<ErrorBoundary><Suspense fallback={<ProfileSkeleton />}><ProfilePage /></Suspense></ErrorBoundary>} />
      <Route path="/profile/:username" element={<ErrorBoundary><Suspense fallback={<ProfileSkeleton />}><SocialProfilePage /></Suspense></ErrorBoundary>} />
      <Route path="/setup-username" element={<ErrorBoundary><Suspense fallback={<UsernameSetupSkeleton />}><UsernameSetupPage /></Suspense></ErrorBoundary>} />
      <Route path="/discover" element={<ErrorBoundary><Suspense fallback={<DiscoverSkeleton />}><DiscoverPage /></Suspense></ErrorBoundary>} />
      <Route path="/predictions" element={<ErrorBoundary><Suspense fallback={<PredictionsSkeleton />}><PredictionsPage /></Suspense></ErrorBoundary>} />
      <Route path="/ai" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIPage /></Suspense></ErrorBoundary>} />
      <Route path="/ai/analyze" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIAnalyzePage /></Suspense></ErrorBoundary>} />
      <Route path="/ai/compare" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIComparePage /></Suspense></ErrorBoundary>} />
      <Route path="/ai/recommendations" element={<ErrorBoundary><Suspense fallback={<AIPageSkeleton />}><AIRecommendationsPage /></Suspense></ErrorBoundary>} />
      <Route path="/support" element={<ErrorBoundary><Suspense fallback={<PageLoader />}><SupportPage /></Suspense></ErrorBoundary>} />
      <Route path="/banned" element={<Suspense fallback={<PageLoader />}><BannedPage /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
