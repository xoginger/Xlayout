import { ToolType } from '@/store/editor-store';
import React from 'react';

export interface EditorToolConfig {
  id: ToolType;
  label: string;
  shortcut?: string;
  description: string;
  group: 'select' | 'creation2d' | 'modification3d' | 'construction' | 'system';
  defaultOrder: number;
}

export const EDITOR_TOOLS_META: EditorToolConfig[] = [
  // SELECT
  { id: 'select', label: 'Seleccionar', shortcut: 'V', description: 'Selecciona objetos, caras y aristas.', group: 'select', defaultOrder: 10 },
  
  // CREATION 2D
  { id: 'line', label: 'Línea', shortcut: 'L', description: 'Dibuja aristas y líneas profesionales.', group: 'creation2d', defaultOrder: 20 },
  { id: 'rectangle', label: 'Rectángulo', shortcut: 'R', description: 'Crea superficies rectangulares.', group: 'creation2d', defaultOrder: 21 },
  { id: 'circle', label: 'Círculo', shortcut: 'C', description: 'Dibuja círculos (centro + radio).', group: 'creation2d', defaultOrder: 22 },
  { id: 'arc', label: 'Arco', shortcut: 'A', description: 'Arcos de 2 puntos con control de curvatura.', group: 'creation2d', defaultOrder: 23 },
  { id: 'freehand', label: 'Mano Alzada', shortcut: 'F', description: 'Dibuja polilíneas suaves personalizadas.', group: 'creation2d', defaultOrder: 24 },
  { id: 'wall', label: 'Muro', shortcut: 'W', description: 'Construye muros estructurales.', group: 'creation2d', defaultOrder: 25 },
  
  // MODIFICATION 3D
  { id: 'extrude', label: 'Empujar / Tirar', shortcut: 'P', description: 'Extruye caras para crear volúmenes.', group: 'modification3d', defaultOrder: 30 },
  { id: 'move', label: 'Mover', shortcut: 'M', description: 'Traslada objetos (Ctrl para copiar).', group: 'modification3d', defaultOrder: 31 },
  { id: 'rotate', label: 'Rotar', shortcut: 'Q', description: 'Rota sobre un punto de pivote.', group: 'modification3d', defaultOrder: 32 },
  { id: 'scale', label: 'Escala', shortcut: 'S', description: 'Redimensiona con manejadores profesionales.', group: 'modification3d', defaultOrder: 33 },
  { id: 'offset', label: 'Equidistancia', shortcut: 'O', description: 'Crea copias paralelas de aristas/caras.', group: 'modification3d', defaultOrder: 34 },
  { id: 'follow-me', label: 'Sígueme', shortcut: 'X', description: 'Extruye un perfil a lo largo de una ruta.', group: 'modification3d', defaultOrder: 35 },
  
  // CONSTRUCTION & TOOLS
  { id: 'tape', label: 'Flexómetro', shortcut: 'T', description: 'Mide distancias y crea guías.', group: 'construction', defaultOrder: 40 },
  { id: 'dimension', label: 'Acotación', shortcut: 'D', description: 'Coloca medidas lineales permanentes.', group: 'construction', defaultOrder: 41 },
  { id: 'paint', label: 'Pintar', shortcut: 'B', description: 'Aplica materiales y colores.', group: 'construction', defaultOrder: 42 },
  { id: 'eraser', label: 'Borrador', shortcut: 'E', description: 'Elimina aristas y caras.', group: 'construction', defaultOrder: 43 },
  
  // DEPRECATED or BACKGROUND
  { id: 'scale-blueprint', label: 'Calibrar plano', shortcut: 'K', description: 'Ajusta la escala real del blueprint de fondo.', group: 'system', defaultOrder: 90 },
];
