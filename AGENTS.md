# Agent Guidelines

## Repository Overview

This repository is a monorepo configured with Turborepo and managed via `pnpm`.

### Directory Structure

- `apps/`: Applications directory
  - `apps/demo/`: Next.js demo application
- `packages/`: Packages directory
  - `packages/core/`: Core library for the comic viewer

## Development Commands

- `pnpm build`: Build all workspace packages and applications.
- `pnpm test`: Run test suites.
- `pnpm typecheck`: Run TypeScript type checking across packages.
- `pnpm check`: Run linter and formatter checks.
- `pnpm fix`: Automatically fix linting and formatting issues.

## Rules & Conventions

### Language

- Use **English** consistently for all code comments, `.md` documentation, commit messages, Issue discussions, and Pull Request titles/descriptions.

### Commit Messages

- Adhere to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- Record AI assistance using the trailer format (adapted from the [Linux Kernel AI Coding Assistants guidelines](https://docs.kernel.org/process/coding-assistants.html)):
  - Use `git commit --trailer "Assisted-by: AGENT_NAME:MODEL_VERSION"` when committing.
  - Do **NOT** include authorship-asserting trailers such as `Signed-off-by` or `Co-authored-by`.

### Pull Requests

- **Note:** Since GitHub settings may use the PR title and description as the commit message upon merging, PRs must follow the exact same rules as the **Commit Messages** section:
  - Format the PR title according to Conventional Commits.
  - Append the `Assisted-by` trailer (as defined above) at the very end of the PR description.
