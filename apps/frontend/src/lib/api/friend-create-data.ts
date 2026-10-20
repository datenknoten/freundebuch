import type { FriendCreateInputSchema } from '$shared';
import { type MetInfoData, mapMetInfoInput } from './met-info-data.js';

/**
 * camelCase companion of `FriendCreateInputSchema`, shared by friend creation and the
 * onboarding self-profile. Sub-resources are added on the detail page after creation.
 */
export interface FriendCreateData {
  displayName: string;
  nickname?: string;
  namePrefix?: string;
  nameFirst?: string;
  nameMiddle?: string;
  nameLast?: string;
  nameSuffix?: string;
  maidenName?: string;
  interests?: string;
  metInfo?: MetInfoData;
}

export function mapFriendCreateInput(data: FriendCreateData) {
  return {
    display_name: data.displayName,
    nickname: data.nickname,
    name_prefix: data.namePrefix,
    name_first: data.nameFirst,
    name_middle: data.nameMiddle,
    name_last: data.nameLast,
    name_suffix: data.nameSuffix,
    maiden_name: data.maidenName,
    interests: data.interests,
    met_info: data.metInfo === undefined ? undefined : mapMetInfoInput(data.metInfo),
  } satisfies typeof FriendCreateInputSchema.inferIn;
}
