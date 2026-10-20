import type { AddressResponse } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import { CollectiveNotFoundError } from '../../../errors/collective-not-found.error.js';
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
import type { AddressData } from '../../friends/sub-resources/address.service.js';

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
  AddressData,
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
        resourceLabel: 'Address',
        ownerNotFound: CollectiveNotFoundError,
        hasPrimaryFlag: true,

        createFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, data },
          client,
        ) => {
          return createAddress.run(
            {
              userExternalId,
              collectiveExternalId,
              streetLine1: data.streetLine1 ?? null,
              streetLine2: data.streetLine2 ?? null,
              city: data.city ?? null,
              stateProvince: data.stateProvince ?? null,
              postalCode: data.postalCode ?? null,
              country: data.country ?? null,
              addressType: data.addressType,
              label: data.label ?? null,
              isPrimary: data.isPrimary,
              latitude: null,
              longitude: null,
            },
            client,
          );
        },

        updateFn: async (
          { userExternalId, ownerExternalId: collectiveExternalId, resourceExternalId, data },
          client,
        ) => {
          return updateAddress.run(
            {
              userExternalId,
              collectiveExternalId,
              addressExternalId: resourceExternalId,
              streetLine1: data.streetLine1 ?? null,
              streetLine2: data.streetLine2 ?? null,
              city: data.city ?? null,
              stateProvince: data.stateProvince ?? null,
              postalCode: data.postalCode ?? null,
              country: data.country ?? null,
              addressType: data.addressType,
              label: data.label ?? null,
              isPrimary: data.isPrimary,
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

        isPrimary: (data) => data.isPrimary,

        setIsPrimary: (data, isPrimary) => ({ ...data, isPrimary }),

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
    data: AddressData,
  ) {
    const result = await super.addWithin(client, userExternalId, collectiveExternalId, data);
    if (result !== undefined) {
      this.scheduleBackgroundGeocode(userExternalId, result.id, data);
    }
    return result;
  }

  public override async update(
    userExternalId: string,
    collectiveExternalId: string,
    resourceExternalId: string,
    data: AddressData,
  ) {
    const [existing] = await getAddressById.run(
      { addressExternalId: resourceExternalId, collectiveExternalId, userExternalId },
      this.db,
    );

    const result = await super.update(
      userExternalId,
      collectiveExternalId,
      resourceExternalId,
      data,
    );

    if (existing === undefined || addressGeoFieldsChanged(data, existing) === true) {
      this.scheduleBackgroundGeocode(userExternalId, resourceExternalId, data);
      return result;
    }

    if (existing.latitude === null || existing.longitude === null) {
      return result;
    }
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

  private scheduleBackgroundGeocode(
    userExternalId: string,
    addressExternalId: string,
    data: AddressData,
  ): void {
    const service = this.addressLookupService;
    const country = data.country;
    if (service === undefined || country === undefined || country === '') {
      return;
    }

    const logger = this.logger;
    const db = this.db;
    const city = data.city ?? '';
    const postalCode = data.postalCode ?? '';
    const { street, houseNumber } = parseStreetLine(data.streetLine1);

    setImmediate(async () => {
      try {
        const location = await service.geocodeAddress(
          country,
          city,
          postalCode,
          street,
          houseNumber,
        );
        if (location === undefined) {
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
