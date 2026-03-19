import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PageLoader from '../components/shared/PageLoader';

describe('PageLoader', () => {
  it('يعرض الـ spinner', () => {
    render(<PageLoader />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
