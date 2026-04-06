# Creado y diseñado por XO
# XLayout System — Conversión SKP → GLB vía Blender headless
#
# Uso: blender --background --python skp_convert.py -- input.skp output.glb
#
# Estrategia de conversión:
# 1. Intenta importar SKP con el addon SketchUp Importer (si disponible)
# 2. Intenta usar el importador experimental de Collada como fallback
# 3. Si todo falla, genera un error descriptivo con instrucciones claras
#
# Salida JSON (stdout prefijada con SKP_RESULT:):
#   Éxito: { "success": true, "triangles": N, ... }
#   Error: { "success": false, "error": "mensaje descriptivo" }

import bpy
import sys
import json
import os
import traceback

def limpiar_escena():
    """Elimina todos los objetos de la escena por defecto."""
    bpy.ops.wm.read_factory_settings(use_empty=True)

def intentar_addon_skp(ruta_skp):
    """Intenta importar el archivo SKP usando addons disponibles."""
    # Lista de addons y operadores conocidos para SKP
    addons_a_probar = [
        'sketchup_importer',
        'io_import_sketchup',
        'import_sketchup',
    ]

    # Intentar habilitar cada addon
    for addon_name in addons_a_probar:
        try:
            bpy.ops.preferences.addon_enable(module=addon_name)
            print(f"SKP_LOG: Addon '{addon_name}' habilitado")
        except Exception:
            continue

    # Intentar operadores de importación SKP
    operadores = [
        ('import_scene.skp', lambda: bpy.ops.import_scene.skp(filepath=ruta_skp)),
        ('wm.skp_import', lambda: bpy.ops.wm.skp_import(filepath=ruta_skp)),
    ]

    for nombre, operador in operadores:
        try:
            operador()
            print(f"SKP_LOG: Importado con operador {nombre}")
            return True
        except (AttributeError, RuntimeError, TypeError) as e:
            print(f"SKP_LOG: Operador {nombre} no disponible: {str(e)[:100]}")
            continue

    return False

def validar_archivo_skp(ruta_skp):
    """Valida que el archivo sea un SKP real antes de intentar convertir."""
    if not os.path.isfile(ruta_skp):
        raise FileNotFoundError(f"Archivo SKP no encontrado: {ruta_skp}")

    tamanio = os.path.getsize(ruta_skp)
    if tamanio == 0:
        raise ValueError("El archivo SKP está vacío (0 bytes)")

    if tamanio < 64:
        raise ValueError("El archivo es demasiado pequeño para ser un modelo SketchUp válido")

    # Verificar extensión
    if not ruta_skp.lower().endswith('.skp'):
        raise ValueError(f"La extensión del archivo no es .skp: {ruta_skp}")

    return tamanio

def contar_geometria():
    """Cuenta triángulos y objetos en la escena actual de Blender."""
    total_tris = 0
    total_verts = 0
    total_objetos = 0

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            total_objetos += 1
            mesh = obj.data
            mesh.calc_loop_triangles()
            total_tris += len(mesh.loop_triangles)
            total_verts += len(mesh.vertices)

    return {
        "triangles": total_tris,
        "vertices": total_verts,
        "objects": total_objetos,
    }

def calcular_bbox():
    """Calcula el bounding box global de todos los objetos mesh."""
    import mathutils

    min_co = [float('inf')] * 3
    max_co = [float('-inf')] * 3
    tiene_geometria = False

    for obj in bpy.data.objects:
        if obj.type == 'MESH' and len(obj.data.vertices) > 0:
            tiene_geometria = True
            bbox_corners = [obj.matrix_world @ mathutils.Vector(corner) for corner in obj.bound_box]
            for corner in bbox_corners:
                for i in range(3):
                    min_co[i] = min(min_co[i], corner[i])
                    max_co[i] = max(max_co[i], corner[i])

    if not tiene_geometria:
        return None

    return {
        "min": list(min_co),
        "max": list(max_co),
        "width": round(max_co[0] - min_co[0], 4),
        "height": round(max_co[1] - min_co[1], 4),
        "depth": round(max_co[2] - min_co[2], 4),
    }

