/**
 * Creado y diseñado por XO
 */

import { create } from 'zustand';
import { projectService } from '../services/project-service';
import stringify from 'fast-json-stable-stringify';

export type SceneItemType = 'rack' | 'shelf' | 'desk' | 'cabinet' | 'catalog-item';
export type OpeningType = 'door' | 'window' | 'opening';
export type OpeningDirection = 'left' | 'right' | 'inward' | 'outward';
export type ViewMode = '2D' | '3D';
export type DimensionUnit = 'mm' | 'cm' | 'm';
export type DimensionAlignment = 'horizontal' | 'vertical' | 'aligned' | 'free';
export type ToolType =
  | 'select' | 'multi-select' | 'pan' | 'orbit' | 'zoom' | 'move' | 'rotate' | 'scale'
  | 'line' | 'rectangle' | 'circle' | 'wall'
  | 'extrude' | 'offset'
  | 'tape' | 'paint' | 'eraser' | 'dimension'
  | 'delete' | 'duplicate' | 'scale-blueprint' | 'place-opening' | 'product';

export interface SnapPoint {
  id: string;
  name: string;
  localPosition: [number, number, number];
  normal: [number, number, number];
  type: string;
  allowedConnections?: string[];
  priority?: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
}

export interface Scene {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  viewMode: ViewMode;
}

export interface BlueprintState {
  url: string | null;
  position: [number, number, number];
  scale: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  // Metadatos de Calibración
  calibrated?: boolean;
  calibrationPointA?: [number, number, number]; // Guardado en X,Y,Z locales del plano
  calibrationPointB?: [number, number, number];
  calibrationMeasuredDist?: number;
  calibrationRealDist?: number;
}

export interface CalibrationState {
  step: 'idle' | 'awaiting-first-point' | 'awaiting-second-point' | 'awaiting-real-distance';
  pointA?: [number, number, number]; // Coordenadas locales
  pointB?: [number, number, number]; // Coordenadas locales
  measuredDistance?: number;
}

export interface DimensionLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  value: number;              // distancia calculada en metros (fuente de verdad geométrica)
  unit: DimensionUnit;        // unidad de visualización: 'mm' | 'cm' | 'm'
  offset: number;             // offset perpendicular en metros (para evitar solapamiento)
  alignment: DimensionAlignment; // alineación: horizontal, vertical, aligned, free
  label?: string;             // etiqueta manual opcional
}

export interface LineEntity {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  type: 'line';
  layerId?: string;
}

export interface Guide {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  type: 'infinite' | 'segment';
}

export interface FaceEntity {
  id: string;
  points: [number, number, number][];
  type: 'face';
  layerId?: string;
  color?: string;
  area?: number;
}

export interface VolumeEntity {
  id: string;
  basePoints: [number, number, number][];
  height: number;
  type: 'volume';
  layerId?: string;
  color?: string;
  position: [number, number, number]; // posición central para el gizmo de transformación
}

export interface RectangleEntity {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
  depth: number;
  type: 'rectangle';
  category?: string;
  layerId?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface SceneItem {
  id: string;
  productId: string;
  tenantId: string;
  type: SceneItemType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  width: number;
  depth: number;
  height: number;
  label?: string;
  price?: number | null;
  hasPriceAccess?: boolean;

  // Metadatos Profesionales
  model3dUrl?: string;
  floorAnchor: number; // 0 = base, 0.5 = centro
  snapPoints?: SnapPoint[];
  resizable?: boolean;
  metadata?: Record<string, any>;
  layerId?: string;
}

export interface Wall {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  thickness: number;
  height: number;
  layerId?: string;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;             // solo ventanas
  openingDirection?: OpeningDirection; // solo puertas
  label?: string;
  layerId?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  priceType?: string; // 'A', 'B', 'C', 'D', 'E'
  lastSavedAt?: string | null;
  saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
  lastSavedHash: string | null;
  isDirty?: boolean;
  isSaving?: boolean;
}

// Grupo de entidades seleccionadas
export interface GroupEntity {
  id: string;
  name: string;
  memberIds: string[];
}

// Datos del portapapeles para copiar/pegar
export interface ClipboardData {
  items: SceneItem[];
  walls: Wall[];
  lines: LineEntity[];
  rectangles: RectangleEntity[];
}

export interface EditorState {
  project: ProjectInfo;
  items: SceneItem[];
  walls: Wall[];
  openings: Opening[];
  dimensions: DimensionLine[];
  lines: LineEntity[];
  rectangles: RectangleEntity[];
  faces: FaceEntity[];
  volumes: VolumeEntity[];
  layers: Layer[];
  scenes: Scene[];
  guides: Guide[];
  groups: GroupEntity[];
  clipboard: ClipboardData | null;

