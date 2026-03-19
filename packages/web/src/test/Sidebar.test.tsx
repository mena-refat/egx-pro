import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {},
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Sidebar', () => {
  it('renders all nav items when not collapsed', () => {
    render(
      <MemoryRouter>
        <Sidebar activeRoute="/" collapsed={false} onToggle={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
    expect(screen.getByText('nav.portfolio')).toBeInTheDocument();
    expect(screen.getByText('nav.stocks')).toBeInTheDocument();
    expect(screen.getByText('nav.goals')).toBeInTheDocument();
    expect(screen.getByText('nav.predictions')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(
      <MemoryRouter>
        <Sidebar activeRoute="/portfolio" collapsed={false} onToggle={() => {}} />
      </MemoryRouter>
    );
    const portfolioBtn = screen.getByText('nav.portfolio').closest('button');
    expect(portfolioBtn).toHaveClass('bg-[var(--brand)]');
  });

  it('calls onToggle when collapse button clicked', async () => {
    const onToggle = vi.fn();
    render(
      <MemoryRouter>
        <Sidebar activeRoute="/" collapsed={false} onToggle={onToggle} />
      </MemoryRouter>
    );
    const toggleBtn = screen.getByLabelText('nav.collapseSidebar');
    await userEvent.click(toggleBtn);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
