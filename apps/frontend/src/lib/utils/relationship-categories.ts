/**
 * The single source of truth for how a relationship category is presented: its
 * i18n key, its tint pair for chips and group headings, and the hex it gets as
 * a node colour in the network graph (SVG fills cannot use Tailwind classes).
 *
 * The tint pair used to be copy-pasted into `relationships-section` and
 * `relationship-type-input` and the graph colours lived a third time in
 * `network-graph`, so a new category had to be added in three places. Like the
 * collective types, these are categorical data colours, not brand colours.
 */
import type { RelationshipCategory } from '$shared';

export interface RelationshipCategoryStyle {
  /** i18n key for the category's display label. */
  labelKey: string;
  /** Chip / group-heading background. */
  bgColor: string;
  /** Chip / group-heading text colour. */
  textColor: string;
  /** Node colour in the network graph. */
  hex: string;
}

export const RELATIONSHIP_CATEGORY_STYLE: Record<RelationshipCategory, RelationshipCategoryStyle> =
  {
    family: {
      labelKey: 'relationshipSection.categories.family',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      // Forest green
      hex: '#2D5016',
    },
    professional: {
      labelKey: 'relationshipSection.categories.professional',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      // Warm amber
      hex: '#D4A574',
    },
    social: {
      labelKey: 'relationshipSection.categories.social',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      // Sage green
      hex: '#8B9D83',
    },
  };

/** The categories in the order every relationship list groups them. */
export const RELATIONSHIP_CATEGORIES = ['family', 'professional', 'social'] as const;
