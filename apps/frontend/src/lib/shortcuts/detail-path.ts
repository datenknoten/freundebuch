export type DetailSection = 'friends' | 'collectives' | 'encounters';

const DETAIL_PATH_PATTERNS = {
  friends: /^\/friends\/[^/]+$/,
  collectives: /^\/collectives\/[^/]+$/,
  encounters: /^\/encounters\/[^/]+$/,
} as const;

/** Whether the path is the page of one entity; `/<section>/new` matches only with `shouldIncludeNew`. */
export function isDetailPath(pathname: string, section: DetailSection, shouldIncludeNew = false) {
  if (DETAIL_PATH_PATTERNS[section].test(pathname) === false) {
    return false;
  }
  return shouldIncludeNew === true || pathname.endsWith('/new') === false;
}
