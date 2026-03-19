import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PredictionCard } from '../components/features/predictions/PredictionCard';
import type { FeedPrediction } from '../store/usePredictionsStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
}));

const mockPrediction: FeedPrediction = {
  id: 'pred-1',
  userId: 'user-1',
  ticker: 'COMI',
  direction: 'UP',
  targetPrice: 25,
  priceAtCreation: 20,
  timeframe: 'WEEK',
  reason: 'تحسن الأرباح',
  status: 'ACTIVE',
  pointsEarned: null,
  accuracyPct: null,
  resolvedPrice: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  resolvedAt: null,
  isPublic: true,
  likeCount: 5,
  isLikedByMe: false,
  user: { id: 'user-1', username: 'trader', avatarUrl: null },
};

describe('PredictionCard', () => {
  it('renders UP indicator and ticker', () => {
    render(
      <MemoryRouter>
        <PredictionCard prediction={mockPrediction} />
      </MemoryRouter>
    );
    expect(screen.getByText('COMI')).toBeInTheDocument();
  });

  it('renders reason when provided', () => {
    render(
      <MemoryRouter>
        <PredictionCard prediction={mockPrediction} />
      </MemoryRouter>
    );
    expect(screen.getByText(/تحسن الأرباح/)).toBeInTheDocument();
  });

  it('calls onLike when like button is clicked', async () => {
    const onLike = vi.fn();
    render(
      <MemoryRouter>
        <PredictionCard prediction={mockPrediction} showLikeButton onLike={onLike} />
      </MemoryRouter>
    );
    const likeBtn = screen.getByRole('button');
    await userEvent.click(likeBtn);
    expect(onLike).toHaveBeenCalled();
  });

  it('renders DOWN direction card', () => {
    const downPrediction: FeedPrediction = {
      ...mockPrediction,
      id: 'pred-2',
      direction: 'DOWN',
      reason: 'هبوط متوقع',
    };
    render(
      <MemoryRouter>
        <PredictionCard prediction={downPrediction} />
      </MemoryRouter>
    );
    expect(screen.getByText('COMI')).toBeInTheDocument();
    expect(screen.getByText(/هبوط متوقع/)).toBeInTheDocument();
  });
});
