# Scripts — MCP Zinciri Runner'ları

> Bu klasör plugin'in **otonom çalışma** scriptlerini barindirir.
> `.github/workflows/` altındaki cron job'lar bu scriptleri tetikler.

## Mevcut zincirler

| Script | Zincir | Cron | Durum |
|---|---|---|---|
| `run-deploy-triage.sh` | Chain 2 — Vercel deploy fail triage | Her 6 saat | 🟡 Sprint 1 ISKELET (stub'lar var) |
| `run-content-radar.sh` | Chain 1 — GCal→CON→Notion içerik fırsatı | Cuma 16:00 UTC | ⚪ Sprint 2 |
| `run-cert-pipeline.sh` | Chain 3 — Gmail sertifika otomatik yayın | Saatlik | ⚪ Sprint 3 |

## Setup — GitHub Actions Secrets

Plugin repo → Settings → Secrets and variables → Actions → New secret:

| Secret | Nereden | Kullanım |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com/settings/keys | Claude API call'ları |
| `VERCEL_TOKEN` | vercel.com/account/tokens | Deploy state + log API |
| `VERCEL_TEAM_ID` | `team_a9MIpygh4KGHrdhTQgHYrG7A` (route34) | Vercel API path |
| `VERCEL_PROJECT_ID` | `prj_i1bszxeuqlWGSw7Lkae97pfKmm7O` (hayrettinsendil) | Vercel API path |
| `NOTION_API_KEY` | notion.so/my-integrations | Incident Log write |
| `NOTION_INCIDENT_DB` | Notion DB "Incident Log" UUID | Hedef database |

VERCEL_TEAM_ID ve VERCEL_PROJECT_ID public bilgi olabilir ama secrets'ta tutulması daha temiz.

## Manuel test (UI'dan)

1. Plugin repo → Actions tab
2. Sol panelde "Chain 2 — Vercel Deploy Triage"
3. Sağda "Run workflow" → Run
4. Çıktıyı izle
5. Artifact `triage-log-<run_id>` — log dosyası indirilebilir

## Manuel test (lokal)

```bash
# .env dosyası oluştur (asla commit etme — .gitignore'da)
export ANTHROPIC_API_KEY=sk-ant-...
export VERCEL_TOKEN=...
export VERCEL_TEAM_ID=team_a9MIpygh4KGHrdhTQgHYrG7A
export VERCEL_PROJECT_ID=prj_i1bszxeuqlWGSw7Lkae97pfKmm7O
export NOTION_API_KEY=secret_...
export NOTION_INCIDENT_DB=...

bash scripts/run-deploy-triage.sh
```

## Sprint 1 ISKELET — ne iş görüyor

Şu an `run-deploy-triage.sh`:
- ✅ Env var kontrolü
- ✅ Vercel API'den son deployment state
- ✅ State READY ise no-op exit
- ✅ State ERROR ise build log indir + log dosyasına yaz
- 🚧 Claude WEB ajan analizi (STUB)
- 🚧 Notion Incident Log kaydı (STUB)

## Sprint 1 devamı (sonraki oturum)

1. **Claude API çağrısı:** Anthropic Messages API + `references/WEB.md` system prompt + build log + commit SHA → root cause analizi
2. **Notion REST API:** Incident Log database'ine sayfa oluşturma (title=commit SHA, properties=state/url/timestamp, content=Claude analizi)
3. **Smoke test:** kasten bozuk commit at, ERROR tetikle, zincirin uçtan uca çalıştığını gör

## Risk profili

| Risk | Olasılık | Etki | Kontrol |
|---|---|---|---|
| Anthropic API rate limit | Düşük | Düşük | 6 saatte bir = 4/gün, sorun yok |
| Vercel API rate limit | Çok düşük | Düşük | 100 req/sa, fazlasıyla yeterli |
| Notion API rate limit | Düşük | Düşük | 3 req/sn ortalama, kotaya uzak |
| Yanlış analiz → yanlış Notion kaydı | Düşük | Düşük | Sadece okuma + log, eylem yok |
| GitHub Actions cron tetiklemez | Düşük | Orta | Manual workflow_dispatch ile fallback |
| Secret sızıntısı | Çok düşük | Yüksek | GitHub secrets encrypted, log'a yazma |

## Token maliyeti tahmini

| Senaryo | Token/run | Run/ay | $/ay |
|---|---|---|---|
| Zincir 2 (sadece ERROR'da analiz) | ~2K (ortalama ayın %10'unda fail) | ~120 | ~$0.30 |
| Zincir 1 (haftalık içerik radarı) | ~5K | 4 | ~$0.20 |
| Zincir 3 (saatlik Gmail polling) | ~500 (sadece eşleşen mailde tam analiz) | ~720 | ~$1.50 |
| **Toplam** | | | **~$2/ay** |

Bazı olmayan tahminler, gerçek maliyet izlenir. Anthropic Console'da kullanım takip edilir.
