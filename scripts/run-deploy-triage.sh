#!/usr/bin/env bash
# Chain 2 — Vercel Deploy Triage runner (v1.1.0)
#
# Mantık:
#   1. Vercel API → son production deployment state
#   2. State READY → çık (no-op)
#   3. State ERROR → build log indir, Claude WEB ajan analizi, Notion'a kaydet

set -euo pipefail

LOG_FILE="triage-log.txt"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== Chain 2 Deploy Triage — $TIMESTAMP ===" | tee -a "$LOG_FILE"

# 1. Required env check
required_vars=("ANTHROPIC_API_KEY" "VERCEL_TOKEN" "VERCEL_TEAM_ID" "VERCEL_PROJECT_ID" "NOTION_API_KEY" "NOTION_INCIDENT_DB")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "⚠️  Missing required env: $var" | tee -a "$LOG_FILE"
    echo "→ Skipping (Secrets henuz konfigure edilmemiş olabilir)" | tee -a "$LOG_FILE"
    exit 0
  fi
done

# 2. Vercel API — son production deployment
echo "→ Vercel API: son production deployment..." | tee -a "$LOG_FILE"

DEPLOY_JSON=$(curl -sS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_TEAM_ID}&limit=1&target=production")

STATE=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].state // "UNKNOWN"')
DEPLOY_ID=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].uid // ""')
DEPLOY_URL=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].url // ""')
COMMIT_SHA=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].meta.githubCommitSha // ""')
COMMIT_MSG=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].meta.githubCommitMessage // ""')
COMMIT_REF=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].meta.githubCommitRef // "main"')
CREATED_AT=$(echo "$DEPLOY_JSON" | jq -r '.deployments[0].created // ""')

echo "  State:    $STATE" | tee -a "$LOG_FILE"
echo "  Deploy:   $DEPLOY_ID" | tee -a "$LOG_FILE"
echo "  URL:      $DEPLOY_URL" | tee -a "$LOG_FILE"
echo "  Commit:   $COMMIT_SHA" | tee -a "$LOG_FILE"
echo "  Branch:   $COMMIT_REF" | tee -a "$LOG_FILE"
echo "  Message:  $COMMIT_MSG" | tee -a "$LOG_FILE"

# 3. State kararı
if [ "$STATE" != "ERROR" ]; then
  echo "✅ Son deployment OK ($STATE) — triage gerekmiyor" | tee -a "$LOG_FILE"
  exit 0
fi

echo "🚨 ERROR state — triage başlıyor..." | tee -a "$LOG_FILE"

