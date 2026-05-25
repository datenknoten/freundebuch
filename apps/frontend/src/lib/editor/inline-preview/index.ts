/*
 * Local barrel for the vendored atomic-editor CM6 engine. Unlike upstream's
 * `index.ts`, this exports ONLY the React-free CodeMirror extensions we use —
 * the upstream React component (`AtomicCodeMirrorEditor.tsx`) is not vendored.
 */
export { inlinePreview } from './inline-preview';
export type { InlinePreviewConfig } from './inline-preview';
export { atomicEditorTheme, atomicMarkdownSyntax } from './atomic-theme';
export { extendEmphasisPair, autoCloseCodeFence } from './edit-helpers';
