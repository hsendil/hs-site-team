#!/usr/bin/env bash
# Chain 2 — Vercel Deploy Triage runner
#
# Mantık:
#   1. Vercel API → son deployment state
#   2. State READY → çık (no-op)
#   3. State ERROR → build log indir, commit history sorgula
#   4. Claude API → WEB ajan analizini iste (system prompt: skills/hs-site-po/references/WEB.md inline)
#   5. Notion API → Incident Log sayfasına kaydet
#
# Şu an: Sprint 1 ISKELET. Mantık stub'ları var, gerçek Claude/Notion
# entegrasyonu Sprint 1 devamında eklenecek.

set -euo pipefail

LOG_FILE="triage-log.txt"
echo "=== Chain 2 Deploy Triage — $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG_FILE"

# 1. Required env check
required_vars=("ANTHROPIC_API_KEY" "VERCEL_TOKEN" "VERCEL_TEAM_ID" "VERCEL_PROJECT_ID" "NOTION_API_KEY" "NOTION_INCIDENT_DB")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "⚠️  Missing required env: $var" | tee -a "$LOG_FILE"
    echo "→ Skipping (Sprint 1 iskelet — secrets henuz konfigure edilmemiş olabilir)" | tee -a "$LOG_FILE"
    exit 0
  fi
done

# 2. Vercel API — son deployment
echo "→ Vercel API: son deployment durumu..." | tee -a "$LOG_FILE"

DEPLOY_JSON=$(curl -sS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=1&target=production")

STATE=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].state // "UNKNOWN"')
DEPLOY_ID=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].uid // ""')
DEPLOY_URL=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].url // ""')
COMMIT_SHA=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].meta.githubCommitSha // ""')
COMMIT_MSG=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].meta.githubCommitMessage // ""')

echo "  State:    $STATE" | tee -a "$LOG_FILE"
echo "  Deploy:   $DEPLOY_ID" | tee -a "$LOG_FILE"
echo "  URL:      $DEPLOY_URL" | tee -a "$LOG_FILE"
echo "  Commit:   $COMMIT_SHA" | tee -a "$LOG_FILE"
echo "  Message:  $COMMIT_MSG" | tee -a "$LOG_FILE"

# 3. State kararı
if [ "$STATE" != "ERROR" ]; then
  echo "✅ Son deployment OK ($STATE) — triage gerekmiyor" | tee -a "$LOG_FILE"
  exit 0
fi

echo "🚨 ERROR state — triage başlıyor..." | tee -a "$LOG_FILE"

# 4. Build log çek
echo "→ Build log indiriliyor..." | tee -a "$LOG_FILE"
BUILD_LOG=$(curl -sS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v3/deployments/${DEPLOY_ID}/events?teamId=${VERCEL_TEAM_ID}&builds=1" \
  | jq -r '[.[] | select(.type == "stderr" or .type == "stdout") | .text] | join("\n")' \
  | tail -100)

echo "--- Last 100 log lines ---" | tee -a "$LOG_FILE"
echo "$BUILD_LOG" | tee -a "$LOG_FILE"
echo "--- end log ---" | tee -a "$LOG_FILE"

# 5. STUB: Claude API — WEB ajan analizi
# TODO Sprint 1 devamı: Anthropic API call ile WEB.md system prompt + build log,
#       commit SHA, root cause analysis iste.
#       Sonucu Notion'a kaydet.
echo "→ [STUB] Claude WEB ajan analizi — Sprint 1 devamında implement edilecek" | tee -a "$LOG_FILE"

# 6. STUB: Notion API — Incident Log
# TODO Sprint 1 devamı: notion-create-pages MCP yerine REST API ile Incident DB'ye yaz.
echo "→ [STUB] Notion Incident Log kaydı — Sprint 1 devamında implement edilecek" | tee -a "$LOG_FILE"

echo "=== Triage tamamlandı — $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG_FILE"
