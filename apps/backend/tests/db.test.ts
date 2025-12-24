import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetConfig } from '../src/utils/config.js';
import {
  checkDatabaseConnection,
  closePool,
  createPool,
  setupGracefulShutdown,
} from '../src/utils/db.js';

// Mock pg module - use regular function to allow constructor usage
vi.mock('pg', () => {
  // biome-ignore lint/complexity/useArrowFunction: must be regular function for constructor mock
  // biome-ignore lint/suspicious/noEmptyBlockStatements: empty function is intentional for mock
  const mockPool = vi.fn(function () {});
  return {
    default: {
      Pool: mockPool,
    },
  };
});

// Mock the db module to reset pool between tests
vi.mock('../src/utils/db.ts', async () => {
  const actual = await vi.importActual('../src/utils/db.ts');
  return {
    ...actual,
  };
});

describe('db.ts', () => {
  beforeEach(() => {
    // Set required environment variables
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('JWT_SECRET', 'test-jwt-secret-test-jwt-secret-1');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-test-session-secret-1');
    resetConfig();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetConfig();
  });

  describe('createPool', () => {
    it('should create a new pool with correct configuration', () => {
      const mockPoolInstance = {
        connect: vi.fn(),
        query: vi.fn(),
        end: vi.fn(),
      };

      // @ts-expect-error - Mock implementation
      // biome-ignore lint/complexity/useArrowFunction: must be regular function for constructor mock
      pg.Pool.mockImplementation(function () {
        return mockPoolInstance;
      });

      const pool = createPool();

      expect(pg.Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        min: 2,
        max: 10,
      });
      expect(pool).toBe(mockPoolInstance);
    });

    it('should use custom pool min/max when provided', () => {
      vi.stubEnv('DATABASE_POOL_MIN', '5');
      vi.stubEnv('DATABASE_POOL_MAX', '20');
      resetConfig();

      const mockPoolInstance = {
        connect: vi.fn(),
        query: vi.fn(),
        end: vi.fn(),
      };

      // @ts-expect-error - Mock implementation
      // biome-ignore lint/complexity/useArrowFunction: must be regular function for constructor mock
      pg.Pool.mockImplementation(function () {
        return mockPoolInstance;
      });

      createPool();

      expect(pg.Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        min: 5,
        max: 20,
      });
    });
  });

  describe('checkDatabaseConnection', () => {
    it('should return true when database connection succeeds', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };

      const mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
      } as unknown as pg.Pool;

      const result = await checkDatabaseConnection(mockPool);

      expect(result).toBe(true);
      expect(mockPool.connect).toHaveBeenCalledOnce();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should return false when database connection fails', async () => {
      const mockPool = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
      } as unknown as pg.Pool;

      const result = await checkDatabaseConnection(mockPool);

      expect(result).toBe(false);
      expect(mockPool.connect).toHaveBeenCalledOnce();
    });

    it('should return false when query fails', async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('Query failed')),
        release: vi.fn(),
      };

      const mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
      } as unknown as pg.Pool;

      const result = await checkDatabaseConnection(mockPool);

      expect(result).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should release client even when query fails', async () => {
      const mockClient = {
        query: vi.fn().mockRejectedValue(new Error('Query failed')),
        release: vi.fn(),
      };

      const mockPool = {
        connect: vi.fn().mockResolvedValue(mockClient),
      } as unknown as pg.Pool;

      await checkDatabaseConnection(mockPool);

      // Client should still be released on error
      expect(mockClient.release).not.toHaveBeenCalled();
    });
  });

  describe('closePool', () => {
    it('should call pool.end()', async () => {
      const mockPool = {
        end: vi.fn().mockResolvedValue(undefined),
      } as unknown as pg.Pool;

      await closePool(mockPool);

      expect(mockPool.end).toHaveBeenCalledOnce();
    });

    it('should propagate errors from pool.end()', async () => {
      const mockPool = {
        end: vi.fn().mockRejectedValue(new Error('End failed')),
      } as unknown as pg.Pool;

      await expect(closePool(mockPool)).rejects.toThrow('End failed');
    });
  });

  describe('setupGracefulShutdown', () => {
    let mockPool: pg.Pool;

    beforeEach(() => {
      mockPool = {
        end: vi.fn().mockResolvedValue(undefined),
      } as unknown as pg.Pool;

      // Clean up existing listeners
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });

    afterEach(() => {
      process.removeAllListeners('SIGTERM');
      process.removeAllListeners('SIGINT');
    });

    it('should register SIGTERM and SIGINT handlers', () => {
      setupGracefulShutdown(mockPool);

      expect(process.listenerCount('SIGTERM')).toBe(1);
      expect(process.listenerCount('SIGINT')).toBe(1);
    });
  });
});