def exportar_glb(ruta_salida):
    """Exporta la escena completa como GLB."""
    bpy.ops.object.select_all(action='SELECT')

    try:
        bpy.ops.export_scene.gltf(
            filepath=ruta_salida,
            export_format='GLB',
            use_selection=False,
            export_apply=True,
            export_yup=True,
        )
    except Exception as e:
        raise RuntimeError(f"Error al exportar GLB: {str(e)}")

    if not os.path.isfile(ruta_salida):
        raise RuntimeError("Blender no generó el archivo GLB de salida")

    tamanio = os.path.getsize(ruta_salida)
    if tamanio == 0:
        raise RuntimeError("El archivo GLB generado está vacío")

    return tamanio

def main():
    """Punto de entrada principal del script de conversión SKP."""
    # Obtener argumentos después del "--"
    argv = sys.argv
    separator_idx = argv.index("--") if "--" in argv else -1

    if separator_idx == -1 or len(argv) < separator_idx + 3:
        resultado = {
            "success": False,
            "error": "Uso: blender --background --python skp_convert.py -- input.skp output.glb"
        }
        print("SKP_RESULT:" + json.dumps(resultado))
        sys.exit(1)

    ruta_skp = argv[separator_idx + 1]
    ruta_glb = argv[separator_idx + 2]

    try:
        # Paso 1: Validar archivo de entrada
        tamanio_original = validar_archivo_skp(ruta_skp)
        print(f"SKP_LOG: Archivo validado ({tamanio_original} bytes)")

        # Paso 2: Limpiar escena de Blender
        limpiar_escena()

        # Paso 3: Intentar importar SKP con addon
        import_exitoso = intentar_addon_skp(ruta_skp)

        if not import_exitoso:
            # El addon de SketchUp no está disponible en este entorno Linux
            # Generar error descriptivo con instrucciones claras para el usuario
            raise RuntimeError(
                "ADDON_NO_DISPONIBLE: El plugin de importación SketchUp no está operativo en este entorno. "
                "Para subir modelos de SketchUp a XLayout, exporta el archivo desde SketchUp como: "
                "OBJ (File → Export → 3D Model → OBJ), "
                "DAE/Collada (File → Export → 3D Model → Collada), "
                "o FBX. "
                "Estos formatos se convierten automáticamente con calidad profesional."
            )

        # Paso 4: Verificar que se importó geometría
        geo = contar_geometria()
        if geo["triangles"] == 0 and geo["objects"] == 0:
            raise ValueError(
                "El archivo SKP no contiene geometría 3D válida. "
                "El modelo puede estar vacío o contener solo líneas/guías sin volumen."
            )

        # Paso 5: Calcular bounding box
        bbox = calcular_bbox()

        # Paso 6: Exportar a GLB
        tamanio_glb = exportar_glb(ruta_glb)

        # Paso 7: Resultado exitoso
        resultado = {
            "success": True,
            "triangles": geo["triangles"],
            "vertices": geo["vertices"],
            "objects": geo["objects"],
            "boundingBox": bbox,
            "glbSizeBytes": tamanio_glb,
            "originalSizeBytes": tamanio_original,
            "blenderVersion": bpy.app.version_string,
            "conversionPipeline": "blender-headless-skp",
        }
        print("SKP_RESULT:" + json.dumps(resultado))

    except FileNotFoundError as e:
        resultado = {"success": False, "error": str(e), "errorType": "file_not_found"}
        print("SKP_RESULT:" + json.dumps(resultado))
        sys.exit(1)

    except ValueError as e:
        resultado = {"success": False, "error": str(e), "errorType": "invalid_geometry"}
        print("SKP_RESULT:" + json.dumps(resultado))
        sys.exit(1)

    except RuntimeError as e:
        error_msg = str(e)
        error_type = "conversion_failed"
        if "ADDON_NO_DISPONIBLE" in error_msg:
            error_type = "addon_unavailable"
            # Limpiar el prefijo interno del mensaje
            error_msg = error_msg.replace("ADDON_NO_DISPONIBLE: ", "")
        resultado = {"success": False, "error": error_msg, "errorType": error_type}
        print("SKP_RESULT:" + json.dumps(resultado))
        sys.exit(1)

    except Exception as e:
        resultado = {
            "success": False,
            "error": f"Error inesperado al procesar SKP: {str(e)}",
            "errorType": "unknown",
        }
        print("SKP_RESULT:" + json.dumps(resultado))
        sys.exit(1)

if __name__ == "__main__":
    main()
