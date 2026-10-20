import type { AddressInput, AddressResponse } from '@freundebuch/shared/index.js';
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
import { addressGeoFieldsChanged } from '../../../utils/address-geo-fields-changed.js';
import { parseAddressType } from '../../../utils/parse-address-type.js';
import { parseStreetLine } from '../../../utils/parse-street-line.js';
import type { AddressLookupService } from '../../address-lookup.service.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

export interface CollectiveAddressServiceOptions extends SubResourceServiceOptions {
  addressLookupService?: AddressLookupService;
}

const mapRow = (row: IGetAddressesByCollectiveIdResult): AddressResponse => ({
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
});

/**
 * AddressService handles all address-related operations for collectives.
 * Extends SubResourceService for common CRUD operations.
 *
 * Geocoding runs in the background after a successful write so saves are
 * never blocked on slow or rate-limited external geocode calls.
 */
export class CollectiveAddressService extends SubResourceService<
  AddressInput,
  AddressResponse,
  IGetAddressesByCollectiveIdResult,
  IGetAddressesByCollectiveIdResult,
  IDeleteAddressResult
> {
  private readonly addressLookupService: AddressLookupService | undefined;

  constructor(options: CollectiveAddressServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'collective address',
        hasPrimaryFlag: true,

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, input },
          client,
        ) => {
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
              isPrimary: input.is_primary,
              latitude: null,
              longitude: null,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, input },
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
              isPrimary: input.is_primary,
              latitude: null,
              longitude: null,
            },
            client,
          );
        },

        deleteFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId },
          client,
        ) => {
          return deleteAddress.run(
            {
              userExternalId,
              collectiveExternalId,
              addressExternalId: resourceExternalId,
            },
            client,
          );
        },

        clearPrimaryFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId },
          client,
        ) => {
          return clearPrimaryAddress.run({ userExternalId, collectiveExternalId }, client);
        },

        isPrimary: (input) => input.is_primary,

        setIsPrimary: (input, isPrimary) => ({ ...input, is_primary: isPrimary }),

        listFn: async ({ userExternalId, ownerExternalId: collectiveExternalId }, client) => {
          return getAddressesByCollectiveId.run({ userExternalId, collectiveExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });

    this.addressLookupService = options.addressLookupService;
  }

  /**
   * Geocoding hooks into `addWithin` (not `add`) so it also runs for addresses
   * written on a caller-supplied transaction via `createMany`.
   */
  protected override async addWithin(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    collectiveExternalId: string,
    input: AddressInput,
  ): Promise<AddressResponse | null> {
    const result = await super.addWithin(client, userExternalId, collectiveExternalId, input);
    if (result !== null) {
      this.scheduleBackgroundGeocode(userExternalId, result.id, input);
    }
    return result;
  }

  public override async update(
    userExternalId: string,
    collectiveExternalId: string,
    resourceExternalId: string,
    input: AddressInput,
  ): Promise<AddressResponse | null> {
    const [existing] = await getAddressById.run(
      { addressExternalId: resourceExternalId, collectiveExternalId, userExternalId },
      this.db,
    );

    const result = await super.update(
      userExternalId,
      collectiveExternalId,
      resourceExternalId,
      input,
    );
    if (!result) {
      return result;
    }

    const shouldGeocode = !existing || addressGeoFieldsChanged(input, existing);

    if (shouldGeocode) {
      this.scheduleBackgroundGeocode(userExternalId, resourceExternalId, input);
      return result;
    }

    if (existing && existing.latitude != null && existing.longitude != null) {
      await updateAddressCoordinates.run(
        {
          addressExternalId: resourceExternalId,
          userExternalId,
          latitude: existing.latitude,
          longitude: existing.longitude,
        },
        this.db,
      );
      return {
        ...result,
        latitude: existing.latitude,
        longitude: existing.longitude,
      };
    }
    return result;
  }

  private scheduleBackgroundGeocode(
    userExternalId: string,
    addressExternalId: string,
    input: AddressInput,
  ): void {
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
            userExternalId,
            latitude: location.latitude,
            longitude: location.longitude,
          },
          db,
        );
        logger.debug({ addressExternalId, ...location }, 'Background geocode persisted');
      } catch (error) {
        logger.warn(
          { err: error, addressExternalId },
          'Background collective address geocode failed',
        );
      }
    });
  }
}
