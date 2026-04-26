import type { Address, AddressInput } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryAddress,
  createAddress,
  deleteAddress,
  getAddressById,
  getAddressesByCollectiveId,
  type IDeleteAddressResult,
  type IGetAddressesByCollectiveIdResult,
  updateAddress,
  updateAddressCoordinates,
} from '../../../models/queries/collective-addresses.queries.js';
import { addressGeoFieldsChanged, parseStreetLine } from '../../../utils/address.js';
import { parseAddressType } from '../../../utils/type-guards.js';
import type { AddressLookupService } from '../../address-lookup.service.js';
import {
  CollectiveSubResourceService,
  type CollectiveSubResourceServiceOptions,
} from './base.service.js';

export interface CollectiveAddressServiceOptions extends CollectiveSubResourceServiceOptions {
  addressLookupService?: AddressLookupService;
}

/**
 * AddressService handles all address-related operations for collectives.
 * Extends CollectiveSubResourceService for common CRUD operations.
 *
 * Geocoding runs in the background after a successful write so saves are
 * never blocked on slow or rate-limited external geocode calls.
 */
export class CollectiveAddressService extends CollectiveSubResourceService<
  AddressInput,
  Address,
  IGetAddressesByCollectiveIdResult,
  IGetAddressesByCollectiveIdResult,
  IDeleteAddressResult
> {
  private addressLookupService?: AddressLookupService;

  constructor(options: CollectiveAddressServiceOptions) {
    super(options, {
      resourceName: 'collective address',
      hasPrimaryFlag: true,

      listFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return getAddressesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
      },

      mapListResult: (row): Address => ({
        id: row.external_id,
        streetLine1: row.street_line1 ?? undefined,
        streetLine2: row.street_line2 ?? undefined,
        city: row.city ?? undefined,
        stateProvince: row.state_province ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        addressType: parseAddressType(row.address_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
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
            latitude: null,
            longitude: null,
          },
          client,
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
            latitude: null,
            longitude: null,
          },
          client,
        );
      },

      deleteFn: async ({ userExternalId, collectiveExternalId, resourceExternalId }, client) => {
        return deleteAddress.run(
          {
            userExternalId,
            collectiveExternalId,
            addressExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, collectiveExternalId }, client) => {
        return clearPrimaryAddress.run({ userExternalId, collectiveExternalId }, client);
      },

      isPrimary: (input) => input.is_primary ?? false,

      setIsPrimary: (input, value) => ({ ...input, is_primary: value }),

      mapResult: (row): Address => ({
        id: row.external_id,
        streetLine1: row.street_line1 ?? undefined,
        streetLine2: row.street_line2 ?? undefined,
        city: row.city ?? undefined,
        stateProvince: row.state_province ?? undefined,
        postalCode: row.postal_code ?? undefined,
        country: row.country ?? undefined,
        addressType: parseAddressType(row.address_type),
        label: row.label ?? undefined,
        isPrimary: row.is_primary,
        latitude: row.latitude ?? undefined,
        longitude: row.longitude ?? undefined,
        createdAt: row.created_at.toISOString(),
      }),
    });

    this.addressLookupService = options.addressLookupService;
  }

  override async add(
    userExternalId: string,
    collectiveExternalId: string,
    input: AddressInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<Address | null> {
    const result = await super.add(userExternalId, collectiveExternalId, input, client);
    if (result) {
      this.scheduleBackgroundGeocode(result.id, input);
    }
    return result;
  }

  override async update(
    userExternalId: string,
    collectiveExternalId: string,
    resourceExternalId: string,
    input: AddressInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<Address | null> {
    const dbClient = client ?? this.db;

    const [existing] = await getAddressById.run(
      { addressExternalId: resourceExternalId, collectiveExternalId, userExternalId },
      dbClient,
    );

    const result = await super.update(
      userExternalId,
      collectiveExternalId,
      resourceExternalId,
      input,
      client,
    );
    if (!result) {
      return result;
    }

    const fieldsChanged = !existing || addressGeoFieldsChanged(input, existing);

    if (fieldsChanged) {
      this.scheduleBackgroundGeocode(resourceExternalId, input);
      return result;
    }

    if (existing && existing.latitude != null && existing.longitude != null) {
      await updateAddressCoordinates.run(
        {
          addressExternalId: resourceExternalId,
          latitude: existing.latitude,
          longitude: existing.longitude,
        },
        dbClient,
      );
      return {
        ...result,
        latitude: existing.latitude,
        longitude: existing.longitude,
      };
    }
    return result;
  }

  private scheduleBackgroundGeocode(addressExternalId: string, input: AddressInput): void {
    if (!this.addressLookupService || !input.country) return;

    const service = this.addressLookupService;
    const logger = this.logger;
    const db = this.db;
    const country = input.country;
    const city = input.city ?? '';
    const postalCode = input.postal_code ?? '';
    const { street, houseNumber } = parseStreetLine(input.street_line1);

    setImmediate(async () => {
      try {
        const location = await service.geocodeAddress(
          country,
          city,
          postalCode,
          street,
          houseNumber,
        );
        if (!location) {
          logger.debug(
            { addressExternalId },
            'Background geocode returned no result for collective address',
          );
          return;
        }
        await updateAddressCoordinates.run(
          {
            addressExternalId,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          db,
        );
        logger.debug({ addressExternalId, ...location }, 'Background geocode persisted');
      } catch (error) {
        logger.warn({ error, addressExternalId }, 'Background collective address geocode failed');
      }
    });
  }
}
