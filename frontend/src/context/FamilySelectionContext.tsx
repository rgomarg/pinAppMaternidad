import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Role } from '../api/forum';

type FamilySelectionContextValue = {
  selectedUserId: number | null;
  // Rol del usuario seleccionado: decide qué pestañas y funciones se muestran.
  // Sin autenticación real es solo visual; el backend vuelve a comprobarlo (AdminGuard).
  selectedUserRole: Role | null;
  isAdmin: boolean;
  setSelectedUserId: (userId: number | null) => void;
  setSelectedUserRole: (role: Role | null) => void;
};

const FamilySelectionContext = createContext<FamilySelectionContextValue | undefined>(undefined);

export function FamilySelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<Role | null>(null);
  const value = useMemo(
    () => ({
      selectedUserId,
      selectedUserRole,
      isAdmin: selectedUserRole === 'ADMIN',
      setSelectedUserId,
      setSelectedUserRole,
    }),
    [selectedUserId, selectedUserRole],
  );

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
