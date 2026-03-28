#!/usr/bin/env python3
# Creado y diseñado por XO
# XLayout — Script de conversión DWG/DXF a STL usando FreeCAD headless
#
# Usa el motor OpenCASCADE de FreeCAD para teselar sólidos ACIS (3DSOLID)
# que ezdxf y assimp no pueden procesar directamente.
#
# Pipeline: DWG → DXF → [FreeCAD import + tessellate] → STL
#
# Uso: python3 dwg_freecad_convert.py <input.dxf> <output.stl>

import sys
import os

def setup_freecad_paths():
    """Configurar paths de FreeCAD y crear aliases de PySide para headless."""
    # Paths de FreeCAD en Debian bookworm
    for p in [
        "/usr/lib/freecad/lib",
        "/usr/lib/freecad/Mod/Draft",
        "/usr/lib/freecad/Mod/Part",
        "/usr/lib/freecad/Mod/Mesh",
        "/usr/share/freecad/Mod/Draft",
    ]:
        if p not in sys.path:
            sys.path.insert(0, p)

    # FreeCAD 0.20 en Debian hace "import PySide.QtCore" pero
    # el paquete instalado se llama PySide2 — crear alias
    try:
        import PySide2
        sys.modules['PySide'] = PySide2
        import PySide2.QtCore
        sys.modules['PySide.QtCore'] = PySide2.QtCore
        try:
            import PySide2.QtGui
            sys.modules['PySide.QtGui'] = PySide2.QtGui
        except ImportError:
            pass
        try:
            import PySide2.QtWidgets
            sys.modules['PySide.QtWidgets'] = PySide2.QtWidgets
        except ImportError:
            pass
    except ImportError:
        print("AVISO: PySide2 no disponible, FreeCAD puede fallar", file=sys.stderr)


def main():
    if len(sys.argv) < 3:
        print("Uso: python3 dwg_freecad_convert.py <input.dxf> <output.stl>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print("ERROR: Archivo no encontrado: " + input_path, file=sys.stderr)
        sys.exit(2)

    # Configurar entorno FreeCAD
    setup_freecad_paths()

    try:
        import FreeCAD
        import Part
        import Mesh
    except ImportError as e:
        print("ERROR: FreeCAD no disponible: " + str(e), file=sys.stderr)
        sys.exit(3)

    try:
        doc = FreeCAD.newDocument("DWGConversion")

        # Importar DXF/DWG
        ext = os.path.splitext(input_path)[1].lower()
        print("Importando " + ext + ": " + os.path.basename(input_path), file=sys.stderr)

        if ext == '.dxf':
            try:
                import importDXF
                importDXF.open(input_path)
            except Exception as e:
                print("AVISO: importDXF falló, intentando Part.insert: " + str(e)[:100], file=sys.stderr)
                Part.insert(input_path, doc.Name)
        elif ext == '.dwg':
            try:
                import importDWG
                importDWG.open(input_path)
            except Exception as e:
                print("AVISO: importDWG falló: " + str(e)[:100], file=sys.stderr)
                # Intentar DXF si hay uno convertido previamente
                sys.exit(4)
        else:
            print("ERROR: Formato no soportado: " + ext, file=sys.stderr)
            sys.exit(4)

        # Obtener documento activo (puede haber cambiado después del import)
        doc = FreeCAD.ActiveDocument
        if doc is None:
            print("ERROR_SIN_GEOMETRIA: FreeCAD no creó un documento.", file=sys.stderr)
            sys.exit(10)

        objects = doc.Objects
        if not objects:
            print("ERROR_SIN_GEOMETRIA: FreeCAD no importó objetos del archivo.", file=sys.stderr)
            sys.exit(10)

        print("Objetos importados: " + str(len(objects)), file=sys.stderr)

        # Recopilar shapes con geometría
        shapes = []
        for obj in objects:
            if hasattr(obj, 'Shape') and obj.Shape and not obj.Shape.isNull():
                s = obj.Shape
                if len(s.Solids) > 0 or len(s.Faces) > 0:
                    shapes.append(s)
                    print("  " + obj.Name + ": solids=" + str(len(s.Solids)) +
                          " faces=" + str(len(s.Faces)) +
                          " vol=" + str(round(s.Volume, 2)), file=sys.stderr)

        if not shapes:
            # Buscar objetos Mesh directamente
            meshes_found = []
            for obj in objects:
                if hasattr(obj, 'Mesh') and obj.Mesh and obj.Mesh.CountFacets > 0:
                    meshes_found.append(obj.Mesh)
                    print("  " + obj.Name + ": mesh=" + str(obj.Mesh.CountFacets) + " facets", file=sys.stderr)

            if meshes_found:
                combined = meshes_found[0]
                for mx in meshes_found[1:]:
                    combined.addMesh(mx)
                combined.write(output_path)
                sz = os.path.getsize(output_path)
                print("OK: STL generado desde mesh", file=sys.stdout)
                print("  Triángulos: " + str(combined.CountFacets), file=sys.stdout)
                print("  Tamaño: " + str(sz) + " bytes", file=sys.stdout)
                sys.exit(0)

            print("ERROR_SIN_GEOMETRIA: No se encontró geometría 3D teselable.", file=sys.stderr)
            sys.exit(10)

        # Teselar todas las shapes y combinar en una malla
        print("Teselando " + str(len(shapes)) + " shapes...", file=sys.stderr)
        mesh_objs = []
        total_tris = 0

        for i, s in enumerate(shapes):
            m = Mesh.Mesh()
            try:
                data = s.tessellate(0.1)  # tolerancia 0.1mm
                if data and len(data[0]) > 0 and len(data[1]) > 0:
                    for j in range(len(data[1])):
                        t = data[1][j]
                        m.addFacet(data[0][t[0]], data[0][t[1]], data[0][t[2]])
                    mesh_objs.append(m)
                    total_tris += m.CountFacets
            except Exception as e:
                print("  Shape " + str(i) + " tesselación error: " + str(e)[:80], file=sys.stderr)
                continue

        if not mesh_objs:
            print("ERROR_SIN_GEOMETRIA: Ninguna shape pudo ser teselada.", file=sys.stderr)
            sys.exit(10)

        # Combinar todas las mallas
        combined = mesh_objs[0]
        for mx in mesh_objs[1:]:
            combined.addMesh(mx)

        # Exportar STL
        combined.write(output_path)
        sz = os.path.getsize(output_path)
        print("OK: STL generado exitosamente", file=sys.stdout)
        print("  Shapes teseladas: " + str(len(mesh_objs)) + "/" + str(len(shapes)), file=sys.stdout)
        print("  Triángulos: " + str(combined.CountFacets), file=sys.stdout)
        print("  Tamaño: " + str(sz) + " bytes", file=sys.stdout)

        FreeCAD.closeDocument("DWGConversion")
        sys.exit(0)

    except SystemExit:
        raise
    except Exception as e:
        print("ERROR: Conversión FreeCAD: " + str(e), file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(5)


if __name__ == "__main__":
    main()
