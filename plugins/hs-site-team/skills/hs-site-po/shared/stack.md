# Tech Stack — hayrettinsendil.tr

## Framework

- **Next.js** 16.2.6 (App Router, Turbopack bundler)
- **React** 19.2.4
- **TypeScript** 5
- **Tailwind CSS** 4 (`@tailwindcss/postcss`)
- **@tailwindcss/typography** 0.5 (prose stilleri, blog için)

## Blog

- **next-mdx-remote** 6 (MDX render, RSC uyumlu)
- **gray-matter** 4 (frontmatter parse)
- **reading-time** 1.5 (okuma süresi)
- MDX dosyaları: `content/posts/<slug>.mdx`
- Library: `src/lib/posts.ts` (`getAllPosts`, `getPostBySlug`)

## Newsletter (kurulu, kullanılmamış)

- **@supabase/ssr** 0.10
- **@supabase/supabase-js** 2.106
- Form ve email entegrasyonu henüz yok

## Font

- **Outfit** (next/font/google, weights 400-800)

## Host & Deploy

- **Vercel** (proje: hayrettinsendil, team: route34)
- Domain: `hayrettinsendil.tr` (apex), `www` → apex 308 redirect
- Auto-deploy: `main` push → Vercel build → production
- Build cache aktif, ~15s build süresi
- Single branch flow (preview branch'ler kullanılmıyor)

## SEO & Analytics

- **GA4:** `G-NK3390N3CM` (Realtime + Enhanced Measurement aktif)
- **Google Search Console:** Bağlı, sitemap onaylı
- **GA4 ↔ GSC link:** Yapılmış
- **Sitemap:** Dinamik `src/app/sitemap.ts`
- **Robots:** Dinamik `src/app/robots.ts`
- **RSS:** `src/app/blog/rss.xml/route.ts` (1h CDN cache)

## MCP Bağlantıları

- **GitHub MCP** — site repo commit/PR/issue
- **Vercel MCP** — deploy durum, build log, project info
- **Notion MCP** — içerik draft, takvim (opsiyonel)
- **Supabase MCP** — newsletter ileride

## Çevre Değişkenleri

Vercel'de tanımlı (asla repo'ya commit edilmez):
- (Şu an env yok — newsletter eklendiğinde `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY` gibi)

## Son Sprint Özeti

- **2026-05-24:** Analitik altyapı + pozisyonlama yeniden yazımı + görsel optimizasyonu (23 görev)
- **2026-05-25:** OG image (site default + blog dinamik) + RSS alternate link (4 commit)
