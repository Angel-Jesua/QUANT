import { UserAccount, UserRole, AvatarType } from '@prisma/client';

// Base user interface
export interface IUser {
  id: number;
  username: string;
  email: string;
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
  password: string;
  fullName: string;
  role?: UserRole;
}

// User creation interface with hashed password (internal use)
export interface ICreateUserWithHash {
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
}

// User update interface
export interface IUpdateUser {
  username?: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

// User response interface (without sensitive data)
export interface IUserResponse extends Omit<IUser, 'passwordHash'> {
  profileImageUrl?: string;
  avatarType: AvatarType;
  lastLogin?: Date;
}

// User registration interface
export interface IRegisterUser {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role?: UserRole;
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