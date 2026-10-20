<script lang="ts">
import * as d3 from 'd3';
import { onDestroy } from 'svelte';
import Share from 'svelte-heros-v2/Share.svelte';
import AlertBanner from '$lib/components/AlertBanner.svelte';
import Button from '$lib/components/ui/Button.svelte';
import EmptyState from '$lib/components/ui/EmptyState.svelte';
import { HEADING_CLASSES } from '$lib/components/ui/heading-classes.js';
import { SURFACE_CLASSES } from '$lib/components/ui/surface-classes.js';
import { createI18n } from '$lib/i18n/i18n.js';
import {
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_CATEGORY_STYLE,
} from '$lib/utils/relationship-categories.js';
import type {
  NetworkGraphLinkResponse,
  NetworkGraphNodeResponse,
  NetworkGraphResponse,
} from '$shared';

const i18n = createI18n();

interface Props {
  /** Network graph data to render (fetched by the parent dashboard). */
  graphData?: NetworkGraphResponse | null;
  isLoading?: boolean;
  error?: string | null;
  /** Called when the user retries after an error. */
  onRetry?: () => void;
}

let { graphData = null, isLoading = false, error = null, onRetry }: Props = $props();

let container = $state<HTMLDivElement | null>(null);
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
let simulation: d3.Simulation<SimulationNode, SimulationLink> | undefined;

// Extended node type for D3 simulation (D3 adds x, y, fx, fy properties)
type SimulationNode = NetworkGraphNodeResponse & d3.SimulationNodeDatum;

// Extended link type for D3 simulation (D3 replaces source/target strings with node objects)
type SimulationLink = Omit<NetworkGraphLinkResponse, 'source' | 'target'> & {
  source: SimulationNode | string;
  target: SimulationNode | string;
};

function getX(nodeRef: SimulationNode | string) {
  if (typeof nodeRef === 'string') {
    return 0;
  }
  return nodeRef.x ?? 0;
}

function getY(nodeRef: SimulationNode | string) {
  if (typeof nodeRef === 'string') {
    return 0;
  }
  return nodeRef.y ?? 0;
}

function navigateToFriend(_event: MouseEvent, d: SimulationNode) {
  window.location.href = `/friends/${d.id}`;
}

