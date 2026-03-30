/**
 * Creado y diseñado por XO
 */

import { useMemo } from 'react';
import { useEditorStore, SceneItem, Wall, DimensionLine, Opening, LineEntity, RectangleEntity, FaceEntity, VolumeEntity } from '@/store/editor-store';
import { calculateDistance } from '@/utils/cad-math';

/**
 * Datos contextuales de la selección actual.
 * Concentra toda la lógica de resolución en un solo lugar
 * para reutilizar en inspector flotante, panel derecho, etc.
 */
export interface SelectionContext {
  /** ¿Hay algo seleccionado? */
  hasSelection: boolean;
  /** ¿Es selección múltiple? */
  isMulti: boolean;
  /** Cantidad de elementos seleccionados */
  count: number;
  /** Tipo del elemento seleccionado (solo en selección única) */
  type: string | null;
  /** Nombre legible del tipo */
  typeLabel: string;
  /** Nombre/etiqueta del elemento */
  label: string;
  /** ID principal (solo selección única) */
  id: string | null;
  /** Elemento resuelto para acceso rápido */
  item: SceneItem | null;
  wall: Wall | null;
  dimension: DimensionLine | null;
  opening: Opening | null;
  line: LineEntity | null;
  rectangle: RectangleEntity | null;
  face: FaceEntity | null;
  volume: VolumeEntity | null;
}

/** Mapa de tipos a etiquetas legibles en español */
const TYPE_LABELS: Record<string, string> = {
  item: 'Activo',
  wall: 'Muro',
  opening: 'Vano',
  dimension: 'Acotación',
  line: 'Línea',
  rectangle: 'Área',
  face: 'Superficie',
  volume: 'Volumen',
  group: 'Grupo',
};

/**
 * Hook que resuelve el contexto de selección actual.
 * Reutiliza el store sin duplicar lógica.
 */
export function useSelectionContext(): SelectionContext {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectedType = useEditorStore((s) => s.selectedType);
  const items = useEditorStore((s) => s.items);
  const walls = useEditorStore((s) => s.walls);
  const dimensions = useEditorStore((s) => s.dimensions);
  const openings = useEditorStore((s) => s.openings);
  const lines = useEditorStore((s) => s.lines);
  const rectangles = useEditorStore((s) => s.rectangles);
  const faces = useEditorStore((s) => s.faces);
  const volumes = useEditorStore((s) => s.volumes);

  return useMemo(() => {
    const hasSelection = selectedIds.length > 0;
    const isMulti = selectedIds.length > 1;
    const count = selectedIds.length;
    const id = selectedIds.length === 1 ? selectedIds[0] : null;

    // Resolver elemento concreto
    const item = id ? items.find((i) => i.id === id) || null : null;
    const wall = id ? walls.find((w) => w.id === id) || null : null;
    const dimension = id ? dimensions.find((d) => d.id === id) || null : null;
    const opening = id ? openings.find((o) => o.id === id) || null : null;
    const line = id ? lines.find((l) => l.id === id) || null : null;
    const rectangle = id ? rectangles.find((r) => r.id === id) || null : null;
    const face = id ? faces.find((f) => f.id === id) || null : null;
    const volume = id ? volumes.find((v) => v.id === id) || null : null;

    // Etiqueta legible del tipo
    const typeLabel = isMulti
      ? `${count} objetos`
      : TYPE_LABELS[selectedType || ''] || 'Elemento';

    // Nombre/label del elemento
    let label = typeLabel;
    if (item) label = item.label || 'Instancia';
    else if (wall) label = `Muro · ${calculateDistance(wall.start, wall.end).toFixed(2)}m`;
    else if (dimension) label = 'Medición';
    else if (opening) label = opening.type === 'door' ? 'Puerta' : opening.type === 'window' ? 'Ventana' : 'Hueco';
    else if (line) label = 'Línea';
    else if (rectangle) label = rectangle.label || 'Rectángulo';
    else if (face) label = 'Superficie';
    else if (volume) label = 'Volumen';

    return {
      hasSelection,
      isMulti,
      count,
      type: selectedType,
      typeLabel,
      label,
      id,
      item,
      wall,
      dimension,
      opening,
      line,
      rectangle,
      face,
      volume,
    };
  }, [selectedIds, selectedType, items, walls, dimensions, openings, lines, rectangles, faces, volumes]);
}
