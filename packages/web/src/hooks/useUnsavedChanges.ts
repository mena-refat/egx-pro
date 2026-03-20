import { useEffect, useId } from 'react';
import { useSettingsDirty } from '../components/features/settings/SettingsDirtyContext';

/**
 * Registers dirty state in the nearest SettingsDirtyProvider.
 * Also warns on browser tab close / hard refresh when dirty.
 */
export function useUnsavedChanges(dirty: boolean) {
  const id = useId();
  const { markDirty, clearDirty } = useSettingsDirty();

  useEffect(() => {
    if (dirty) {
      markDirty(id);
    } else {
      clearDirty(id);
    }
    return () => clearDirty(id);
  }, [dirty, id, markDirty, clearDirty]);

  // Warn on tab close / hard refresh
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
