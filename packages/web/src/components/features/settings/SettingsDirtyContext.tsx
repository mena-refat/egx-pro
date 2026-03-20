import React, { createContext, useContext, useCallback, useRef, useState } from 'react';

interface SettingsDirtyContextValue {
  isDirty: boolean;
  markDirty: (id: string) => void;
  clearDirty: (id: string) => void;
  clearAll: () => void;
}

const SettingsDirtyContext = createContext<SettingsDirtyContextValue>({
  isDirty: false,
  markDirty: () => {},
  clearDirty: () => {},
  clearAll: () => {},
});

export function SettingsDirtyProvider({ children }: { children: React.ReactNode }) {
  const dirtyKeysRef = useRef<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback((id: string) => {
    dirtyKeysRef.current.add(id);
    setIsDirty(true);
  }, []);

  const clearDirty = useCallback((id: string) => {
    dirtyKeysRef.current.delete(id);
    setIsDirty(dirtyKeysRef.current.size > 0);
  }, []);

  const clearAll = useCallback(() => {
    dirtyKeysRef.current.clear();
    setIsDirty(false);
  }, []);

  return (
    <SettingsDirtyContext.Provider value={{ isDirty, markDirty, clearDirty, clearAll }}>
      {children}
    </SettingsDirtyContext.Provider>
  );
}

export function useSettingsDirty() {
  return useContext(SettingsDirtyContext);
}
