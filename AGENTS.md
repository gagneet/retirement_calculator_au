# Repository Guidelines

## Project Structure & Module Organization

This is a browser-based Australian retirement calculator built with vanilla JavaScript, CSS, Webpack, Jest, and Playwright. Application pages live in `src/*.html`; Webpack emits built pages into `dist/`. Core JavaScript is under `src/js/`: `app.js` drives the classic advanced calculator, `advanced-v2.js` drives Advanced V2, `retirement-v3.js` drives `retirement.html`, and `reverse-ui.js` drives the reverse planner. Shared calculation code is in `src/js/calculation/`, policy helpers in `src/js/policy/` and `src/js/super-policy.js`, and simulation engines in `src/js/simulation_engine/`. CSS is in `src/css/`, static assets in `src/assets/`, docs and JSON fixtures in `docs/`, and tests in `tests/unit`, `tests/integration`, `tests/e2e`, and `tests/load`.

## Build, Test, and Development Commands

- `npm ci`: install pinned dependencies from `package-lock.json`.
- `npm run build`: produce the production `dist/` bundle via Webpack.
- `npm test -- --runInBand`: run the Jest suite serially; useful for deterministic local verification.
- `npx jest tests/unit/retirement-v3-fields.test.js --runInBand`: run a focused Jest file.
- `npm run test:e2e`: run Playwright end-to-end tests.
- `npm run test:load`: run the k6 Advanced V2 load script.
- `npm run deploy`: run `deploy.sh`; verify generated files before using it.

## Coding Style & Naming Conventions

Use ES modules, `const`/`let`, two-space indentation in source JS where practical, and clear camelCase identifiers for functions and values. Classes use PascalCase, for example `ProjectionService` and `RetirementSimulator`. Keep policy constants uppercase when already modeled that way. Prefer shared helpers over duplicating calculator logic, especially for canonical input, SG policy, import/export, and projection adapters.

## Testing Guidelines

Jest uses `jsdom` and ignores `tests/e2e/`. Name new Jest files `*.test.js` and place them near the relevant suite (`unit` or `integration`). Add focused regression tests for adapter, import/export, policy, and projection changes. For user-facing calculator work, run focused Jest, then `npm test -- --runInBand`, `npm run build`, and `git diff --check`; add Playwright smoke coverage when UI behavior changes.

## Commit & Pull Request Guidelines

Recent history uses short imperative subjects such as `Fix retirement v3 reverse planner provenance` and `Tighten retirement v3 conditional visibility`; docs-only commits may use `docs:`. Keep commits grouped by concern. PRs should describe the behavior change, list verification commands, link issues when applicable, and include screenshots or recordings for visible UI changes.

## Agent-Specific Instructions

Do not overwrite an existing `AGENTS.md`. Treat `retirement.html` and `src/js/retirement-v3.js` as the isolated V3 surface unless the task explicitly asks to modify Advanced V2. Preserve user or in-progress changes in this worktree; inspect before editing shared files.
