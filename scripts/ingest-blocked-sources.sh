#!/bin/zsh
# 우아한형제들 — GitHub 러너/Vercel IP가 차단돼 로컬 네트워크에서 보충 수집 (launchd가 6시간마다 실행)
export PATH="$HOME/.nvm/versions/node/v24.13.1/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")/.."
export $(grep -v '^#' .env.ingest.prod | xargs)
export INGEST_ONLY="우아한형제들"
exec npx tsx scripts/ingest.ts >> /tmp/backtick-local-ingest.log 2>&1
