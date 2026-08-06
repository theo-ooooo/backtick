#!/bin/zsh
# velog·우아한형제들 — 데이터센터 IP 차단 소스를 로컬 네트워크에서 수집
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env.ingest.prod | xargs)
export INGEST_ONLY="velog,우아한형제들"
exec npx tsx scripts/ingest.ts >> /tmp/backtick-local-ingest.log 2>&1
