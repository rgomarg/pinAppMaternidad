import { useState, useEffect, useCallback } from 'react';
import { GrowthData, Sex, fetchGrowth, updateChildSex } from '../api/growth';

// Carga las mediciones del menor sobre las curvas de la OMS.
// Se recarga cuando cambia el objeto `child` (al cambiar de menor o tras añadir una medición,
// HomeScreen vuelve a pedir los hijos y el objeto es nuevo).
export function useGrowth(child?: { id: number } | null) {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!child) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGrowth(child.id)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e) => {
        console.error('Error fetching growth:', e);
        if (!cancelled) setError('No se pudo cargar la curva de crecimiento');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [child]);

  const setSex = useCallback(async (sex: Sex) => {
    if (!child) return;
    try {
      setData(await updateChildSex(child.id, sex));
    } catch (e) {
      console.error('Error updating sex:', e);
      setError('No se pudo guardar el sexo');
    }
  }, [child]);

  return { data, loading, error, setSex };
}
