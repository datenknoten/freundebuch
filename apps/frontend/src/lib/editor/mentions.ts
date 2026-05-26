/**
 * `@`-mention autocomplete for the markdown notes editor.
 *
 * Typing `@` followed by a query opens a completion list spanning every
 * mentionable entity type — friends, collectives, and encounters (the
 * entities that have a detail page to link to; circles have no detail
 * route, so they are intentionally excluded). Picking an entry inserts a
 * plain markdown link `[Name](/friends/{id})`, which the inline-preview
 * extension already renders as a clickable link. No bespoke wiki-link
 * syntax — standard markdown round-trips cleanly and needs no parser.
 */
import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import type { Extension } from '@codemirror/state';
import { listCollectives } from '$lib/api/collectives';
import { listEncounters } from '$lib/api/encounters';
import { searchFriends } from '$lib/api/friends';

/** How many hits to request per entity type. */
const PER_TYPE_LIMIT = 5;
/** Debounce window so a fast typist doesn't fire a request per keystroke. */
const DEBOUNCE_MS = 200;

type MentionKind = 'friend' | 'collective' | 'encounter';

interface Mentionable {
  /** Display text and the link text that gets inserted. */
  label: string;
  /** Same-origin detail-page path. */
  url: string;
  kind: MentionKind;
}

/** Human label shown on the right of each completion row, per entity kind. */
export interface MentionTypeLabels {
  friend: string;
  collective: string;
  encounter: string;
}

/** Build a readable label for an encounter, which may have no title. */
function encounterLabel(item: {
  title: string | null;
  encounterType: string;
  encounterDate: string;
}): string {
  const title = item.title?.trim();
  if (title) return title;
  // Fall back to "<type> · <date>" so untitled encounters stay identifiable.
  return `${item.encounterType} · ${item.encounterDate.slice(0, 10)}`;
}

/**
 * Query every mentionable entity type in parallel. Uses `allSettled` so one
 * failing endpoint doesn't blank out the whole list.
 */
async function searchMentionables(query: string): Promise<Mentionable[]> {
  const [friends, collectives, encounters] = await Promise.allSettled([
    searchFriends(query, undefined, PER_TYPE_LIMIT),
    listCollectives({ search: query, pageSize: PER_TYPE_LIMIT }),
    listEncounters({ search: query, pageSize: PER_TYPE_LIMIT }),
  ]);

  const out: Mentionable[] = [];
  if (friends.status === 'fulfilled') {
    for (const f of friends.value) {
      out.push({ label: f.displayName, url: `/friends/${f.id}`, kind: 'friend' });
    }
  }
  if (collectives.status === 'fulfilled') {
    for (const c of collectives.value.collectives) {
      out.push({ label: c.name, url: `/collectives/${c.id}`, kind: 'collective' });
    }
  }
  if (encounters.status === 'fulfilled') {
    for (const e of encounters.value.encounters) {
      out.push({ label: encounterLabel(e), url: `/encounters/${e.id}`, kind: 'encounter' });
    }
  }
  return out;
}

// The trigger token: `@` plus the run of name characters after it (letters,
// numbers, and a few in-name punctuation marks). A space ends the token, so
// "@John Doe" matches "@John" and we search "John" — the search backends do
// substring matching, so the surname-less query still finds "John Doe".
const MENTION_TOKEN = /@[\p{L}\p{N}_'.-]*/u;

/**
 * Escape characters that have meaning inside a markdown link label so a name
 * like `Sprint [Q3] kickoff` doesn't close the label at the inner `]` and
 * spill the rest as literal text. CommonMark only requires escaping `\`, `[`,
 * and `]` inside `[…]`; `(` / `)` are fine because the label is brace-balanced.
 */
function escapeLinkLabel(s: string): string {
  return s.replace(/[\\[\]]/g, '\\$&');
}

function makeMentionSource(typeLabels: MentionTypeLabels) {
  const kindLabel: Record<MentionKind, string> = {
    friend: typeLabels.friend,
    collective: typeLabels.collective,
    encounter: typeLabels.encounter,
  };

  // Per-source debounce timer. Scoped to this closure (not module-level) so
  // every editor instance gets its own timer — typing in editor A doesn't
  // cancel editor B's pending query. CodeMirror discards results from
  // superseded queries, so a late resolve can't clobber a newer list.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  function debouncedSearch(query: string): Promise<Mentionable[]> {
    return new Promise((resolve, reject) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchMentionables(query).then(resolve, reject);
      }, DEBOUNCE_MS);
    });
  }

  return async function mentionSource(
    context: CompletionContext,
  ): Promise<CompletionResult | null> {
    const match = context.matchBefore(MENTION_TOKEN);
    if (!match) return null;

    // Require start-of-line or whitespace before `@`. Without this guard,
    // typing inside an email (`alice@example.com`) or a handle (`@scope/pkg`)
    // would pop the mention list and accepting an entry would rewrite the
    // span — destroying the email. matchBefore has no left-anchor option, so
    // peek one char back in the document.
    if (match.from > 0) {
      const charBefore = context.state.doc.sliceString(match.from - 1, match.from);
      if (!/\s/.test(charBefore)) return null;
    }

    const query = match.text.slice(1); // drop the leading "@"
    // Wait for at least one character unless the user explicitly opened the
    // list (Ctrl-Space) — an empty query would fetch an arbitrary top slice.
    if (query.length === 0 && !context.explicit) return null;

    const items = await debouncedSearch(query);
    if (items.length === 0) return null;

    const options: Completion[] = items.map((item) => ({
      label: item.label,
      detail: kindLabel[item.kind],
      // Drives the left-edge icon class (cm-completionIcon-friend, …) so the
      // three kinds are visually distinguishable even before reading detail.
      type: item.kind,
      apply: (view, _completion, from, to) => {
        const insert = `[${escapeLinkLabel(item.label)}](${item.url})`;
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + insert.length },
        });
      },
    }));

    return {
      from: match.from,
      to: match.to,
      options,
      // Results are already filtered server-side against the query; the
      // option labels ("John Doe") don't share the typed prefix ("@John"),
      // so CodeMirror's own filtering would hide them all. Re-query instead
      // of client-filtering as the user types (no validFor).
      filter: false,
    };
  };
}

/**
 * Autocomplete extension that turns `@`-typed text into entity links.
 * `typeLabels` carries the already-localized kind names for the dropdown.
 */
export function mentionAutocomplete(typeLabels: MentionTypeLabels): Extension {
  return autocompletion({
    override: [makeMentionSource(typeLabels)],
    activateOnTyping: true,
    // Run the source on every keystroke (0 delay). The source itself
    // debounces network calls via DEBOUNCE_MS, so leaving CodeMirror's
    // default `activateOnTypingDelay` (100ms) in place would stack on top of
    // ours for ~300ms+ before the request fires. One debounce is enough.
    activateOnTypingDelay: 0,
  });
}
