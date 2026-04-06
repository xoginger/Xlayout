#!/usr/bin/env bash
# ============================================================
# XLayout — Backup Automatizado de PostgreSQL
# Creado: 2026-04-06 | NC-OPS-01 (ISO 27001 §A.17)
#
# Uso:
#   ./scripts/backup_postgres.sh          # Backup normal
#   ./scripts/backup_postgres.sh --test   # Solo verifica conexión
#
# Cron recomendado (diario a las 3:00am):
#   0 3 * * * /opt/xlayout/scripts/backup_postgres.sh >> /opt/xlayout/backups/backup.log 2>&1
# ============================================================

set -euo pipefail

# ─── Configuración ───────────────────────────────────────────
BACKUP_DIR="/opt/xlayout/backups"
CONTAINER_NAME="xlayout_postgres_prod"
DB_NAME="xlayout_prod_db"
DB_USER="xlayout_prod_user"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/xlayout_${TIMESTAMP}.sql.gz"
LOG_PREFIX="[BACKUP $(date '+%Y-%m-%d %H:%M:%S')]"

# ─── Funciones ───────────────────────────────────────────────
log_info()  { echo "${LOG_PREFIX} [INFO]  $1"; }
log_error() { echo "${LOG_PREFIX} [ERROR] $1" >&2; }
log_ok()    { echo "${LOG_PREFIX} [OK]    $1"; }

# ─── Verificaciones previas ─────────────────────────────────
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Contenedor ${CONTAINER_NAME} no está corriendo. Abortando."
    exit 1
fi

# Modo test: solo verificar conexión
if [[ "${1:-}" == "--test" ]]; then
    log_info "Modo test: verificando conexión a PostgreSQL..."
    if docker exec "${CONTAINER_NAME}" pg_isready -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        log_ok "Conexión a PostgreSQL exitosa."
        exit 0
    else
        log_error "No se puede conectar a PostgreSQL."
        exit 1
    fi
fi

# ─── Crear directorio si no existe ───────────────────────────
mkdir -p "${BACKUP_DIR}"

# ─── Ejecutar pg_dump ────────────────────────────────────────
log_info "Iniciando backup de ${DB_NAME}..."
log_info "Destino: ${BACKUP_FILE}"

if docker exec "${CONTAINER_NAME}" pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    --verbose 2>/dev/null \
    | gzip > "${BACKUP_FILE}"; then

    # Verificar que el archivo no está vacío
    FILE_SIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
    if [[ "${FILE_SIZE}" -lt 1000 ]]; then
        log_error "Backup generado pero archivo demasiado pequeño (${FILE_SIZE} bytes). Posible error."
        rm -f "${BACKUP_FILE}"
        exit 1
    fi

    FILE_SIZE_MB=$(echo "scale=2; ${FILE_SIZE} / 1048576" | bc)
    log_ok "Backup completado: ${BACKUP_FILE} (${FILE_SIZE_MB} MB)"
else
    log_error "pg_dump falló. Revise los logs del contenedor."
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# ─── Rotación: mantener últimos N días ───────────────────────
log_info "Limpiando backups antiguos (retención: ${RETENTION_DAYS} días)..."
DELETED_COUNT=0
while IFS= read -r old_file; do
    rm -f "${old_file}"
    ((DELETED_COUNT++))
    log_info "  Eliminado: $(basename "${old_file}")"
done < <(find "${BACKUP_DIR}" -name "xlayout_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" 2>/dev/null)

if [[ "${DELETED_COUNT}" -gt 0 ]]; then
    log_ok "Eliminados ${DELETED_COUNT} backups antiguos."
else
    log_info "No hay backups antiguos para eliminar."
fi

# ─── Resumen ─────────────────────────────────────────────────
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "xlayout_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log_ok "Resumen: ${TOTAL_BACKUPS} backups almacenados, uso total: ${TOTAL_SIZE}"
log_ok "Backup finalizado exitosamente."
