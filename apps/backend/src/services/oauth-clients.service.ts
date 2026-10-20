import type pg from 'pg';
import { ResourceNotFoundError } from '../errors/resource-not-found.error.js';
import { getOAuthClientByClientId } from '../models/queries/oauth.queries.js';

export interface OAuthClientsServiceOptions {
  db: pg.Pool;
}

export interface OAuthClientDisplay {
  clientId: string;
  name: string;
  icon: string | null;
}

/** Reads registered OAuth clients for display on the consent screen. */
export class OAuthClientsService {
  private readonly db: pg.Pool;

  public constructor(options: OAuthClientsServiceOptions) {
    this.db = options.db;
  }

  public async getClientDisplay(clientId: string): Promise<OAuthClientDisplay> {
    const [client] = await getOAuthClientByClientId.run({ clientId }, this.db);

    if (client === undefined) {
      throw new ResourceNotFoundError('OAuth client', clientId);
    }

    return { clientId, name: client.name, icon: client.icon ?? null };
  }
}
