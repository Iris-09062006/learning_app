# TASK-073 Implementation Report

## Outcome

The Phase 4 default web-search provider now uses optional, server-only Tavily Search through the
existing `WebSearchProvider` abstraction. Brave remains only as unused compatibility code. No
database schema, migration, Supabase state, Phase 1–3 behavior, push, or deployment changed.

## Focused implementation

- Added `TavilyWebSearchProvider` using `POST https://api.tavily.com/search` with bearer auth from
  `TAVILY_API_KEY` only.
- Fixed every request to `search_depth: "basic"` and `auto_parameters: false`; answer, raw content,
  and images are disabled and `max_results` remains bounded to 20.
- Mapped only title, URL, content snippet, neutral language, and provider rank into the existing
  vendor-neutral result contract.
- Preserved stateless Research More through a bounded opaque Tavily cursor and deterministic
  language-aware query refinement inside the adapter.
- Mapped authentication, quota/rate-limit/plan limit, timeout, malformed/invalid response, and
  other upstream failures into the existing provider error taxonomy.
- Switched only the service default constructor from Brave to Tavily; injected providers and the
  surrounding deterministic Phase 4 orchestration are unchanged.
- Documented Tavily as an optional server-only deployment capability. Missing credentials affect
  Research only; manual URL/file/PDF and legacy flows remain available.

## Scope confirmation

Migration `030_topic_course_multi_source.sql` and every file under `supabase/` are unchanged. No
live Tavily request, Supabase command, migration, push, or deployment was performed.
