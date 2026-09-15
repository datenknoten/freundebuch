/**
 * The single source of truth for how a collective type is presented: its icon,
 * its badge colour and its i18n key.
 *
 * The icon and colour maps used to be copy-pasted into `collective-card`,
 * `collective-detail` and `collective-grid`, which meant a new type had to be
 * added in three places and the three copies had already started to drift in
 * their comments. The colours are deliberately outside the brand palette: they
 * are categorical data colours, like the relationship categories.
 */
import BuildingOffice from 'svelte-heros-v2/BuildingOffice.svelte';
import Heart from 'svelte-heros-v2/Heart.svelte';
import Home from 'svelte-heros-v2/Home.svelte';
import Users from 'svelte-heros-v2/Users.svelte';

/** Icon for a collective type; `Users` is the fallback for unknown types. */
export function getTypeIconComponent(typeName: string): typeof Home {
  switch (typeName.toLowerCase()) {
    case 'family':
      return Home;
    case 'company':
      return BuildingOffice;
    case 'club':
      return Users;
    case 'friend group':
      return Heart;
    default:
      return Users;
  }
}

/** Background/foreground pair for a collective type's badge and avatar stand-in. */
export function getTypeBadgeColor(typeName: string): string {
  switch (typeName.toLowerCase()) {
    case 'family':
      return 'bg-rose-100 text-rose-800';
    case 'company':
      return 'bg-blue-100 text-blue-800';
    case 'club':
      return 'bg-green-100 text-green-800';
    case 'friend group':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** Build i18n key for a collective type's display label. */
export function collectiveTypeI18nKey(typeName: string): string {
  const slug = typeName.toLowerCase().replace(/\s+/g, '_');
  return `collectives.types.${slug}`;
}
