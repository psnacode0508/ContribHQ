# ContribHQ

**Find your next open-source contribution.** ContribHQ collects beginner-friendly GitHub issues, adds AI-generated summaries and action plans, and helps you track the work you take on.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-149eca?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169e1?logo=postgresql)](https://www.postgresql.org/)

## What it does

- **Discover contribution opportunities** from open GitHub issues labeled `good-first-issue` or `help-wanted`.
- **Understand each issue faster** with Gemini-generated summaries, suggested next steps, difficulty, topic, and technology tags.
- **Narrow the list** by technology, area, difficulty, or a text search.
- **Track your progress** by signing in with GitHub and managing saved, in-progress, and completed issue activity.
- **Start contributing sooner** with links to the original issue and Codespaces launch support in the interface.
- **Keep issue data current** with a background sync every 30 minutes and a manual sync endpoint.

## How it works

ContribHQ is a TypeScript monorepo with two npm workspaces:

| Workspace | Role | Main technologies |
| --- | --- | --- |
| `web/` | Discovery UI, dashboard, and GitHub sign-in | Next.js 14, React 18, Tailwind CSS, NextAuth |
| `server/` | Issue and activity API, scheduled issue sync | Express, Prisma, PostgreSQL, Gemini API |

The server searches GitHub for open contribution issues, enriches new or changed issues with Gemini 2.5 Flash, and stores them in PostgreSQL. The web app reads the issue catalog from the API. GitHub sign-in is used for user activity.

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL
- A GitHub OAuth app for sign-in
- A Gemini API key for AI enrichment (optional; fallback guidance is used if it is not configured)

## Get started

1. Clone the repository and install the workspace dependencies:

   ```bash
   git clone https://github.com/psnacode0508/ContribHQ.git
   cd ContribHQ
   npm install
   ```

2. Create a PostgreSQL database and set the environment variables below. Keep secrets out of version control.

   The API loads its environment from the repository root. Next.js also needs the browser/server configuration in `web/.env.local`.

   **Repository root `.env`**
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/contribhq?schema=public"
   NEXTAUTH_SECRET="replace-with-a-long-random-secret"
   GITHUB_CLIENT_ID="your-github-oauth-client-id"
   GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
   GEMINI_API_KEY="your-gemini-api-key"
   GITHUB_PAT="your-github-personal-access-token"
   PORT=5000
   CORS_ORIGIN="http://localhost:3000"
   ```

   **`web/.env.local`**
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/contribhq?schema=public"
   NEXTAUTH_SECRET="same-secret-as-the-server"
   NEXTAUTH_URL="http://localhost:3000"
   GITHUB_CLIENT_ID="your-github-oauth-client-id"
   GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
   NEXT_PUBLIC_API_URL="http://localhost:5000"
   INTERNAL_SERVER_URL="http://localhost:5000"
   ```

   Configure your GitHub OAuth app's local callback URL as `http://localhost:3000/api/auth/callback/github`. The GitHub token is optional; without it, issue sync uses GitHub's unauthenticated API rate limits. The Gemini key is optional; without it, the server uses its built-in default issue guidance.

3. Generate the Prisma client and synchronize the database schema:

   ```bash
   npx prisma generate --schema prisma/schema.prisma
   npx prisma db push --schema prisma/schema.prisma
   ```

4. Start both the API and web app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The API health check is available at [http://localhost:5000/api/health](http://localhost:5000/api/health).

To run either workspace separately, use `npm run dev:server` or `npm run dev:web`. To build both, run `npm run build`.

## Issue sync

The API starts a sync job every 30 minutes. You can also request a sync manually:

```bash
curl -X POST http://localhost:5000/api/sync
```

The discovery API exposes:

- `GET /api/health` — service health
- `GET /api/issues` — paginated issue list; supports `page`, `limit`, `tech`, `subField`, `difficulty`, and `search`
- `GET /api/issues/filters` — available filter values
- `POST /api/sync` — trigger an issue sync

Activity endpoints are authenticated with the NextAuth bearer token:

- `POST /api/activity/launch`
- `GET /api/activity/me`
- `PATCH /api/activity/:activityId`

## Project layout

```text
.
├── prisma/             # PostgreSQL schema and seed script
├── server/
│   └── src/
│       ├── routes/     # Issue and user activity endpoints
│       ├── services/   # GitHub fetching, Gemini enrichment, scheduled sync
│       └── middleware/ # Authentication
├── web/
│   └── src/
│       ├── app/        # Discovery page, dashboard, and auth route
│       ├── components/ # Shared interface components
│       └── lib/        # API client, auth, and Prisma
└── package.json        # npm workspace scripts
```

## Data and privacy

Issue metadata and AI-generated guidance are stored in the configured PostgreSQL database. GitHub OAuth profile details and contribution activity are stored to support sign-in and the dashboard. Configure credentials in your own environment and review the provider terms and privacy requirements that apply to your deployment.

## Contributing

Contributions are welcome. Open an issue to discuss a substantial change, then submit a pull request with a clear description and any relevant verification steps.

## License

No license file is currently present in this repository. Contact the maintainers before reusing or redistributing the code.
