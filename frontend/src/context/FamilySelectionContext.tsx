import React, { createContext, useContext, useMemo, useState } from 'react';

type FamilySelectionContextValue = {
  selectedUserId: number | null;
  setSelectedUserId: (userId: number | null) => void;
};

const FamilySelectionContext = createContext<FamilySelectionContextValue | undefined>(undefined);

export function FamilySelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const value = useMemo(() => ({ selectedUserId, setSelectedUserId }), [selectedUserId]);

  return (
    <FamilySelectionContext.Provider value={value}>
      {children}
    </FamilySelectionContext.Provider>
  );
}

export function useFamilySelection() {
  const context = useContext(FamilySelectionContext);
  if (!context) {
    throw new Error('useFamilySelection must be used inside FamilySelectionProvider');
  }
  return context;
}
