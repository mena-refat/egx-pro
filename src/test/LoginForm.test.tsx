import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { AuthFormBlock } from '../components/features/auth/AuthFormBlock';
import { useForm } from 'react-hook-form';
import type { AuthFormData } from '../hooks/useAuthPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
}));

function LoginFormWrapper() {
  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormData>({
    defaultValues: { emailOrPhone: '', password: '' },
  });
  return (
    <AuthFormBlock
      isLogin
      register={register}
      errors={errors}
      isSubmitting={false}
      showPassword={false}
      onTogglePassword={() => {}}
      onSubmit={vi.fn()}
      authError=""
      authMessage={null}
      onGoogleLogin={vi.fn()}
    />
  );
}

describe('LoginForm (AuthFormBlock)', () => {
  it('renders email and password inputs', () => {
    render(<LoginFormWrapper />);
    expect(screen.getByLabelText('auth.emailOrPhone')).toBeInTheDocument();
    expect(screen.getByLabelText('auth.password')).toBeInTheDocument();
  });

  it('submit button is not disabled when not submitting', () => {
    render(<LoginFormWrapper />);
    const submit = screen.getByRole('button', { name: 'auth.login' });
    expect(submit).not.toBeDisabled();
  });

  it('shows authError when provided', () => {
    function FormWithError() {
      const { register, formState: { errors } } = useForm<AuthFormData>();
      return (
        <AuthFormBlock
          isLogin
          register={register}
          errors={errors}
          isSubmitting={false}
          showPassword={false}
          onTogglePassword={() => {}}
          onSubmit={vi.fn()}
          authError="Invalid credentials"
          authMessage={null}
          onGoogleLogin={vi.fn()}
        />
      );
    }
    render(<FormWithError />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});
