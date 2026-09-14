/**
 * How long a transient confirmation stays on screen ("Copied!", "Message sent",
 * the armed state of a two-click delete) before the control returns to rest.
 *
 * One constant so every optimistic acknowledgement in the app disappears after
 * the same amount of time.
 */
export const TRANSIENT_FEEDBACK_MS = 3000;
