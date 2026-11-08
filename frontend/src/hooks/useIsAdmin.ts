import { useEffect, useState } from 'react';
import { request, type Role } from '../api/forum';

// Indica si el usuario seleccionado en la pestaña Datos tiene rol ADMIN.
// Sin autenticación real, solo sirve para mostrar u ocultar las funciones de
// moderación; el backend vuelve a comprobar el rol en cada acción (AdminGuard).
export function useIsAdmin(userId: number | null) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    request<{ role: Role } | null>(`/user/${userId}`)
      .then((user) => !cancelled && setIsAdmin(user?.role === 'ADMIN'))
      .catch(() => !cancelled && setIsAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}
