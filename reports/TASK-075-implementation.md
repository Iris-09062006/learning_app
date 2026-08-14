# TASK-075 — Implementation Report

## Outcome

`VERIFIED` — implemented only Phase A T001–T009. Phase B was not started and active URL
ingestion remains on the existing direct safe-fetch/Readability path.

## Implementation

- Added the vendor-neutral `WebContentExtractionProvider` request, adapter result, normalized
  application result, and stable recoverable error categories.
- Added `TavilyWebContentExtractionProvider` using native server `fetch` and only
  `TAVILY_API_KEY`.
- Locked one `POST https://api.tavily.com/extract` request with `extract_depth: basic`,
  `format: markdown`, `include_images: false`, `include_favicon: false`, `timeout: 10`, one URL,
  `cache: no-store`, and a 10-second local abort guard. No query/chunk fields, retry, Advanced,
  Crawl, or Research behavior exists.
- Validated exactly one successful `url`/`raw_content` result, an empty `failed_results` array,
  and translated only requested URL, canonical candidate, raw Markdown, and capture time.
- Added deterministic Markdown normalization, application URL validation/canonicalization,
  optional title normalization, fixed 80–200,000 normalized-character eligibility, and usable
  chunk enforcement before later promotion.
- Added provider-neutral service/route mapping: unavailable configuration/auth/quota/timeout/
  upstream failures map to generic `503`; unusable/malformed/canonical/chunk failures map to
  `422`; oversized normalized content preserves `413`; application `429` remains unchanged.
- Updated `.env.example` to describe the existing server-only `TAVILY_API_KEY` as shared by
  Tavily Search and Extract. Missing configuration is evaluated only when a provider action runs.

## Official contract relied on

- Tavily Extract API reference: https://docs.tavily.com/documentation/api-reference/endpoint/extract
- Tavily API introduction/authentication: https://docs.tavily.com/documentation/api-reference/introduction
- Tavily rate limits: https://docs.tavily.com/documentation/rate-limits

The current official reference documents base URL `https://api.tavily.com`, Bearer auth,
`POST /extract`, `urls`, Basic/Advanced depth, Markdown/text format, media flags, optional
query/chunk controls, 1–60 second timeout, and `results`/`failed_results` with successful
`url`/`raw_content`. Repository policy remains authoritative where it deliberately fixes Basic,
one URL, full-page Markdown, no filtering/media, and no retry.

## Scope proof

- `ingestUrlSource` was not switched and still calls the existing direct safe fetcher/extractor.
- Tavily Search files were not modified.
- File/PDF production behavior was not modified.
- No repository/database contract, UI, Gemini, Course generation, learner, or Exercise type was
  coupled to Tavily DTOs.
- Database migrations added: 0.
- No push, deployment, Supabase write, real Tavily request, or environment mutation was performed.
