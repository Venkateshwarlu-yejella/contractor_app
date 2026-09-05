# Site Saathi

An Android-friendly contractor management app for a family business: worker photos, attendance across sites, wages, payments and advances, worker histories, and reports.

This is the first connected pilot. It has real server persistence and authorization. It is initially published privately for the owner to review. Family access and real-device acceptance testing are the next rollout steps.

- [Build guide and architecture](docs/BUILD_GUIDE.md)
- [API contract](docs/API.md)
- [Phone wireframes](docs/wireframes.svg)
- [Relational schema](db/schema.ts)
- [Financial and access tests](tests/api-integrity.test.mjs)

## Source map

| File | Responsibility |
| --- | --- |
| `app/contractor-app.tsx` | Responsive management view, photo view, attendance and payment flows |
| `app/globals.css` | Shared visual system and mobile layouts |
| `app/api/*/route.ts` | Authorized, validated server operations |
| `lib/server.ts` | D1 and R2 access, membership, transactions, idempotency, errors |
| `lib/domain.ts` | Money, balance, date and report calculations |
| `lib/validation.ts` | Request schemas |
| `lib/seed.ts` | Clearly fictional sample workspace, created once |
| `db/schema.ts`, `drizzle/` | Database model and generated migrations |
| `types/env.d.ts` | Generated Cloudflare runtime and binding types |
| `public/sw.js` | Offline notice; no payroll data cached |
| `tests/` | Database-backed route tests and financial rule tests |

## Development

Node 24 is recommended because the tests use built-in TypeScript stripping and `node:sqlite`. The lockfile records the installed dependencies. The platform supplies D1, R2 and sign-in identity; no secrets belong in client code.

```bash
npm run install:ci
npm run db:generate   # only after a schema edit
npx tsc --noEmit
node --test tests/*.test.mjs
npm run build
```

The Sites project lifecycle owns setup, source syncing, packaging and publishing in Work Mode. Preserve `.openai/hosting.json`, the existing Vite plugins and applied migration history. Do not use real identity headers outside the trusted hosting dispatcher.

Sample records and live records are separated by `scope`. No actual workers, phone numbers or amounts have been imported. The sample portraits are AI-generated fictional people.
