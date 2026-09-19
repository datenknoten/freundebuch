#!/usr/bin/env bash
# semantic-release prepare step: bump versions, build the frontend tarball that
# @semantic-release/gitlab attaches to the release. Runs from the repo root.
set -euo pipefail
VERSION="${1:?usage: release-prepare.sh <version>}"

aube version:sync "$VERSION"
aube --filter @freundebuch/shared run build
aube --filter @freundebuch/frontend run build
tar -czf "frontend-${VERSION}.tar.gz" -C apps/frontend build
