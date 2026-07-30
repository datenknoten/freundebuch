/** Types generated for queries found in "src/models/queries/oauth.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetOAuthClientByClientId' parameters type */
export interface IGetOAuthClientByClientIdParams {
  clientId?: string | null | void;
}

/** 'GetOAuthClientByClientId' return type */
export interface IGetOAuthClientByClientIdResult {
  icon: string | null;
  name: string;
}

/** 'GetOAuthClientByClientId' query type */
export interface IGetOAuthClientByClientIdQuery {
  params: IGetOAuthClientByClientIdParams;
  result: IGetOAuthClientByClientIdResult;
}

const getOAuthClientByClientIdIR: any = {"usedParamSet":{"clientId":true},"params":[{"name":"clientId","required":false,"transform":{"type":"scalar"},"locs":[{"a":80,"b":88}]}],"statement":"SELECT\n  oa.name,\n  oa.icon\nFROM auth.oauth_application oa\nWHERE oa.client_id = :clientId"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   oa.name,
 *   oa.icon
 * FROM auth.oauth_application oa
 * WHERE oa.client_id = :clientId
 * ```
 */
export const getOAuthClientByClientId = new PreparedQuery<IGetOAuthClientByClientIdParams,IGetOAuthClientByClientIdResult>(getOAuthClientByClientIdIR);


