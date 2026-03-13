import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPortfolioHero } from '../components/features/dashboard/DashboardPortfolioHero';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
}));

describe('DashboardPortfolioHero', () => {
  it('shows loading skeleton when loading', () => {
    render(
      <DashboardPortfolioHero
        totalInvested={0}
        totalValue={0}
        totalGain={0}
        gainPercent={0}
        loading
        error={null}
      />
    );
    const skeletons = document.querySelectorAll('.skeleton-shimmer');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows error message when error is set', () => {
    render(
      <DashboardPortfolioHero
        totalInvested={0}
        totalValue={0}
        totalGain={0}
        gainPercent={0}
        loading={false}
        error="فشل التحميل"
      />
    );
    expect(screen.getByText('فشل التحميل')).toBeInTheDocument();
  });

  it('shows profit with positive styling when totalGain > 0', () => {
    render(
      <DashboardPortfolioHero
        totalInvested={10000}
        totalValue={12000}
        totalGain={2000}
        gainPercent={20}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText(/\+2,000/)).toBeInTheDocument();
    expect(screen.getByText(/\+20\.00%/)).toBeInTheDocument();
  });

  it('shows loss with negative styling when totalGain < 0', () => {
    render(
      <DashboardPortfolioHero
        totalInvested={10000}
        totalValue={8000}
        totalGain={-2000}
        gainPercent={-20}
        loading={false}
        error={null}
      />
    );
    expect(screen.getByText(/-2,000/)).toBeInTheDocument();
    expect(screen.getByText(/-20\.00%/)).toBeInTheDocument();
  });
});
