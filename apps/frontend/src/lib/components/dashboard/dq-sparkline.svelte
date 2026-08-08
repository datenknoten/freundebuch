<script lang="ts">
import { createI18n } from '$lib/i18n/index.js';
import type { DqIndexPoint } from '$shared';

const i18n = createI18n();

/** viewBox units. The SVG scales to its container; these only set the aspect. */
const WIDTH = 120;
const HEIGHT = 28;
const STROKE = 2;

interface Props {
  /** Live index, 0..1. */
  current?: number;
  history?: DqIndexPoint[];
}

let { current = 0, history = [] }: Props = $props();

const percent = $derived(Math.round(current * 100));

/**
 * The polyline points.
 *
 * The y axis is pinned to 0..1 rather than the data range: a sparkline that
 * rescales itself turns a one-point wobble into a cliff.
 */
const points = $derived(
  history
    .map((point, index) => {
      const x = history.length === 1 ? 0 : (index / (history.length - 1)) * WIDTH;
      const y = HEIGHT - STROKE / 2 - point.value * (HEIGHT - STROKE);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' '),
);
</script>

<div class="flex items-center gap-3">
  <span class="text-sm font-body text-gray-500">{$i18n.t('dataQuality.index.title')}</span>

  {#if history.length < 2}
    <span class="text-xs font-body text-gray-400">{$i18n.t('dataQuality.index.empty')}</span>
  {:else}
    <!-- A chart is SVG by nature; the "no inline SVG" rule is about icons. -->
    <svg
      viewBox="0 0 {WIDTH} {HEIGHT}"
      width={WIDTH}
      height={HEIGHT}
      class="overflow-visible"
      role="img"
      aria-label={$i18n.t('dataQuality.index.title')}
      preserveAspectRatio="none"
    >
      <polyline
        {points}
        fill="none"
        stroke="currentColor"
        stroke-width={STROKE}
        stroke-linecap="round"
        stroke-linejoin="round"
        class="text-forest"
      />
    </svg>
  {/if}

  <span class="text-sm font-body font-medium text-gray-700">{percent}%</span>
</div>
