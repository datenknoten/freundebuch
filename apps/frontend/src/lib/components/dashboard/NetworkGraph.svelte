<script lang="ts">
import * as d3 from 'd3';
import { onDestroy, onMount } from 'svelte';
import { getNetworkGraphData } from '$lib/api/friends.js';
import type {
  NetworkGraphData,
  NetworkGraphLink,
  NetworkGraphNode,
  RelationshipCategory,
} from '$shared';

let container: HTMLDivElement;
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
let simulation: d3.Simulation<SimulationNode, SimulationLink>;

let graphData = $state<NetworkGraphData | null>(null);
let isLoading = $state(true);
let error = $state<string | null>(null);

// Extended node type for D3 simulation (D3 adds x, y, fx, fy properties)
type SimulationNode = NetworkGraphNode & d3.SimulationNodeDatum;

// Extended link type for D3 simulation (D3 replaces source/target strings with node objects)
type SimulationLink = Omit<NetworkGraphLink, 'source' | 'target'> & {
  source: SimulationNode | string;
  target: SimulationNode | string;
};

// Category colors matching the design system
const categoryColors: Record<RelationshipCategory, string> = {
  family: '#2D5016', // Forest green
  professional: '#D4A574', // Warm amber
  social: '#8B9D83', // Sage green
};

async function loadGraphData() {
  isLoading = true;
  error = null;
  try {
    graphData = await getNetworkGraphData();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load network graph';
  } finally {
    isLoading = false;
  }
}

function initializeGraph() {
  if (!container || !graphData || graphData.nodes.length === 0) return;

  // Clear any existing SVG
  d3.select(container).selectAll('svg').remove();

  const width = container.clientWidth;
  const height = 400;

  // Create SVG
  svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('class', 'network-graph');

  // Create a group for zoom/pan
  const g = svg.append('g');

  // Add zoom behavior
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 3])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Create copies of data for D3 mutation
  const nodes: SimulationNode[] = graphData.nodes.map((d) => ({ ...d }));
  const links: SimulationLink[] = graphData.links.map((d) => ({ ...d }));

  // Create force simulation
  simulation = d3
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

  // Create arrow markers for directed edges
  const defs = svg.append('defs');

  Object.entries(categoryColors).forEach(([category, color]) => {
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
      .attr('fill', color)
      .attr('d', 'M0,-5L10,0L0,5');
  });

  // Create links
  const link = g
    .append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', (d) => categoryColors[d.relationshipCategory])
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 2);

  // Create node groups
  const node = g
    .append('g')
    .attr('class', 'nodes')
    .selectAll('g')
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

  // Add circles to nodes
  node
    .append('circle')
    .attr('r', (d) => (d.isFavorite ? 18 : 14))
    .attr('fill', '#fff')
    .attr('stroke', (d) => (d.isFavorite ? '#D4A574' : '#2D5016'))
    .attr('stroke-width', (d) => (d.isFavorite ? 3 : 2));

  // Add images or initials to nodes
  node.each(function (d) {
    const nodeGroup = d3.select(this);
    if (d.photoThumbnailUrl) {
      // Add clip path for circular image
      const clipId = `clip-${d.id.replace(/-/g, '')}`;
      defs
        .append('clipPath')
        .attr('id', clipId)
        .append('circle')
        .attr('r', d.isFavorite ? 15 : 11);

      nodeGroup
        .append('image')
        .attr('xlink:href', d.photoThumbnailUrl)
        .attr('x', d.isFavorite ? -15 : -11)
        .attr('y', d.isFavorite ? -15 : -11)
        .attr('width', d.isFavorite ? 30 : 22)
        .attr('height', d.isFavorite ? 30 : 22)
        .attr('clip-path', `url(#${clipId})`);
    } else {
      // Add initials
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
        .attr('font-size', d.isFavorite ? '10px' : '8px')
        .attr('font-family', 'Merriweather, serif')
        .attr('fill', '#2D5016')
        .text(initials);
    }
  });

  // Add tooltips
  node.append('title').text((d) => d.displayName);

  // Add click handler to navigate to friend
  node.style('cursor', 'pointer').on('click', (_event, d) => {
    window.location.href = `/friends/${d.id}`;
  });

  // Helper to get x/y from source/target (handles both string and node object)
  const getX = (nodeRef: SimulationNode | string): number => {
    if (typeof nodeRef === 'string') return 0;
    return nodeRef.x ?? 0;
  };
  const getY = (nodeRef: SimulationNode | string): number => {
    if (typeof nodeRef === 'string') return 0;
    return nodeRef.y ?? 0;
  };

  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d) => getX(d.source))
      .attr('y1', (d) => getY(d.source))
      .attr('x2', (d) => getX(d.target))
      .attr('y2', (d) => getY(d.target));

    node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
  });

  function dragstarted(
    event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>,
    d: SimulationNode,
  ) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
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
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

onMount(() => {
  loadGraphData();
});

// Watch for graphData changes to initialize the graph
$effect(() => {
  if (graphData && !isLoading) {
    // Use setTimeout to ensure the container is rendered
    setTimeout(() => initializeGraph(), 0);
  }
});

onDestroy(() => {
  // Stop the simulation to prevent further callbacks
  if (simulation) {
    simulation.stop();
  }
  // Remove all SVG elements to prevent memory leaks
  if (container) {
    d3.select(container).selectAll('svg').remove();
  }
});
</script>

<div class="bg-white rounded-xl shadow-lg p-6">
  <h3 class="text-xl font-heading text-gray-800 mb-4">Relationship Network</h3>

  {#if isLoading}
    <div class="h-[400px] flex items-center justify-center">
      <div class="animate-pulse text-center">
        <div class="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
        <div class="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
      </div>
    </div>
  {:else if error}
    <div class="h-[400px] flex items-center justify-center">
      <div class="text-red-600 text-sm">{error}</div>
    </div>
  {:else if !graphData || graphData.nodes.length === 0}
    <div class="h-[400px] flex items-center justify-center">
      <div class="text-center py-6">
        <div class="text-gray-400 text-4xl mb-2">&#128279;</div>
        <p class="text-gray-500 font-body">No relationships to display</p>
        <p class="text-gray-400 text-sm mt-1">Add friends and create relationships between them</p>
      </div>
    </div>
  {:else if graphData.links.length === 0}
    <div class="h-[400px] flex items-center justify-center">
      <div class="text-center py-6">
        <div class="text-gray-400 text-4xl mb-2">&#128279;</div>
        <p class="text-gray-500 font-body">No connections yet</p>
        <p class="text-gray-400 text-sm mt-1">Add relationships between your friends to see the network</p>
      </div>
    </div>
  {:else}
    <div bind:this={container} class="w-full h-[400px] overflow-hidden"></div>

    <!-- Legend -->
    <div class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex flex-wrap gap-4 text-sm font-body text-gray-600">
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #2D5016;"></span>
          <span>Family</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #D4A574;"></span>
          <span>Professional</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-4 h-1 rounded" style="background-color: #8B9D83;"></span>
          <span>Social</span>
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-xs text-gray-400">Drag nodes to rearrange. Click to view friend.</span>
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
