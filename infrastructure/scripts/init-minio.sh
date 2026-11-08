#!/usr/bin/env bash
# Script para inicialização e configuração do bucket no MinIO
set -e

MINIO_HOST="${MINIO_HOST:-localhost:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-pixproadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-pixprosecret}"
BUCKET_NAME="${MINIO_DEFAULT_BUCKET:-pixpro-storage}"

echo "[MinIO Init] Configurando alias para ${MINIO_HOST}..."
mc alias set pixpro-local "http://${MINIO_HOST}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "[MinIO Init] Garantindo criação do bucket '${BUCKET_NAME}'..."
mc mb --ignore-existing "pixpro-local/${BUCKET_NAME}"

echo "[MinIO Init] Bucket '${BUCKET_NAME}' pronto para uso."
