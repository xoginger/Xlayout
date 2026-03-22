/**
 * Creado y diseñado por XO
 */

import * as pdfjsLib from 'pdfjs-dist';

// Cargar el worker desde CDN para evitar problemas de compilación en Next.js
// Usamos worker.min.mjs que es estándar para pdfjs-dist >= v4
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractFirstPageAsImage = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Cargar el documento PDF
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Obtener la primera página
  const page = await pdf.getPage(1);
  
  // Escoger una escala suficientemente grande para que no se pixele el fondo
  const viewport = page.getViewport({ scale: 2.5 });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('No se pudo crear contexto 2D para renderizar el PDF');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // @ts-ignore - The types require 'canvas' but 'canvasContext' is the actual property needed
  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;
  
  // Exportar el canvas como textura (Data URL png)
  return canvas.toDataURL('image/png');
};
