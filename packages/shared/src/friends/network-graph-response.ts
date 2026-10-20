import { type } from 'arktype';
import { NetworkGraphLinkResponseSchema } from './network-graph-link-response.js';
import { NetworkGraphNodeResponseSchema } from './network-graph-node-response.js';

/** Relationship network for the dashboard visualization */
export const NetworkGraphResponseSchema = type({
  nodes: NetworkGraphNodeResponseSchema.array(),
  links: NetworkGraphLinkResponseSchema.array(),
});

export type NetworkGraphResponse = typeof NetworkGraphResponseSchema.infer;