# 4. Build log çek (son 80 satır)
echo "→ Build log indiriliyor..." | tee -a "$LOG_FILE"
BUILD_LOG=$(curl -sS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v3/deployments/${DEPLOY_ID}/events?teamId=${VERCEL_TEAM_ID}&builds=1" \
  | jq -r '[.[] | select(.type == "stderr" or .type == "stdout") | .text] | join("\n")' \
  | tail -80)

if [ -z "$BUILD_LOG" ]; then
  BUILD_LOG="(Build log empty veya API'den çekilemedi)"
fi

echo "--- Build log (son 80 satır) ---" >> "$LOG_FILE"
echo "$BUILD_LOG" >> "$LOG_FILE"
echo "--- end log ---" >> "$LOG_FILE"

# 5. Claude API — WEB ajan analizi
echo "→ Claude WEB ajan: root cause analizi..." | tee -a "$LOG_FILE"

# WEB.md system prompt (skill referans dosyası — gerçek context isolation)
WEB_PROMPT_FILE="plugins/hs-site-team/skills/hs-site-po/references/WEB.md"
if [ ! -f "$WEB_PROMPT_FILE" ]; then
  echo "⚠️  $WEB_PROMPT_FILE not found — using inline fallback" | tee -a "$LOG_FILE"
  SYSTEM_PROMPT="Sen Next.js 16 + React 19 uzmanı WEB ajansın. Türkçe yanıt ver. Kısa, eylem-odaklı."
else
  SYSTEM_PROMPT=$(cat "$WEB_PROMPT_FILE")
fi

USER_PROMPT=$(cat <<EOF
hayrettinsendil.tr Vercel production deployment FAIL etti.

## Deployment bilgisi
- Deploy ID: $DEPLOY_ID
- Commit SHA: $COMMIT_SHA
- Branch: $COMMIT_REF
- Commit message: $COMMIT_MSG
- URL: $DEPLOY_URL
- Created: $CREATED_AT

## Build log (son 80 satır)
\`\`\`
$BUILD_LOG
\`\`\`

## Görev

3 maddede kısa rapor ver:
1. **Root cause** — build neden kirildi? (1-2 cümle)
2. **Önerilen fix** — hangi dosya, ne değişmeli? (3-5 satır somut)
3. **Severity** — P0/P1/P2 + neden

Markdown form. Maksimum 300 kelime.
EOF
)

# Anthropic Messages API call
ANALYSIS_JSON=$(curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "$(jq -n \
    --arg sys "$SYSTEM_PROMPT" \
    --arg user "$USER_PROMPT" \
    '{
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: $sys,
      messages: [{role: "user", content: $user}]
    }')")

ANALYSIS=$(echo "$ANALYSIS_JSON" | jq -r '.content[0].text // "(Claude API dönüşü çözümlenemedi)"')
INPUT_TOKENS=$(echo "$ANALYSIS_JSON" | jq -r '.usage.input_tokens // 0')
OUTPUT_TOKENS=$(echo "$ANALYSIS_JSON" | jq -r '.usage.output_tokens // 0')

echo "→ Claude tamamlandı (in=$INPUT_TOKENS, out=$OUTPUT_TOKENS tokens)" | tee -a "$LOG_FILE"
echo "" >> "$LOG_FILE"
echo "--- Analiz ---" >> "$LOG_FILE"
echo "$ANALYSIS" >> "$LOG_FILE"
echo "--- end analiz ---" >> "$LOG_FILE"

# 6. Notion — Incident sayfası oluştur
echo "→ Notion: incident sayfası yazılıyor..." | tee -a "$LOG_FILE"

SHORT_SHA="${COMMIT_SHA:0:7}"
PAGE_TITLE="Deploy ERROR — ${SHORT_SHA} (${TIMESTAMP})"

# Notion'da inline limit 2000 char per rich_text block — ANALYSIS'i böl
NOTION_PAYLOAD=$(jq -n \
  --arg parent "$NOTION_INCIDENT_DB" \
  --arg title "$PAGE_TITLE" \
  --arg deploy_id "$DEPLOY_ID" \
  --arg deploy_url "$DEPLOY_URL" \
  --arg commit_sha "$COMMIT_SHA" \
  --arg commit_msg "$COMMIT_MSG" \
  --arg analysis "$ANALYSIS" \
  --arg log_excerpt "$(echo "$BUILD_LOG" | head -30)" \
  --arg tokens "in=$INPUT_TOKENS, out=$OUTPUT_TOKENS" \
  '{
    parent: {page_id: $parent},
    properties: {
      title: {title: [{text: {content: $title}}]}
    },
    children: [
      {object: "block", type: "heading_2", heading_2: {rich_text: [{text: {content: "Deployment Bilgisi"}}]}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: ("Deploy ID: " + $deploy_id)}}]}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: ("URL: " + $deploy_url)}}]}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: ("Commit: " + $commit_sha)}}]}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: ("Mesaj: " + $commit_msg)}}]}},
      {object: "block", type: "heading_2", heading_2: {rich_text: [{text: {content: "Claude WEB Ajan Analizi"}}]}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: $analysis}}]}},
      {object: "block", type: "heading_2", heading_2: {rich_text: [{text: {content: "Build Log (ilk 30 satır)"}}]}},
      {object: "block", type: "code", code: {language: "plain text", rich_text: [{text: {content: $log_excerpt}}]}},
      {object: "block", type: "divider", divider: {}},
      {object: "block", type: "paragraph", paragraph: {rich_text: [{text: {content: ("Token kullanımı: " + $tokens)}}]}}
    ]
  }')

NOTION_RESP=$(curl -sS https://api.notion.com/v1/pages \
  -H "Authorization: Bearer ${NOTION_API_KEY}" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "$NOTION_PAYLOAD")

NOTION_PAGE_ID=$(echo "$NOTION_RESP" | jq -r '.id // ""')
NOTION_URL=$(echo "$NOTION_RESP" | jq -r '.url // ""')

if [ -z "$NOTION_PAGE_ID" ]; then
  echo "⚠️  Notion kaydı başarısız:" | tee -a "$LOG_FILE"
  echo "$NOTION_RESP" | tee -a "$LOG_FILE"
  exit 1
fi

echo "✅ Notion sayfası oluşturuldu:" | tee -a "$LOG_FILE"
echo "  ID:  $NOTION_PAGE_ID" | tee -a "$LOG_FILE"
echo "  URL: $NOTION_URL" | tee -a "$LOG_FILE"

echo "=== Triage tamamlandı — $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG_FILE"
