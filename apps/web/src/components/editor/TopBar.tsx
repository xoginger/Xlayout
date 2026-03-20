/**
 * @deprecated COMPONENTE DEPRECADO — no usar.
 *
 * La barra superior original del editor ha sido dividida en dos componentes separados:
 *
 * 1. NAVEGACIÓN GLOBAL DEL SISTEMA → GlobalNavBar.tsx
 *    Ubicación: src/components/nav/GlobalNavBar.tsx
 *    - Logo, módulos (Editor/Proyectos/Catálogo/Dashboard/Admin)
 *    - Tenant activo, perfil de usuario, logout
 *    - Permisos por rol desde src/lib/nav-permissions.ts
 *    - Montada automáticamente por AppShell en todas las rutas autenticadas
 *
 * 2. HERRAMIENTAS CONTEXTUALES DEL EDITOR → EditorToolbar.tsx
 *    Ubicación: src/components/editor/EditorToolbar.tsx
 *    - Menús Archivo / Editar
 *    - Undo / Redo
 *    - Nombre del proyecto + estado (guardado/sucio/guardando)
 *    - Selector de vista 2D / 3D
 *    - Botón Export
 *
 * Este archivo puede eliminarse en una futura limpieza de código.
 * No exporta ningún componente activo.
 *
 * @see src/components/nav/GlobalNavBar.tsx
 * @see src/components/editor/EditorToolbar.tsx
 * @see src/lib/nav-permissions.ts
 */

// Este archivo está intencionalmente vacío.
// Ver comentario de deprecación arriba.
export {};
