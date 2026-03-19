import { useSettingsProfile } from './useSettingsProfile';
import { AccountTab } from '../profile';

export function AccountSettingsTab() {
  const props = useSettingsProfile();
  if (!props.profileUser) return null;
  return (
    <>
      {props.requestStatus && (
        <div
          className={`p-3 rounded-xl text-sm mb-4 ${
            props.requestStatus.type === 'success'
              ? 'bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success)]'
              : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]'
          }`}
        >
          {props.requestStatus.message}
        </div>
      )}
      <AccountTab
        user={props.profileUser}
        onUpdateProfile={props.onUpdateProfile}
        onLogout={props.onLogout}
        setRequestStatus={props.setRequestStatus}
      />
    </>
  );
}
