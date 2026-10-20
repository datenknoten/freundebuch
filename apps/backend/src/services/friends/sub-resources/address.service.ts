import type { AddressResponse, AddressType } from '@freundebuch/shared/index.js';
import type pg from 'pg';
import { FriendNotFoundError } from '../../../errors/friend-not-found.error.js';
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
import { addressGeoFieldsChanged } from '../../../utils/address-geo-fields-changed.js';
import { parseAddressType } from '../../../utils/parse-address-type.js';
import { parseStreetLine } from '../../../utils/parse-street-line.js';
import type { AddressLookupService } from '../../address-lookup.service.js';
import {
  SubResourceService,
  type SubResourceServiceOptions,
} from '../../base/sub-resource.service.js';

export interface AddressServiceOptions extends SubResourceServiceOptions {
  addressLookupService?: AddressLookupService;
}

export interface AddressData {
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  addressType: AddressType;
  label?: string;
  isPrimary: boolean;
}

function mapRow(row: IGetAddressesByFriendIdResult) {
  return {
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
  } satisfies AddressResponse;
}

/**
 * Geocoding runs in the background after a successful write so saves are
 * never blocked on slow or rate-limited external geocode calls. On update,
 * existing coordinates are preserved when the address fields haven't
 * changed.
 */
export class AddressService extends SubResourceService<
  AddressData,
  AddressResponse,
  IGetAddressesByFriendIdResult,
  IGetAddressesByFriendIdResult,
  IDeleteAddressResult
> {
  private readonly addressLookupService: AddressLookupService | undefined;

  constructor(options: AddressServiceOptions) {
    super({
      ...options,
      definition: {
        resourceName: 'address',
        resourceLabel: 'Address',
        ownerNotFound: FriendNotFoundError,
        hasPrimaryFlag: true,

        async createFn({ userExternalId, ownerExternalId: friendExternalId, data }, client) {
          return createAddress.run(
            {
              userExternalId,
              friendExternalId,
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

        async updateFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId, data },
          client,
        ) {
          return updateAddress.run(
            {
              userExternalId,
              friendExternalId,
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

        async deleteFn(
          { userExternalId, ownerExternalId: friendExternalId, resourceExternalId },
          client,
        ) {
          return deleteAddress.run(
            {
              userExternalId,
              friendExternalId,
              addressExternalId: resourceExternalId,
            },
            client,
          );
        },

        async clearPrimaryFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return clearPrimaryAddress.run({ userExternalId, friendExternalId }, client);
        },

        isPrimary(data) {
          return data.isPrimary;
        },

        setIsPrimary(data, isPrimary) {
          return { ...data, isPrimary };
        },

        async listFn({ userExternalId, ownerExternalId: friendExternalId }, client) {
          return getAddressesByFriendId.run({ userExternalId, friendExternalId }, client);
        },

        mapListResult: mapRow,

        mapResult: mapRow,
      },
    });

    this.addressLookupService = options.addressLookupService;
  }

  /**
   * Geocoding hooks into `addWithin` (not `add`) so it also runs for addresses
   * written during friend creation, which uses the caller's transaction.
   */
  protected override async addWithin(
    client: pg.Pool | pg.PoolClient,
    userExternalId: string,
    friendExternalId: string,
    data: AddressData,
  ) {
    const result = await super.addWithin(client, userExternalId, friendExternalId, data);
    if (result !== undefined) {
      this.scheduleBackgroundGeocode(userExternalId, result.id, data);
    }
    return result;
  }

  public override async update(
    userExternalId: string,
    friendExternalId: string,
    resourceExternalId: string,
    data: AddressData,
  ) {
    const [existing] = await getAddressById.run(
      { addressExternalId: resourceExternalId, friendExternalId, userExternalId },
      this.db,
    );

    const result = await super.update(userExternalId, friendExternalId, resourceExternalId, data);

    if (existing === undefined || addressGeoFieldsChanged(data, existing) === true) {
      this.scheduleBackgroundGeocode(userExternalId, resourceExternalId, data);
      return result;
    }

    // Address unchanged — carry forward previously geocoded coordinates.
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

  /**
   * Fire-and-forget geocode, scheduled while the write transaction is still
   * open: the deferred callback geocodes over the network before it touches the
   * row, so the commit has long landed by then. Errors are logged and never
   * propagate to the caller — saving an address must never fail because a
   * third-party geocode failed.
   */
  private scheduleBackgroundGeocode(
    userExternalId: string,
    addressExternalId: string,
    data: AddressData,
  ) {
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

    async function persistGeocode(geocoder: AddressLookupService, geocodeCountry: string) {
      try {
        const location = await geocoder.geocodeAddress(
          geocodeCountry,
          city,
          postalCode,
          street,
          houseNumber,
        );
        if (location === undefined) {
          logger.debug({ addressExternalId }, 'Background geocode returned no result for address');
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
        logger.warn({ err: error, addressExternalId }, 'Background address geocode failed');
      }
    }

    setImmediate(persistGeocode, service, country);
  }
}
