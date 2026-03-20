import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Blocks in-app navigation and browser tab close when `dirty` is true.
 * Returns the blocker so the caller can render <UnsavedChangesDialog blocker={blocker} />.
 */
export function useUnsavedChanges(dirty: boolean) {
  const blocker = useBlocker(dirty);

  // Warn on tab close / hard refresh
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  return blocker;
}
