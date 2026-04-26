import type { Address, AddressInput } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import {
  clearPrimaryAddress,
  createAddress,
  deleteAddress,
  getAddressById,
  getAddressesByFriendId,
  type IDeleteAddressResult,
  type IGetAddressesByFriendIdResult,
  updateAddress,
  updateAddressCoordinates,
} from '../../../models/queries/friend-addresses.queries.js';
import { addressGeoFieldsChanged, parseStreetLine } from '../../../utils/address.js';
import { parseAddressType } from '../../../utils/type-guards.js';
import type { AddressLookupService } from '../../address-lookup.service.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../base/sub-resource.service.js';

export interface AddressServiceOptions extends SubResourceServiceOptions {
  addressLookupService?: AddressLookupService;
}

/**
 * AddressService handles all address-related operations for friends.
 * Extends SubResourceService for common CRUD operations.
 *
 * Geocoding runs in the background after a successful write so saves are
 * never blocked on slow or rate-limited external geocode calls. On update,
 * existing coordinates are preserved when the address fields haven't
 * changed.
 */
export class AddressService extends SubResourceService<
  AddressInput,
  Address,
  IGetAddressesByFriendIdResult,
  IGetAddressesByFriendIdResult,
  IDeleteAddressResult
> {
  private addressLookupService?: AddressLookupService;

  constructor(options: AddressServiceOptions) {
    super(options, {
      resourceName: 'address',
      hasPrimaryFlag: true,

      createFn: async ({ userExternalId, friendExternalId, input }, client) => {
        return createAddress.run(
          {
            userExternalId,
            friendExternalId,
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

      updateFn: async ({ userExternalId, friendExternalId, resourceExternalId, input }, client) => {
        return updateAddress.run(
          {
            userExternalId,
            friendExternalId,
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

      deleteFn: async ({ userExternalId, friendExternalId, resourceExternalId }, client) => {
        return deleteAddress.run(
          {
            userExternalId,
            friendExternalId,
            addressExternalId: resourceExternalId,
          },
          client,
        );
      },

      clearPrimaryFn: async ({ userExternalId, friendExternalId }, client) => {
        return clearPrimaryAddress.run({ userExternalId, friendExternalId }, client);
      },

      countFn: async ({ userExternalId, friendExternalId }, client) => {
        return getAddressesByFriendId.run({ userExternalId, friendExternalId }, client);
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
    friendExternalId: string,
    input: AddressInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<Address | null> {
    const result = await super.add(userExternalId, friendExternalId, input, client);
    if (result) {
      this.scheduleBackgroundGeocode(result.id, input);
    }
    return result;
  }

  override async update(
    userExternalId: string,
    friendExternalId: string,
    resourceExternalId: string,
    input: AddressInput,
    client?: pg.Pool | pg.PoolClient,
  ): Promise<Address | null> {
    const dbClient = client ?? this.db;

    const [existing] = await getAddressById.run(
      { addressExternalId: resourceExternalId, friendExternalId, userExternalId },
      dbClient,
    );

    const result = await super.update(
      userExternalId,
      friendExternalId,
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

    // Address unchanged — carry forward previously geocoded coordinates.
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

  /**
   * Fire-and-forget geocode that runs after the write transaction has
   * committed. Errors are logged and never propagate to the caller — saving
   * an address must never fail because a third-party geocode failed.
   */
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
          logger.debug({ addressExternalId }, 'Background geocode returned no result for address');
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
        logger.warn({ error, addressExternalId }, 'Background address geocode failed');
      }
    });
  }
}
