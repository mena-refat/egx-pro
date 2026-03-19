import { useSettingsProfile } from './useSettingsProfile';
import { PreferencesTab } from '../profile';

export function PreferencesSettingsTab() {
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
      <PreferencesTab
        user={props.profileUser}
        onUpdateProfile={props.onUpdateProfile}
        onLogout={props.onLogout}
        setRequestStatus={props.setRequestStatus}
      />
    </>
  );
}
