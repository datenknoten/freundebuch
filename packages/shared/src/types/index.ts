export interface User {
  externalId: string; // UUID for API exposure
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  externalId: string; // UUID for API exposure
  userExternalId: string; // Reference to user via external_id
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
}
