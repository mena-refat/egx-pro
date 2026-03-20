import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import PageLoader from './components/shared/PageLoader';
import DashboardPage from './pages/DashboardPage';
import {
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
} from './components/skeletons';
import {
  SubscriptionTab,
  InvestorProfileTab,
  AccountSettingsTab,
  SecuritySettingsTab,
  PreferencesSettingsTab,
  DangerSettingsTab,
} from './components/features/settings';
import SettingsLayout from './components/layout/SettingsLayout';

const PortfolioTracker       = lazy(() => import('./components/features/portfolio/PortfolioTracker'));
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
      <Route path="/" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
      <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
      <Route path="/portfolio" element={<ErrorBoundary><Suspense fallback={<PortfolioSkeleton />}><PortfolioTracker /></Suspense></ErrorBoundary>} />
      <Route path="/stocks" element={<ErrorBoundary><Suspense fallback={<StocksSkeleton />}><StockScreener /></Suspense></ErrorBoundary>} />
      <Route path="/stocks/:ticker" element={<ErrorBoundary><Suspense fallback={<StockDetailSkeleton />}><StockDetailPage /></Suspense></ErrorBoundary>} />
      <Route path="/market" element={<ErrorBoundary><Suspense fallback={<MarketSkeleton />}><MarketPage /></Suspense></ErrorBoundary>} />
      <Route path="/calculator" element={<ErrorBoundary><Suspense fallback={<CalculatorSkeleton />}><InvestmentCalculator /></Suspense></ErrorBoundary>} />
      <Route path="/goals" element={<ErrorBoundary><Suspense fallback={<GoalsSkeleton />}><GoalsPage currentWealth={currentWealth} /></Suspense></ErrorBoundary>} />

      <Route path="/settings" element={<ErrorBoundary><SettingsLayout /></ErrorBoundary>}>
        <Route index element={null} />
        <Route path="account"      element={<AccountSettingsTab />} />
        <Route path="security"     element={<SecuritySettingsTab />} />
        <Route path="preferences"  element={<PreferencesSettingsTab />} />
        <Route path="investor"     element={<InvestorProfileTab />} />
        <Route path="subscription" element={<SubscriptionTab />} />
        <Route path="danger"       element={<DangerSettingsTab />} />
        {/* Redirects for old/moved routes */}
        <Route path="notifications" element={<Navigate to="/settings/preferences"              replace />} />
        <Route path="perks"         element={<Navigate to="/settings/subscription"             replace />} />
        <Route path="overview"      element={<Navigate to="/settings/subscription"             replace />} />
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
