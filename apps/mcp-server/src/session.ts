import type { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

export interface Session {
  transport: NodeStreamableHTTPServerTransport;
  userId: string;
}
