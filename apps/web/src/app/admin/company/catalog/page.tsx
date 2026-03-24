/**
 * Creado y diseñado por XO
 */

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirige automáticamente a la sub-sección de productos
export default function CatalogIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/company/catalog/products');
  }, [router]);

  return null;
}
