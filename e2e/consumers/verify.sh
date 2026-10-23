#!/usr/bin/env bash
# Packs the package and checks the tarball from throwaway consumer projects,
# which install it with npm outside the workspace. Pass consumer names to check
# only those; KEEP_WORK_DIR=1 leaves the projects behind for inspection.
set -euo pipefail

consumers_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
package_dir=$(cd "$consumers_dir/../../packages/core" && pwd)
work_dir=$(mktemp -d)

if [[ "${KEEP_WORK_DIR:-}" == 1 ]]; then
  echo "Consumer projects are kept in $work_dir"
else
  trap 'rm -rf "$work_dir"' EXIT
fi

if [[ $# -eq 0 ]]; then
  set -- types next vite
fi

pnpm --dir "$package_dir" pack --out "$work_dir/comic-viewer.tgz"

for consumer in "$@"; do
  echo "::group::$consumer consumer"
  cp -R "$consumers_dir/$consumer" "$work_dir/$consumer"
  # Versions younger than the three days Renovate waits are not installed.
  npm install --prefix "$work_dir/$consumer" --min-release-age=3 \
    --no-audit --no-fund
  npm run --prefix "$work_dir/$consumer" verify
  echo "::endgroup::"
done
