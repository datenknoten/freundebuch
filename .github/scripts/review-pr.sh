#!/usr/bin/env bash

set -e

PR_NUMBER=$1
PROMPT_FILE=".github/prompts/code-review-prompt.md"

echo "🔍 Starting AI code review for PR #${PR_NUMBER}"

# Read CLAUDE.md if exists
if [ -f CLAUDE.md ]; then
    echo "📋 Found CLAUDE.md - loading project guidelines"
    PROJECT_CONTEXT=$(cat CLAUDE.md)
fi

# Get PR data
echo "📥 Fetching PR information..."
PR_DATA=$(gh pr view $PR_NUMBER --json title,body,author,files,additions,deletions)
PR_DIFF=$(gh pr diff $PR_NUMBER)

# Get existing comments to avoid duplicates
echo "💬 Checking existing comments..."
EXISTING_COMMENTS=$(gh api "repos/$GITHUB_REPOSITORY/pulls/$PR_NUMBER/comments" \
  --jq '.[] | {path: .path, line: .line, body: .body}')

# Run AI review with full context
echo "🤖 Running AI analysis..."
claude --api-key "$ANTHROPIC_API_KEY" \
       --prompt-file "$PROMPT_FILE" \
       --context "PR_NUMBER=$PR_NUMBER" \
       --context "PR_DATA=$PR_DATA" \
       --context "PR_DIFF=$PR_DIFF" \
       --context "EXISTING_COMMENTS=$EXISTING_COMMENTS" \
       --context "PROJECT_CONTEXT=$PROJECT_CONTEXT" \
       --allowed-tools "Bash(gh:*) Read(*)"
       review

echo "✅ Review complete"
