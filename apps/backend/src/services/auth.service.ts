import type pg from 'pg';
import type { Logger } from 'pino';
import {
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenAsUsed,
} from '../models/queries/password-reset-tokens.queries.js';
import {
  createSession,
  deleteSessionByToken,
  deleteUserSessions,
  getSessionByToken,
} from '../models/queries/sessions.queries.js';
import {
  createUser,
  getUserByEmail,
  getUserByExternalId,
  updateUserPassword,
} from '../models/queries/users.queries.js';
import {
  generatePasswordResetToken,
  generateSessionToken,
  generateToken,
  getPasswordResetExpiry,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from '../utils/auth.js';

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    externalId: string;
    email: string;
  };
  accessToken: string;
  sessionToken: string;
}

export class AuthService {
  private db: pg.Pool;
  private logger: Logger;

  constructor(db: pg.Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<AuthResult> {
    this.logger.info({ email: data.email }, 'Registering new user');

    // Check if user already exists
    const existingUser = await getUserByEmail.run({ email: data.email }, this.db);

    if (existingUser.length > 0) {
      this.logger.warn({ email: data.email }, 'User already exists');
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const [newUser] = await createUser.run(
      {
        email: data.email,
        passwordHash,
      },
      this.db,
    );

    if (!newUser) {
      this.logger.error({ email: data.email }, 'Failed to create user');
      throw new Error('Failed to create user');
    }

    this.logger.info(
      { userId: newUser.external_id, email: newUser.email },
      'User registered successfully',
    );

    // Generate JWT token
    const accessToken = generateToken({
      userId: newUser.external_id,
      email: newUser.email,
    });

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiry();

    await createSession.run(
      {
        userExternalId: newUser.external_id,
        tokenHash,
        expiresAt,
      },
      this.db,
    );

    return {
      user: {
        externalId: newUser.external_id,
        email: newUser.email,
      },
      accessToken,
      sessionToken,
    };
  }

  /**
   * Login an existing user
   */
  async login(data: LoginRequest): Promise<AuthResult> {
    this.logger.info({ email: data.email }, 'User attempting login');

    // Get user by email
    const users = await getUserByEmail.run({ email: data.email }, this.db);

    if (users.length === 0) {
      this.logger.warn({ email: data.email }, 'User not found');
      throw new Error('Invalid credentials');
    }

    const user = users[0];

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await verifyPassword(data.password, user.password_hash);

    if (!isValid) {
      this.logger.warn({ email: data.email }, 'Invalid password');
      throw new Error('Invalid credentials');
    }

    this.logger.info(
      { userId: user.external_id, email: user.email },
      'User logged in successfully',
    );

    // Generate JWT token
    const accessToken = generateToken({
      userId: user.external_id,
      email: user.email,
    });

    // Create session
    const sessionToken = generateSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiry();

    await createSession.run(
      {
        userExternalId: user.external_id,
        tokenHash,
        expiresAt,
      },
      this.db,
    );

    return {
      user: {
        externalId: user.external_id,
        email: user.email,
      },
      accessToken,
      sessionToken,
    };
  }

  /**
   * Logout a user by deleting their session
   */
  async logout(sessionToken: string): Promise<void> {
    this.logger.info('User logging out');

    const tokenHash = hashSessionToken(sessionToken);
    await deleteSessionByToken.run({ tokenHash }, this.db);

    this.logger.info('User logged out successfully');
  }

  /**
   * Refresh a user's access token using their session token
   */
  async refresh(sessionToken: string): Promise<AuthResult> {
    this.logger.info('Refreshing access token');

    const tokenHash = hashSessionToken(sessionToken);
    const sessions = await getSessionByToken.run({ tokenHash }, this.db);

    if (sessions.length === 0) {
      this.logger.warn('Invalid or expired session');
      throw new Error('Invalid or expired session');
    }

    const session = sessions[0];

    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Get fresh user data by external ID
    const users = await getUserByExternalId.run({ externalId: session.user_external_id }, this.db);

    if (users.length === 0) {
      this.logger.error('User not found for valid session');
      throw new Error('User not found');
    }

    const user = users[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Generate new JWT token
    const accessToken = generateToken({
      userId: user.external_id,
      email: user.email,
    });

    this.logger.info({ userId: user.external_id }, 'Access token refreshed successfully');

    return {
      user: {
        externalId: user.external_id,
        email: user.email,
      },
      accessToken,
      sessionToken, // Return the same session token
    };
  }

  /**
   * Logout a user from all devices by deleting all their sessions
   */
  async logoutAll(userExternalId: string): Promise<void> {
    this.logger.info({ userId: userExternalId }, 'Logging out user from all devices');

    await deleteUserSessions.run({ userExternalId }, this.db);

    this.logger.info({ userId: userExternalId }, 'User logged out from all devices');
  }

  /**
   * Initiate password reset flow by creating a reset token
   * Returns the token which should be sent via email (not implemented here)
   */
  async forgotPassword(email: string): Promise<string> {
    this.logger.info({ email }, 'Password reset requested');

    // Check if user exists
    const users = await getUserByEmail.run({ email }, this.db);

    if (users.length === 0) {
      // Don't reveal if user exists or not (security best practice)
      this.logger.warn({ email }, 'Password reset requested for non-existent user');
      // Still return a token to prevent user enumeration
      return generatePasswordResetToken();
    }

    const user = users[0];

    if (!user) {
      return generatePasswordResetToken();
    }

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const tokenHash = hashSessionToken(resetToken);
    const expiresAt = getPasswordResetExpiry();

    // Store hashed token in database
    await createPasswordResetToken.run(
      {
        userExternalId: user.external_id,
        tokenHash,
        expiresAt,
      },
      this.db,
    );

    this.logger.info({ userId: user.external_id }, 'Password reset token created');

    return resetToken;
  }

  /**
   * Reset password using a valid reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.info('Password reset attempted');

    const tokenHash = hashSessionToken(token);

    // Get valid reset token
    const tokens = await getPasswordResetToken.run({ tokenHash }, this.db);

    if (tokens.length === 0) {
      this.logger.warn('Invalid or expired password reset token');
      throw new Error('Invalid or expired password reset token');
    }

    const resetToken = tokens[0];

    if (!resetToken) {
      throw new Error('Invalid or expired password reset token');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Get user by external ID
    const userResult = await getUserByExternalId.run(
      { externalId: resetToken.user_external_id },
      this.db,
    );

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult[0];

    if (!user) {
      throw new Error('User not found');
    }

    // Update password
    await updateUserPassword.run(
      { passwordHash, externalId: resetToken.user_external_id },
      this.db,
    );

    // Mark token as used
    await markPasswordResetTokenAsUsed.run({ tokenHash }, this.db);

    // Invalidate all sessions for security
    await deleteUserSessions.run({ userExternalId: user.external_id }, this.db);

    this.logger.info({ userId: user.external_id }, 'Password reset successfully');
  }
}
