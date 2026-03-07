import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import EmptyState from '../components/shared/EmptyState';
import { Star } from 'lucide-react';

describe('EmptyState', () => {
  it('يعرض العنوان', () => {
    render(<EmptyState icon={Star} title="لا توجد بيانات" />);
    expect(screen.getByText('لا توجد بيانات')).toBeInTheDocument();
  });

  it('يعرض الوصف لو موجود', () => {
    render(<EmptyState icon={Star} title="عنوان" description="وصف تجريبي" />);
    expect(screen.getByText('وصف تجريبي')).toBeInTheDocument();
  });

  it('يخفي الـ action button لو ما فيش onAction', () => {
    render(<EmptyState icon={Star} title="عنوان" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ينادي onAction لما يتضغط', async () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        icon={Star}
        title="عنوان"
        actionLabel="اضغط هنا"
        onAction={handleAction}
      />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(handleAction).toHaveBeenCalledOnce();
  });
});