function initializeGraph() {
  if (container === null || graphData === null || graphData.nodes.length === 0) {
    return;
  }

  d3.select(container).selectAll('svg').remove();

  const width = container.clientWidth;
  const height = 400;

  svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('class', 'network-graph');

  const g = svg.append('g');

  function applyZoomTransform(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
    g.attr('transform', event.transform.toString());
  }

  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 3])
    .on('zoom', applyZoomTransform);

  svg.call(zoom);

  // Copies, because D3 mutates nodes and links in place
  const nodes: SimulationNode[] = graphData.nodes.map((d) => ({ ...d }));
  const links: SimulationLink[] = graphData.links.map((d) => ({ ...d }));

  const sim = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance(80),
    )
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));
  simulation = sim;

  // Arrow markers for directed edges
  const defs = svg.append('defs');

  for (const category of RELATIONSHIP_CATEGORIES) {
    defs
      .append('marker')
      .attr('id', `arrow-${category}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', RELATIONSHIP_CATEGORY_STYLE[category].hex)
      .attr('d', 'M0,-5L10,0L0,5');
  }

  const link = g
    .append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', (d) => RELATIONSHIP_CATEGORY_STYLE[d.relationshipCategory].hex)
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 2);

  const node = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll<SVGGElement, SimulationNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(
      d3
        .drag<SVGGElement, SimulationNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended),
    );

  node
    .append('circle')
    .attr('r', (d) => (d.isFavorite === true ? 18 : 14))
    .attr('fill', '#fff')
    .attr('stroke', (d) => (d.isFavorite === true ? '#D4A574' : '#2D5016'))
    .attr('stroke-width', (d) => (d.isFavorite === true ? 3 : 2));

  function renderNodeContent(this: SVGGElement, d: SimulationNode) {
    const nodeGroup = d3.select(this);
    if (d.photoThumbnailUrl !== undefined && d.photoThumbnailUrl !== '') {
      // Clip path for the circular image
      const clipId = `clip-${d.id.replace(/-/g, '')}`;
      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', d.isFavorite === true ? 15 : 11);

      nodeGroup
        .append('image')
        .attr('xlink:href', d.photoThumbnailUrl)
        .attr('x', d.isFavorite === true ? -15 : -11)
        .attr('y', d.isFavorite === true ? -15 : -11)
        .attr('width', d.isFavorite === true ? 30 : 22)
        .attr('height', d.isFavorite === true ? 30 : 22)
        .attr('clip-path', `url(#${clipId})`);
    } else {
      const initials = d.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      nodeGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', d.isFavorite === true ? '10px' : '8px')
        .attr('font-family', 'Merriweather, serif')
        .attr('fill', '#2D5016')
        .text(initials);
    }
  }

  node.each(renderNodeContent);

  node.append('title').text((d) => d.displayName);

  node.style('cursor', 'pointer').on('click', navigateToFriend);

  function updatePositions() {
    link
      .attr('x1', (d) => getX(d.source))
      .attr('y1', (d) => getY(d.source))
      .attr('x2', (d) => getX(d.target))
      .attr('y2', (d) => getY(d.target));

    node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  }

  sim.on('tick', updatePositions);

  function dragstarted(
    event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
    d: SimulationNode,
  ) {
    if (event.active === 0) {
      sim.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(
    event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
    d: SimulationNode,
  ) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(
    event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
    d: SimulationNode,
  ) {
    if (event.active === 0) {
      sim.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }
}

function scheduleGraphInitialization() {
  if (graphData !== null && isLoading === false) {
    // Defer so the container is rendered first
    setTimeout(initializeGraph, 0);
  }
}

$effect(scheduleGraphInitialization);

function teardownGraph() {
  if (simulation !== undefined) {
    simulation.stop();
  }
  if (container !== null) {
    d3.select(container).selectAll('svg').remove();
  }
}

onDestroy(teardownGraph);
</script>

<div class={SURFACE_CLASSES.page}>
  <h2 class="{HEADING_CLASSES.widget} mb-4">{$i18n.t('dashboard.relationshipNetwork')}</h2>

  {#if isLoading}
    <div class="h-[400px] flex items-center justify-center">
      <div class="animate-pulse text-center">
        <div class="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </div>
    </div>
  {:else if error}
    <AlertBanner variant="error">{error}</AlertBanner>
    {#if onRetry}
      <Button variant="ghostAccent" size="sm" class="mt-3" onclick={onRetry}>
        {$i18n.t('common.retry')}
      </Button>
    {/if}
  {:else if !graphData || graphData.nodes.length === 0}
    <EmptyState
      icon={Share}
      title={$i18n.t('dashboard.noRelationships')}
      description={$i18n.t('dashboard.addRelationshipsHint')}
    />
  {:else if graphData.links.length === 0}
    <EmptyState
      icon={Share}
      title={$i18n.t('dashboard.noConnections')}
      description={$i18n.t('dashboard.addConnectionsHint')}
    />
  {:else}
    <div bind:this={container} class="w-full h-[400px] overflow-hidden"></div>

    <!-- Legend -->
    <div class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex flex-wrap gap-4 text-sm font-body text-gray-600">
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #2D5016;"></span>
          <span>{$i18n.t('dashboard.legend.family')}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #D4A574;"></span>
          <span>{$i18n.t('dashboard.legend.professional')}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #8B9D83;"></span>
          <span>{$i18n.t('dashboard.legend.social')}</span>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-xs text-gray-400">{$i18n.t('dashboard.networkHint')}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.network-graph .node:hover circle) {
    stroke-width: 3px;
    filter: brightness(1.1);
  }

  :global(.network-graph .links line:hover) {
    stroke-opacity: 1;
    stroke-width: 3px;
  }
</style>
