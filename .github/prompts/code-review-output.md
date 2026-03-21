# Code Review Output Format

Comment formatting, summary template, and posting mechanics for automated code reviews.

-----

## Inline Comments (New Issues Only)

For each new issue, post an inline comment:

```bash
gh api "repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}/comments" \
  -X POST \
  -f body="🚨 **Security: SQL Injection**

This query uses string concatenation with user input, allowing SQL injection attacks.

**Suggested fix:**
\`\`\`python
query = \"SELECT * FROM users WHERE id = ?\"
cursor.execute(query, (user_id,))
\`\`\`" \
  -f commit_id="$GITHUB_SHA" \
  -f path="src/db/users.py" \
  -F line=45
```

**Comment Format:**

~~~
[ICON] **[Category]: [Brief Title]**

[1-2 sentence explanation of impact/risk]

**Suggested fix:**
```[language]
[concrete code example]
```
~~~

**Volume Limit:** Maximum 10 inline comments per run. Prioritize: Critical > Important > Suggestion.

-----

## Summary Comment (Always Required)

**This summary must ALWAYS be posted or updated, even when no issues are found.**

> **IMPORTANT**: The summary body MUST be multi-line GitHub-flavored Markdown.
> Never flatten it into a single line or use pipe-delimited text.
> Always use the exact structure shown below — headers, tables, bullet lists, and footer.

**Step 1 — Find existing summary comment:**

```bash
SUMMARY_ID=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
  --jq '.[] | select(.body | contains("<!-- CLAUDE_CODE_REVIEW -->")) | .id' | head -1)
```

**Step 2 — Write the summary body to a temporary file:**

You MUST write the summary to a temp file to preserve Markdown formatting. Set shell
variables for your review data first, then write the file using `cat` with a heredoc.
The file content must follow this exact structure — do not omit or reorder sections:

```bash
# Set these variables based on your review findings:
SHORT_SHA=$(echo "$GITHUB_SHA" | head -c 7)
REVIEW_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# STATUS: one of "✅ Approved", "⚠️ Comments", "🚨 Changes Requested"
# CRITICAL_COUNT, IMPORTANT_COUNT, SUGGESTION_COUNT: integer counts
# SUMMARY_TEXT: 1-3 sentence prose summary of the review
# COMPLIANCE_LINES: multi-line string of "- ✅/❌ ..." items derived from AGENTS.md
#   (use the actual rules you read from AGENTS.md — do NOT use generic placeholders)

cat > /tmp/review-summary.md << ENDOFSUMMARY
<!-- CLAUDE_CODE_REVIEW -->
## 🔍 Automated Code Review

| | |
|---|---|
| **Commit** | \`${SHORT_SHA}\` |
| **Reviewed** | ${REVIEW_DATE} |
| **Status** | ${STATUS} |

### Findings

| Severity | Count |
|----------|-------|
| 🚨 Critical | ${CRITICAL_COUNT} |
| ⚠️ Important | ${IMPORTANT_COUNT} |
| 💡 Suggestion | ${SUGGESTION_COUNT} |

### AGENTS.md Compliance

${COMPLIANCE_LINES}

### Summary

${SUMMARY_TEXT}

---
<sub>🤖 Automated review by Claude Code • [View CI Run](${CI_RUN_URL})</sub>
ENDOFSUMMARY
```

**Step 3 — Post or update the comment using the file:**

Build a JSON payload from the file (this avoids shell escaping issues with `$()` subshells):

```bash
jq -n --rawfile body /tmp/review-summary.md '{"body": $body}' > /tmp/review-payload.json

if [ -n "$SUMMARY_ID" ]; then
  gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${SUMMARY_ID}" \
    -X PATCH \
    --input /tmp/review-payload.json
else
  gh api "repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments" \
    -X POST \
    --input /tmp/review-payload.json
fi
```

-----

## Review Decision

```bash
CRITICAL_COUNT=0  # Set based on your findings
IMPORTANT_COUNT=0

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  gh pr review "$PR_NUMBER" --request-changes \
    --body "🚨 Found ${CRITICAL_COUNT} critical issue(s) requiring changes. See inline comments for details."
elif [ "$IMPORTANT_COUNT" -gt 0 ]; then
  gh pr review "$PR_NUMBER" --comment \
    --body "⚠️ Found ${IMPORTANT_COUNT} issue(s) to consider. See inline comments."
else
  gh pr review "$PR_NUMBER" --approve \
    --body "✅ Code review passed. No issues found."
fi
```

-----

## Summary Comment Formatting Requirements

> **CRITICAL — Summary Comment Formatting**
>
> The summary comment posted to the PR **MUST** use full GitHub-flavored Markdown
> with headers (`##`, `###`), tables (`| | |`), bullet lists, and the
> `<!-- CLAUDE_CODE_REVIEW -->` marker. **Never** output a single-line or
> pipe-delimited summary.
> Every summary comment must contain all of these elements:
> - The `<!-- CLAUDE_CODE_REVIEW -->` HTML comment marker (first line)
> - A `## 🔍 Automated Code Review` heading
> - A metadata table with Commit, Reviewed, and Status rows
> - A `### Findings` section with a severity table or "No issues found."
> - A `### AGENTS.md Compliance` section with checklist items **derived from the actual AGENTS.md rules** (not generic placeholders)
> - A `### Summary` section with prose
> - A footer with the CI run link

-----

## Final Checklist (verify before finishing)

Before completing the review, confirm:

- [ ] Summary comment uses `<!-- CLAUDE_CODE_REVIEW -->` marker on the first line
- [ ] Summary comment is **multi-line Markdown** with `##` / `###` headers and `| |` tables
- [ ] Summary was written to a temp file and posted via `--body-file` or `cat` to preserve formatting
- [ ] Summary is **not** a single line of pipe-delimited or dash-delimited text
- [ ] CI run link is included in the footer
