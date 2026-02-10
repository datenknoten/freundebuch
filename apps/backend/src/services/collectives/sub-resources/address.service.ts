import type { Address, AddressInput, AddressType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryAddress,
  createAddress,
  deleteAddress,
  getAddressesByCollectiveId,
  type IDeleteAddressResult,
  type IGetAddressesByCollectiveIdResult,
  updateAddress,
} from '../../../models/queries/collective-addresses.queries.js';
import {
  CollectiveSubResourceService,
  type CollectiveSubResourceServiceOptions,
} from './base.service.js';

/**
 * AddressService handles all address-related operations for collectives.
 * Extends CollectiveSubResourceService for common CRUD operations.
 */
export class CollectiveAddressService extends CollectiveSubResourceService<
  AddressInput,
  Address,
  IGetAddressesByCollectiveIdResult,
  IGetAddressesByCollectiveIdResult,
  IDeleteAddressResult
> {
  constructor(options: CollectiveSubResourceServiceOptions) {
    super(options, {
      resourceName: 'collective address',
      hasPrimaryFlag: true,

      listFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return getAddressesByCollectiveId.run(
          { userExternalId, collectiveExternalId },
          client as pg.Pool,
        );
      },

      mapListResult: (row): Address => ({
        id: row.external_id,
        streetLine1: row.street_line1 ?? undefined,
        streetLine2: row.street_line2 ?? undefined,
        city: row.city ?? undefined,
        stateProvince: row.state_province ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        addressType: row.address_type as AddressType,
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),

      createFn: async ({ userExternalId, collectiveExternalId, input }, client) => {
        return createAddress.run(
          {
            userExternalId,
            collectiveExternalId,
            streetLine1: input.street_line1 ?? null,
            streetLine2: input.street_line2 ?? null,
            city: input.city ?? null,
            stateProvince: input.state_province ?? null,
            postalCode: input.postal_code ?? null,
            country: input.country ?? null,
            addressType: input.address_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client as pg.Pool,
        );
      },

      updateFn: async (
        { userExternalId, collectiveExternalId, resourceExternalId, input },
        client,
      ) => {
        return updateAddress.run(
          {
            userExternalId,
            collectiveExternalId,
            addressExternalId: resourceExternalId,
            streetLine1: input.street_line1 ?? null,
            streetLine2: input.street_line2 ?? null,
            city: input.city ?? null,
            stateProvince: input.state_province ?? null,
            postalCode: input.postal_code ?? null,
            country: input.country ?? null,
            addressType: input.address_type,
            label: input.label ?? null,
            isPrimary: input.is_primary ?? false,
          },
          client as pg.Pool,
        );
      },

      deleteFn: async ({ userExternalId, collectiveExternalId, resourceExternalId }, client) => {
        return deleteAddress.run(
          {
            userExternalId,
            collectiveExternalId,
            addressExternalId: resourceExternalId,
          },
          client as pg.Pool,
        );
      },

      clearPrimaryFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return clearPrimaryAddress.run({ userExternalId, collectiveExternalId }, client as pg.Pool);
      },

      isPrimary: (input) => input.is_primary ?? false,

      mapResult: (row): Address => ({
        id: row.external_id,
        streetLine1: row.street_line1 ?? undefined,
        streetLine2: row.street_line2 ?? undefined,
        city: row.city ?? undefined,
        stateProvince: row.state_province ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        addressType: row.address_type as AddressType,
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        createdAt: row.created_at.toISOString(),
      }),
    });
  }
}
