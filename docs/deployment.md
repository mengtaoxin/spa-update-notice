# Deployment (Vercel + GitHub Actions)

Production can be published from **GitHub Actions** via the Vercel CLI. This repo is a **pure static** site (no install/build step, no npm publish). There are no Vercel Functions.

| Setting        | Value                                      |
| -------------- | ------------------------------------------ |
| Framework      | Other (static files at repo root)          |
| Node (Actions) | **26.x** (matches Vercel project setting)  |
| Output         | `index.html`, `update-required.js`, etc.   |
| Production URL | `https://spa-update-notice.smt.sh`         |

Repo config: [`vercel.json`](../vercel.json) (Cache-Control headers only — no SPA fallback rewrites). Workflow: [`.github/workflows/vercel-production.yml`](../.github/workflows/vercel-production.yml) (`push` to `main`, `workflow_dispatch`).

Vercel project (for secret values, use the dashboard — never commit them):

| Item        | ID |
| ----------- | -- |
| Team        | `team_gXNHj6GPQC1wd8fKdO0mWaMT` |
| Project     | `prj_Eqetp5ng1QLVKU9X4mKlKzrLYAHF` |

## GitHub secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret              | Purpose |
| ------------------- | ------- |
| `VERCEL_TOKEN`      | Vercel token with deploy access for the team/project |
| `VERCEL_ORG_ID`     | Team ID: `team_gXNHj6GPQC1wd8fKdO0mWaMT` |
| `VERCEL_PROJECT_ID` | Project ID: `prj_Eqetp5ng1QLVKU9X4mKlKzrLYAHF` |

`NODE_AUTH_TOKEN` is **not** required (no private npm packages, no `npm ci`).

After a one-time local `vercel link`, IDs also appear in `.vercel/project.json` (gitignored).

## Transition from Vercel Git auto-deploy

**This repository may still have Vercel Git integration enabled.** Until you turn that off in the Vercel project settings, a push to `main` can trigger **two** production publishes:

1. Vercel’s Git-connected auto-deploy (existing behavior)
2. This GitHub Actions workflow (after merge and secrets are configured)

Recommended rollout:

1. Merge the Actions workflow and add the three secrets above.
2. Run **Actions → Vercel production → Run workflow** (or push to `main`) and confirm the deployment at `https://spa-update-notice.smt.sh`.
3. In the Vercel dashboard, disable **Git** auto-deploy for this project so only Actions publishes production.

DNS, domains, and billing are unchanged by this workflow.

## Workflow behavior

Each run: checkout → verify static files → `vercel pull` (production) → `vercel build --prod` → `vercel deploy --prebuilt --prod`.

- Concurrency group `vercel-production` with `cancel-in-progress: false` — overlapping production deploys are not aborted.
- `permissions: contents: read` only.
- No runs on pull requests, so production secrets are not exposed to untrusted forks.

Vercel CLI **50.x** requires Node `>= 18`; Node **26** on Actions is compatible.