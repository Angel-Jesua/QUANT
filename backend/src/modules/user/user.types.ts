import { UserAccount, UserRole, AvatarType } from '@prisma/client';

export type ProfileImageStatus = 'custom' | 'default' | 'none';

// Base user interface
export interface IUser {
  id: number;
  username: string;
  email: string;
  cedula?: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User creation interface
export interface ICreateUser {
  username: string;
  email: string;
  cedula?: string;
  password: string;
  fullName: string;
  role?: UserRole;
  profileImageUrl?: string | null;
}

// User creation interface with hashed password (internal use)
export interface ICreateUserWithHash {
  username: string;
  email: string;
  cedula?: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
  profileImageUrl?: string | null;
}

// User update interface
export interface IUpdateUser {
  username?: string;
  email?: string;
  cedula?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  profileImageUrl?: string | null;
}

// User response interface (without sensitive data)
export interface IUserResponse extends Omit<IUser, 'passwordHash'> {
  profileImageUrl?: string;
  profileImageStatus: ProfileImageStatus;
  avatarType: AvatarType;
  lastLogin?: Date;
}

// Detailed user response interface
export interface IUserDetailsResponse extends IUserResponse {
  lastActivity?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  mustChangePassword: boolean;
  googleId?: string | null;
  facebookId?: string | null;
  createdById?: number | null;
  updatedById?: number | null;
  _count?: {
    sessions: number;
    auditLogs: number;
    createdClients: number;
    updatedClients: number;
    createdAccounts: number;
    updatedAccounts: number;
    createdCurrencies: number;
    updatedCurrencies: number;
  };
}

// User registration interface
export interface IRegisterUser {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role?: UserRole;
  profileImageUrl?: string | null;
  acceptTerms: boolean;
}

// Registration validation errors interface
export interface IRegistrationErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  acceptTerms?: string;
  general?: string;
}

// Registration response interface
export interface IRegistrationResponse {
  success: boolean;
  message: string;
  user?: IUserResponse;
  errors?: IRegistrationErrors;
}

// User authentication interface
export interface ILoginUser {
  email: string;
  password: string;
}

// User session interface
export interface IUserSession {
  id: number;
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
}

// Interface for credential uniqueness check result
export interface ICredentialUniquenessResult {
  isUnique: boolean;
  errors: {
    username?: string;
    email?: string;
  };
}

/**
 * Authentication response returned on successful login
 */
export interface IAuthResponse {
  token: string;
  expiresIn: string;
  user: IUserResponse;
}