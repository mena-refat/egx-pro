import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from '../components/shared/ToastContainer';
import { useToastStore } from '../store/toastStore';

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('renders toast when added to store', () => {
    useToastStore.getState().addToast({
      message: 'تم الحفظ بنجاح',
      variant: 'success',
      duration: 0,
    });
    render(<ToastContainer />);
    expect(screen.getByText('تم الحفظ بنجاح')).toBeInTheDocument();
  });

  it('dismisses toast when close button clicked', async () => {
    useToastStore.getState().addToast({
      message: 'رسالة تجريبية',
      variant: 'default',
      duration: 0,
    });
    render(<ToastContainer />);
    expect(screen.getByText('رسالة تجريبية')).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByText('رسالة تجريبية')).not.toBeInTheDocument();
    });
  });

  it('has role alert for toasts', () => {
    useToastStore.getState().addToast({
      message: 'تنبيه',
      variant: 'warning',
      duration: 0,
    });
    render(<ToastContainer />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
