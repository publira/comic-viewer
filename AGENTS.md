# Agent Guidelines

## Repository Overview

This repository is a monorepo configured with Turborepo and managed via `pnpm`.

The root `package.json` pins the toolchain: Node.js through `devEngines.runtime` (with `onFail: "download"`, pnpm downloads that version when the active one differs) and pnpm through `packageManager`. The workflows read both from there, so change these versions in `package.json` only.

### Directory Structure

- `apps/`: Applications directory
  - `apps/demo/`: Next.js demo application styled with the bundled stylesheet
  - `apps/demo-tw/`: Next.js demo application styled with Tailwind CSS
  - `apps/website/`: Next.js landing page for the apex domain
- `packages/`: Packages directory
  - `packages/core/`: Core library for the comic viewer

## Development Commands

- `pnpm build`: Build all workspace packages and applications.
- `pnpm test`: Run test suites.
- `pnpm test:package`: Pack `packages/core` and check the tarball from the TypeScript, Next.js, and Vite projects in `e2e/consumers/`, installed with npm outside the workspace (needs network access).
- `pnpm typecheck`: Run TypeScript type checking across packages.
- `pnpm check`: Run linter and formatter checks.
- `pnpm fix`: Automatically fix linting and formatting issues.

`pnpm install` also installs a lefthook pre-commit hook (`lefthook.yml`) that formats the staged JavaScript, TypeScript, CSS, JSON, Markdown, and YAML files with oxfmt and stages the result. It does not lint, so run `pnpm check` before pushing.

## Rules & Conventions

### Language

- Use **English** consistently for all code comments, `.md` documentation, commit messages, Issue discussions, and Pull Request titles/descriptions.
- Answer the user in the language of their own prose. Quoted logs, code, or UI strings do not decide it. Answer in English when no user prose settles it, such as in a scheduled or CI-started run.

### Commit Messages

- Adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- Record AI assistance using the trailer format (adapted from the [Linux Kernel AI Coding Assistants guidelines](https://docs.kernel.org/process/coding-assistants.html)):
  - Use `git commit --trailer "Assisted-by: AGENT_NAME:MODEL_VERSION"` when committing.
  - Do **NOT** include authorship-asserting trailers such as `Signed-off-by` or `Co-authored-by`.

### Pull Requests

- **Note:** Since GitHub settings may use the PR title and description as the commit message upon merging, PRs must follow the exact same rules as the **Commit Messages** section:
  - Format the PR title according to Conventional Commits.
  - Append the `Assisted-by` trailer (as defined above) at the very end of the PR description.

### TypeScript

- `packages/core` builds its declarations with Oxc through tsdown, because TypeScript 7 has no compiler API for `tsc`'s declaration emit. Oxc reads each file on its own, so `isolatedDeclarations` requires every export to carry the types its declaration needs, such as a component's `JSX.Element` return type, and `pnpm typecheck` reports a missing one.
- The code stays within erasable syntax (`erasableSyntaxOnly`).
