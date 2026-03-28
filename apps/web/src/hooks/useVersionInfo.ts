/**
 * Creado y diseñado por XO
 */

import { useState, useEffect } from 'react';

// Modelo de datos del endpoint de versión
export interface VersionInfo {
  version: string;
  commit: string;
  buildDate: string;
}

/**
 * Hook para obtener la información de versión del build activo.
 * Consulta /api/platform/info/version de forma silenciosa.
 * Si el endpoint falla, retorna null sin bloquear el render del editor.
 */
export function useVersionInfo(): VersionInfo | null {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    // Petición única al montar — los datos de versión nunca cambian en runtime
    fetch('/api/platform/info/version')
      .then((res) => {
        // Validar que la respuesta sea JSON exitosa antes de parsear
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: VersionInfo) => setInfo(data))
      .catch(() => {
        // Error silencioso — el indicador de versión no es crítico para el editor
      });
  }, []);

  return info;
}
