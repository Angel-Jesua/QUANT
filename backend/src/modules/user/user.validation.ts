import { ICreateUser, IRegisterUser, IRegistrationErrors, IUpdateUser, ICredentialUniquenessResult } from './user.types';

/**
 * Validates email format using a regular expression
 * @param email - Email to validate
 * @returns boolean - True if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates username format and length
 * @param username - Username to validate
 * @returns object - Validation result with isValid and message
 */
export function validateUsername(username: string): { isValid: boolean; message: string } {
  if (!username || username.trim().length === 0) {
    return { isValid: false, message: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }

  if (username.length > 50) {
    return { isValid: false, message: 'Username must be less than 50 characters long' };
  }

  // Allow alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, message: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  return { isValid: true, message: 'Username is valid' };
}

/**
 * Validates full name format and length
 * @param fullName - Full name to validate
 * @returns object - Validation result with isValid and message
 */
export function validateFullName(fullName: string): { isValid: boolean; message: string } {
  if (!fullName || fullName.trim().length === 0) {
    return { isValid: false, message: 'Full name is required' };
  }

  if (fullName.length < 2) {
    return { isValid: false, message: 'Full name must be at least 2 characters long' };
  }

  if (fullName.length > 100) {
    return { isValid: false, message: 'Full name must be less than 100 characters long' };
  }

  // Allow letters, spaces, apostrophes, and hyphens
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(fullName)) {
    return { isValid: false, message: 'Full name can only contain letters, spaces, apostrophes, and hyphens' };
  }

  return { isValid: true, message: 'Full name is valid' };
}

/**
 * Validates password format and length
 * @param password - Password to validate
 * @returns object - Validation result with isValid and message
 */
export function validatePassword(password: string): { isValid: boolean; message: string } {
  if (!password || password.length === 0) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }

  // Check for common weak passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, message: 'Password is too common. Please choose a stronger password.' };
  }

  return { isValid: true, message: 'Password meets minimum requirements' };
}

/**
 * Validates user creation data
 * @param userData - User data to validate
 * @returns object - Validation result with isValid and errors
 */
export function validateCreateUser(userData: ICreateUser): { isValid: boolean; errors: Partial<ICreateUser> } {
  const errors: Partial<ICreateUser> = {};

  // Validate username
  const usernameValidation = validateUsername(userData.username);
  if (!usernameValidation.isValid) {
    errors.username = usernameValidation.message;
  }

  // Validate email
  if (!userData.email || userData.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(userData.email)) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message;
  }

  // Validate full name
  const fullNameValidation = validateFullName(userData.fullName);
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.message;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates user registration data (including password confirmation and terms acceptance)
 * @param registrationData - Registration data to validate
 * @returns object - Validation result with isValid and errors
 */
export function validateRegisterUser(registrationData: IRegisterUser): { isValid: boolean; errors: IRegistrationErrors } {
  const errors: IRegistrationErrors = {};

  // Validate username
  const usernameValidation = validateUsername(registrationData.username);
  if (!usernameValidation.isValid) {
    errors.username = usernameValidation.message;
  }

  // Validate email
  if (!registrationData.email || registrationData.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(registrationData.email)) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  const passwordValidation = validatePassword(registrationData.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.message;
  }

  // Validate password confirmation
  if (!registrationData.confirmPassword || registrationData.confirmPassword.length === 0) {
    errors.confirmPassword = 'Password confirmation is required';
  } else if (registrationData.password !== registrationData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Validate full name
  const fullNameValidation = validateFullName(registrationData.fullName);
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.message;
  }

  // Validate terms acceptance
  if (!registrationData.acceptTerms) {
    errors.acceptTerms = 'You must accept the terms and conditions';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates user update data
 * @param userData - User update data to validate
 * @returns object - Validation result with isValid and errors
 */
export function validateUpdateUser(userData: IUpdateUser): { isValid: boolean; errors: Partial<IUpdateUser> } {
  const errors: Partial<IUpdateUser> = {};

  // Validate username if provided
  if (userData.username !== undefined) {
    const usernameValidation = validateUsername(userData.username);
    if (!usernameValidation.isValid) {
      errors.username = usernameValidation.message;
    }
  }

  // Validate email if provided
  if (userData.email !== undefined) {
    if (!userData.email || userData.email.trim().length === 0) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(userData.email)) {
      errors.email = 'Invalid email format';
    }
  }

  // Validate full name if provided
  if (userData.fullName !== undefined) {
    const fullNameValidation = validateFullName(userData.fullName);
    if (!fullNameValidation.isValid) {
      errors.fullName = fullNameValidation.message;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates user creation data including credential uniqueness
 * @param userData - User data to validate
 * @param uniquenessResult - Result from credential uniqueness check
 * @returns object - Validation result with isValid and errors
 */
export function validateCreateUserWithUniqueness(
  userData: ICreateUser,
  uniquenessResult: ICredentialUniquenessResult
): { isValid: boolean; errors: Partial<ICreateUser> } {
  // First, perform basic validation
  const basicValidation = validateCreateUser(userData);
  
  // Merge uniqueness errors with basic validation errors
  const mergedErrors = {
    ...basicValidation.errors,
    ...uniquenessResult.errors
  };
  
  return {
    isValid: Object.keys(mergedErrors).length === 0,
    errors: mergedErrors
  };
}

/**
 * Validates user update data including credential uniqueness
 * @param userData - User update data to validate
 * @param uniquenessResult - Result from credential uniqueness check
 * @returns object - Validation result with isValid and errors
 */
export function validateUpdateUserWithUniqueness(
  userData: IUpdateUser,
  uniquenessResult: ICredentialUniquenessResult
): { isValid: boolean; errors: Partial<IUpdateUser> } {
  // First, perform basic validation
  const basicValidation = validateUpdateUser(userData);
  
  // Merge uniqueness errors with basic validation errors
  const mergedErrors = {
    ...basicValidation.errors,
    ...uniquenessResult.errors
  };
  
  return {
    isValid: Object.keys(mergedErrors).length === 0,
    errors: mergedErrors
  };
}

/**
 * Validates login data
 * @param loginData - Login data to validate
 * @returns object - Validation result with isValid and errors
 */
export function validateLogin(loginData: { email: string; password: string }): { isValid: boolean; errors: { email?: string; password?: string } } {
  const errors: { email?: string; password?: string } = {};

  // Validate email
  if (!loginData.email || loginData.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(loginData.email)) {
    errors.email = 'Invalid email format';
  }

  // Validate password
  if (!loginData.password || loginData.password.length === 0) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}