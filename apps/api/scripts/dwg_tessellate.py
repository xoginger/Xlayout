#!/usr/bin/env python3
# Creado y diseñado por XO
# XLayout — Script de teselación de entidades 3DSOLID en archivos DXF
#
# Propósito: Extraer geometría 3D (3DSOLID, 3DFACE, MESH, etc.) de archivos DXF
# y exportar como STL para el pipeline de conversión DWG → GLB.
#
# Pipeline: DWG → dwg2dxf → DXF → [este script] → STL → assimp → GLB
#
# Uso: python3 dwg_tessellate.py <input.dxf> <output.stl>

import sys
import os

def main():
    if len(sys.argv) < 3:
        print("Uso: python3 dwg_tessellate.py <input.dxf> <output.stl>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"ERROR: Archivo no encontrado: {input_path}", file=sys.stderr)
        sys.exit(2)

    try:
        import ezdxf
        from ezdxf.addons import meshex
    except ImportError:
        print("ERROR: ezdxf no está instalado. Ejecutar: pip3 install ezdxf", file=sys.stderr)
        sys.exit(3)

    try:
        doc = ezdxf.readfile(input_path)
    except Exception as e:
        print(f"ERROR: No se pudo leer el DXF: {e}", file=sys.stderr)
        sys.exit(4)

    msp = doc.modelspace()
    meshes_collected = []
    stats = {
        "3dsolid_total": 0,
        "3dsolid_ok": 0,
        "3dsolid_fail": 0,
        "3dface_total": 0,
        "mesh_total": 0,
        "polyface_total": 0,
        "total_vertices": 0,
        "total_faces": 0,
    }

    # ─── Extraer 3DSOLID (geometría ACIS) ───────────────────────────────────
    try:
        from ezdxf.acis import api as acis_api

        for solid in msp.query("3DSOLID"):
            stats["3dsolid_total"] += 1
            try:
                bodies = acis_api.load_dxf(solid)
                for body in bodies:
                    mesh = acis_api.mesh_from_body(body)
                    if mesh and len(mesh.vertices) > 0 and len(mesh.faces) > 0:
                        meshes_collected.append(mesh)
                        stats["3dsolid_ok"] += 1
                        stats["total_vertices"] += len(mesh.vertices)
                        stats["total_faces"] += len(mesh.faces)
            except Exception as e:
                stats["3dsolid_fail"] += 1
                err_msg = str(e)
                # Mensajes comunes de ezdxf al no poder teselar superficies curvas
                if "not supported" in err_msg.lower() or "curved" in err_msg.lower():
                    pass  # Esperado para superficies no planas
                else:
                    print(f"AVISO: 3DSOLID no se pudo teselar: {err_msg[:120]}", file=sys.stderr)
    except ImportError:
        print("AVISO: Módulo acis de ezdxf no disponible, omitiendo 3DSOLID", file=sys.stderr)
    except Exception as e:
        print(f"AVISO: Error procesando 3DSOLID: {e}", file=sys.stderr)

    # ─── Extraer 3DFACE (triángulos/quads directos) ─────────────────────────
    faces_3d = list(msp.query("3DFACE"))
    stats["3dface_total"] = len(faces_3d)
    if faces_3d:
        from ezdxf.render import MeshBuilder
        mb = MeshBuilder()
        for face in faces_3d:
            pts = [face.dxf.vtx0, face.dxf.vtx1, face.dxf.vtx2]
            vtx3 = face.dxf.vtx3
            # Si vtx3 es diferente de vtx2, es un quad
            if vtx3 != pts[2]:
                pts.append(vtx3)
            mb.add_face(pts)
        if len(mb.vertices) > 0:
            meshes_collected.append(mb)
            stats["total_vertices"] += len(mb.vertices)
            stats["total_faces"] += len(mb.faces)

    # ─── Extraer MESH (entidades mesh nativas) ──────────────────────────────
    mesh_entities = list(msp.query("MESH"))
    stats["mesh_total"] = len(mesh_entities)
    for mesh_ent in mesh_entities:
        try:
            from ezdxf.render import MeshBuilder
            mb = MeshBuilder.from_mesh(mesh_ent)
            if len(mb.vertices) > 0:
                meshes_collected.append(mb)
                stats["total_vertices"] += len(mb.vertices)
                stats["total_faces"] += len(mb.faces)
        except Exception as e:
            print(f"AVISO: MESH no se pudo procesar: {e}", file=sys.stderr)

    # ─── Extraer POLYFACE meshes ─────────────────────────────────────────────
    for pline in msp.query("POLYLINE"):
        if pline.is_poly_face_mesh or pline.is_polymesh:
            stats["polyface_total"] += 1
            try:
                from ezdxf.render import MeshBuilder
                mb = MeshBuilder.from_polyface(pline)
                if len(mb.vertices) > 0:
                    meshes_collected.append(mb)
                    stats["total_vertices"] += len(mb.vertices)
                    stats["total_faces"] += len(mb.faces)
            except Exception as e:
                print(f"AVISO: POLYFACE no se pudo procesar: {e}", file=sys.stderr)

    # ─── Verificar que se recopiló geometría ────────────────────────────────
    if not meshes_collected:
        # Imprimir diagnóstico detallado
        print(f"ERROR_SIN_GEOMETRIA: No se extrajo geometría 3D teselable del DXF.", file=sys.stderr)
        print(f"  3DSOLID encontrados: {stats['3dsolid_total']} (exitosos: {stats['3dsolid_ok']}, fallidos: {stats['3dsolid_fail']})", file=sys.stderr)
        print(f"  3DFACE encontrados: {stats['3dface_total']}", file=sys.stderr)
        print(f"  MESH encontrados: {stats['mesh_total']}", file=sys.stderr)
        print(f"  POLYFACE encontrados: {stats['polyface_total']}", file=sys.stderr)
        if stats["3dsolid_total"] > 0 and stats["3dsolid_ok"] == 0:
            print(f"  Los 3DSOLID contienen superficies curvas que requieren un motor ACIS para teselar.", file=sys.stderr)
            print(f"  Recomendación: exportar como OBJ o STL directamente desde AutoCAD.", file=sys.stderr)
        sys.exit(10)

    # ─── Unificar todas las mallas en una sola ──────────────────────────────
    from ezdxf.render import MeshBuilder
    combined = MeshBuilder()
    for m in meshes_collected:
        # Usar merge para combinar mallas
        try:
            combined.add_mesh(mesh=m)
        except Exception:
            # Fallback: añadir vértices y caras manualmente
            offset = len(combined.vertices)
            combined.vertices.extend(m.vertices)
            for face in m.faces:
                combined.faces.append(tuple(idx + offset for idx in face))

    # ─── Exportar como STL binario ──────────────────────────────────────────
    try:
        meshex.stl_dumps(combined, output_path)
        file_size = os.path.getsize(output_path)
        print(f"OK: STL generado exitosamente", file=sys.stdout)
        print(f"  Vértices: {stats['total_vertices']}", file=sys.stdout)
        print(f"  Caras: {stats['total_faces']}", file=sys.stdout)
        print(f"  Mallas combinadas: {len(meshes_collected)}", file=sys.stdout)
        print(f"  Tamaño STL: {file_size} bytes", file=sys.stdout)
        print(f"  3DSOLID: {stats['3dsolid_ok']}/{stats['3dsolid_total']}", file=sys.stdout)
        sys.exit(0)
    except AttributeError:
        # Versiones más recientes de ezdxf usan otro API
        try:
            from ezdxf.addons import meshex as mx
            # Intentar exportar usando write_stl
            with open(output_path, 'wb') as f:
                mx.stl_write(f, combined)
            file_size = os.path.getsize(output_path)
            print(f"OK: STL generado exitosamente (API alternativa)", file=sys.stdout)
            print(f"  Vértices: {stats['total_vertices']}", file=sys.stdout)
            print(f"  Caras: {stats['total_faces']}", file=sys.stdout)
            sys.exit(0)
        except Exception as e2:
            # Último recurso: generar STL manualmente
            try:
                write_stl_manual(combined, output_path, stats)
            except Exception as e3:
                print(f"ERROR: No se pudo exportar STL: {e2} / {e3}", file=sys.stderr)
                sys.exit(11)


def write_stl_manual(mesh, output_path, stats):
    """Generar STL ASCII manualmente como último recurso."""
    import struct
    vertices = list(mesh.vertices)
    faces = list(mesh.faces)

    if not faces:
        print("ERROR: Mesh vacío, sin caras para exportar", file=sys.stderr)
        sys.exit(10)

    with open(output_path, 'wb') as f:
        # Encabezado STL binario (80 bytes)
        header = b'XLayout DWG Pipeline - STL generado por ezdxf' + b'\0' * 34
        f.write(header[:80])
        # Número de triángulos
        num_triangles = 0
        # Primero contar triángulos (quads = 2 triángulos)
        for face in faces:
            if len(face) == 3:
                num_triangles += 1
            elif len(face) >= 4:
                num_triangles += len(face) - 2  # Fan triangulation

        f.write(struct.pack('<I', num_triangles))

        for face in faces:
            if len(face) < 3:
                continue
            # Triangulación en abanico
            v0 = vertices[face[0]]
            for i in range(1, len(face) - 1):
                v1 = vertices[face[i]]
                v2 = vertices[face[i + 1]]
                # Normal (calculada como producto cruz)
                e1 = (v1[0]-v0[0], v1[1]-v0[1], v1[2]-v0[2])
                e2 = (v2[0]-v0[0], v2[1]-v0[1], v2[2]-v0[2])
                nx = e1[1]*e2[2] - e1[2]*e2[1]
                ny = e1[2]*e2[0] - e1[0]*e2[2]
                nz = e1[0]*e2[1] - e1[1]*e2[0]
                # Normal + 3 vértices + attribute byte count
                f.write(struct.pack('<3f', nx, ny, nz))
                f.write(struct.pack('<3f', v0[0], v0[1], v0[2]))
                f.write(struct.pack('<3f', v1[0], v1[1], v1[2]))
                f.write(struct.pack('<3f', v2[0], v2[1], v2[2]))
                f.write(struct.pack('<H', 0))

    file_size = os.path.getsize(output_path)
    print(f"OK: STL generado manualmente", file=sys.stdout)
    print(f"  Triángulos: {num_triangles}", file=sys.stdout)
    print(f"  Tamaño STL: {file_size} bytes", file=sys.stdout)
    sys.exit(0)


if __name__ == "__main__":
    main()
