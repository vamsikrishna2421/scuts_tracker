import React, { createContext, useCallback, useContext, useState } from 'react';

export type TabKey = 'today' | 'partners' | 'log' | 'assistant' | 'settings';

export type Overlay =
  | { kind: 'partnerDetail'; partnerId: string }
  | { kind: 'log'; partnerId?: string };

interface NavValue {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  stack: Overlay[];
  push: (o: Overlay) => void;
  pop: () => void;
  popToRoot: () => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>('today');
  const [stack, setStack] = useState<Overlay[]>([]);

  const push = useCallback((o: Overlay) => setStack((s) => [...s, o]), []);
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const popToRoot = useCallback(() => setStack([]), []);

  return (
    <NavContext.Provider value={{ tab, setTab, stack, push, pop, popToRoot }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
