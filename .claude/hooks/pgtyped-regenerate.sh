#!/bin/bash
# Hook: Regenerate PgTyped queries after .sql file edits
# Triggered by PostToolUse on Edit|Write events

FILE=$(jq -r '.tool_input.file_path // empty')

# Only run if the edited file is a .sql file
if [[ "$FILE" == *.sql ]]; then
  cd "$CLAUDE_PROJECT_DIR" && pnpm pgtyped 2>&1
fi