  activeLayerId: string;
  selectedId: string | null;
  selectedIds: string[];
  selectedType: 'item' | 'wall' | 'opening' | 'dimension' | 'line' | 'rectangle' | 'face' | 'volume' | 'group' | null;
  activeTool: ToolType;
  viewMode: ViewMode;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  catalogPanelState: 'open' | 'hidden';
  advancedMode: boolean;
  pendingOpeningType: OpeningType | null;
  exportRequest: 'image' | 'glb' | 'pdf' | null;
  blueprint: BlueprintState;
  calibrationState: CalibrationState;

  history: any[];
  historyIndex: number;

  setSaveStatus: (status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error') => void;
  setProjectName: (name: string) => void;
  addItem: (item: SceneItem) => void;
  addWall: (wall: Wall) => void;
  addOpening: (opening: Opening) => void;
  addFace: (face: FaceEntity) => void;
  addVolume: (volume: VolumeEntity) => void;
  addScene: (scene: Scene) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  applyScene: (id: string) => void;

  addGuide: (guide: Guide) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  updateOpening: (id: string, updates: Partial<Opening>) => void;
  insertStructuralAsset: (type: OpeningType, wallId: string, offset?: number) => void;
  setPendingOpeningType: (type: OpeningType | null) => void;
  addDimension: (dim: DimensionLine) => void;
  updateDimension: (id: string, updates: Partial<DimensionLine>) => void;
  addLine: (line: LineEntity) => void;
  addRectangle: (rect: RectangleEntity) => void;
  updateLine: (id: string, updates: Partial<LineEntity>) => void;
  updateRectangle: (id: string, updates: Partial<RectangleEntity>) => void;
  updateFace: (id: string, updates: Partial<FaceEntity>) => void;
  updateVolume: (id: string, updates: Partial<VolumeEntity>) => void;
  updateItem: (id: string, updates: Partial<SceneItem>) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;

  setActiveLayer: (id: string) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  toggleLayer: (id: string) => void;

  removeItem: (id?: string) => void;
  duplicateItem: (id?: string) => void;
  insertSceneItem: (productData: any, tenantId: string) => void;
  select: (id: string | null, type?: any, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: ToolType) => void;
  setViewMode: (mode: ViewMode) => void;
  setGridSize: (size: number) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  setCatalogPanelState: (state: 'open' | 'hidden') => void;
  toggleCatalogPanel: () => void;
  toggleAdvancedMode: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setDirty: (isDirty: boolean) => void;
  saveProject: (mode?: 'autosave' | 'manual') => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<void>;
  triggerExport: (type: 'image' | 'glb' | 'pdf') => void;
  clearExportRequest: () => void;

  setCalibrationState: (data: Partial<CalibrationState>) => void;
  updateBlueprint: (data: Partial<BlueprintState>) => void;
  clearBlueprint: () => void;
  setPriceType: (type: string) => void;
  
  // Nuevas acciones de Proyecto
  saveAs: (newName: string) => Promise<void>;
  exportProject: () => void;
  importProject: (jsonData: any) => void;

  // Clipboard y Grupos
  copySelection: () => void;
  pasteSelection: () => void;
  groupSelection: (name?: string) => void;
  ungroupSelection: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  
  // Quotes
  quotes: any[];
  isLoadingQuotes: boolean;
  isSavingQuote: boolean;
  fetchQuotes: () => Promise<void>;
  saveQuote: (data: any) => Promise<any>;

  // Timeline
  restoreVersion: (versionId: string) => Promise<void>;
}
