import { useUsernameSetup } from '../hooks/useUsernameSetup';
import { UsernameSetupForm } from '../components/features/settings/UsernameSetupForm';

export default function UsernameSetupPage() {
  const {
    value,
    status,
    message,
    saving,
    formatError,
    USERNAME_MAX_LENGTH,
    onChange,
    onSubmit,
  } = useUsernameSetup();

  return (
    <UsernameSetupForm
      value={value}
      maxLength={USERNAME_MAX_LENGTH}
      status={status}
      formatError={formatError}
      message={message}
      saving={saving}
      onChange={onChange}
      onSubmit={onSubmit}
    />
  );
}
