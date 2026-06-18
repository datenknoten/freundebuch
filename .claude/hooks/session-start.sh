#!/bin/bash
# SessionStart hook for Claude Code on the web.
#
# Bootstraps the repo's mise-managed toolchain (node, aube, hk, pkl) and lets
# mise's postinstall register hk's git hooks, so commit-msg / pre-commit /
# pre-push run the same checks as a local checkout — including commitlint on
# commit messages.
#
# Why not the usual `curl https://mise.run | sh`? The web sandbox's network
# policy blocks mise.run / mise.jdx.dev, so we fetch the mise binary straight
# from GitHub Releases instead. Resolving aube/hk/pkl additionally goes through
# the GitHub API, which is rate-limited (60/h) for unauthenticated requests —
# set a GITHUB_TOKEN (or GH_TOKEN) env secret in the environment so
# `mise install` can authenticate and finish the toolchain + git hooks.
#
# Resilient by design: missing token / network hiccups print a warning but
# never abort the session (always exits 0).
set -uo pipefail

# Only run in the remote (Claude Code on the web) sandbox.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOCAL_BIN="$HOME/.local/bin"
SHIMS_DIR="$HOME/.local/share/mise/shims"
export PATH="$LOCAL_BIN:$SHIMS_DIR:$PATH"
export MISE_YES=1
# mise reads GITHUB_TOKEN/MISE_GITHUB_TOKEN; also accept GH_TOKEN for convenience.
export MISE_GITHUB_TOKEN="${MISE_GITHUB_TOKEN:-${GITHUB_TOKEN:-${GH_TOKEN:-}}}"
# The web sandbox routes all egress through a TLS-intercepting proxy whose CA
# lives in the system bundle (SSL_CERT_FILE/NODE_EXTRA_CA_CERTS) — curl and node
# trust it, but aube's Rust TLS stack uses its own bundled roots and honors
# neither that bundle nor an .npmrc `cafile`, so every HTTPS fetch to the
# registry silently stalls at 0 B until timeout. Disabling aube's cert check
# (scoped to this ephemeral sandbox, where the proxy is the trusted egress) lets
# `aube install` reach the registry. Harmless outside the sandbox.
export NPM_CONFIG_STRICT_SSL=false

log() { printf '[session-start] %s\n' "$*"; }

# --- 1. Persist tool paths for every later shell (and the git hooks) ----------
# Subsequent Bash invocations are initialized from the user profile + this env
# file. The hk hooks run via `mise x` (HK_MISE=1), so `mise` must be on PATH.
if [ -n "${CLAUDE_ENV_FILE:-}" ] && ! grep -q 'mise/shims' "$CLAUDE_ENV_FILE" 2>/dev/null; then
  {
    echo 'export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"'
    echo 'export HK_MISE=1'
    # So manual `aube`/`pnpm` commands later in the session also clear the
    # sandbox's TLS-intercepting proxy (see NPM_CONFIG_STRICT_SSL note above).
    echo 'export NPM_CONFIG_STRICT_SSL=false'
  } >> "$CLAUDE_ENV_FILE"
fi

# --- 2. Install the mise binary from GitHub Releases (mise.run is blocked) -----
if ! command -v mise >/dev/null 2>&1; then
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) log "unsupported arch $(uname -m); skipping toolchain setup"; exit 0 ;;
  esac
  # Discover the latest tag via the redirect target so we avoid api.github.com.
  tag=$(basename "$(curl -fsSL -o /dev/null -w '%{url_effective}' \
    https://github.com/jdx/mise/releases/latest 2>/dev/null)")
  if [ -z "$tag" ] || [ "$tag" = "latest" ]; then
    log "could not determine latest mise version; skipping toolchain setup"
    exit 0
  fi
  log "installing mise $tag (linux-$arch) from GitHub Releases"
  mkdir -p "$LOCAL_BIN"
  if ! curl -fSL --retry 3 -o "$LOCAL_BIN/mise" \
    "https://github.com/jdx/mise/releases/download/${tag}/mise-${tag}-linux-${arch}"; then
    log "mise download failed; skipping toolchain setup"
    exit 0
  fi
  chmod +x "$LOCAL_BIN/mise"
fi
log "mise $(mise --version 2>/dev/null)"

# --- 3. Install the pinned toolchain + register git hooks (mise postinstall) ---
# mise's postinstall (`hk install --mise`) evaluates hk.pkl, which makes pkl
# fetch the remote `hk` pkl package over the sandbox's TLS-intercepting proxy.
# pkl (native/JVM) trusts neither the system bundle nor SSL_CERT_FILE, so that
# fetch fails cert validation and the git hooks never get registered — even
# though `mise install` itself still returns 0. Work around it by priming pkl's
# package cache with the proxy CA passed explicitly (`--ca-certificates`), then
# (re)running `hk install --mise`, which now resolves hk.pkl from cache offline.
register_hk_hooks() {
  local ca="${SSL_CERT_FILE:-/etc/ssl/certs/ca-certificates.crt}"
  command -v hk >/dev/null 2>&1 || return 1
  if command -v pkl >/dev/null 2>&1 && [ -f "$ca" ]; then
    pkl eval --ca-certificates "$ca" -f json "$PROJECT_DIR/hk.pkl" >/dev/null 2>&1 || true
  fi
  hk install --mise >/dev/null 2>&1
}

cd "$PROJECT_DIR" || exit 0
mise trust "$PROJECT_DIR" >/dev/null 2>&1 || true
if mise install; then
  mise reshim >/dev/null 2>&1 || true
  if register_hk_hooks; then
    log "toolchain installed (node, aube, hk, pkl); hk git hooks registered"
  else
    log "toolchain installed; WARN: could not register hk git hooks (commit-msg/"
    log "      pre-commit/pre-push won't run locally). The rest of the setup is fine."
  fi
else
  log "WARN: 'mise install' could not install every tool."
  if [ -z "${MISE_GITHUB_TOKEN}" ]; then
    log "WARN: no GITHUB_TOKEN found. aube/hk/pkl resolve via the GitHub API,"
    log "      which is rate-limited without auth. Add a GITHUB_TOKEN env secret"
    log "      to this environment so future sessions finish the setup."
  fi
fi

# --- 4. Install JS dependencies (cached into the container for next session) ---
if command -v aube >/dev/null 2>&1; then
  log "installing JS dependencies with aube"
  aube install || log "WARN: 'aube install' failed"
else
  log "WARN: aube not available yet; skipping JS dependency install"
fi

log "done"
