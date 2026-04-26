import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add latitude/longitude columns to friend addresses
  pgm.addColumns(
    { schema: 'friends', name: 'friend_addresses' },
    {
      latitude: {
        type: 'double precision',
        comment: 'WGS84 latitude from geocoding',
      },
      longitude: {
        type: 'double precision',
        comment: 'WGS84 longitude from geocoding',
      },
    },
  );

  // Add latitude/longitude columns to collective addresses
  pgm.addColumns(
    { schema: 'collectives', name: 'collective_addresses' },
    {
      latitude: {
        type: 'double precision',
        comment: 'WGS84 latitude from geocoding',
      },
      longitude: {
        type: 'double precision',
        comment: 'WGS84 longitude from geocoding',
      },
    },
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns({ schema: 'friends', name: 'friend_addresses' }, ['latitude', 'longitude']);
  pgm.dropColumns({ schema: 'collectives', name: 'collective_addresses' }, [
    'latitude',
    'longitude',
  ]);
}
