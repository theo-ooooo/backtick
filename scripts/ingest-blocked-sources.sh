#!/bin/zsh
# velog(API 불안정 백업)·우아한형제들(러너 IP 차단) — 로컬에서 6시간마다 보충 수집
export PATH="$HOME/.nvm/versions/node/v24.13.1/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env.ingest.prod | xargs)
export INGEST_ONLY="velog,우아한형제들"
exec npx tsx scripts/ingest.ts >> /tmp/backtick-local-ingest.log 2>&1
