# LearningApp

Use Node.js 22.x, copy `.env.example` to an untracked `.env.local`, and configure only the
server/public variables required by the workflow being exercised. `TAVILY_API_KEY` is server-only:
ordinary builds and file/PDF or stored-evidence workflows do not require it, while topic Research
and new manual/discovered web URL ingestion do. Never create `NEXT_PUBLIC_TAVILY_API_KEY`.

Repository gates:

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

See `docs/deployment.md` for environment-specific prerequisites and the non-destructive Tavily
rollback procedure. The live Tavily integration smoke is explicit opt-in and documented in
`specs/002-tavily-web-ingestion/quickstart.md`; it is not part of ordinary unit/CI/E2E execution.
