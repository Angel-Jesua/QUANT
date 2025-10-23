# User Module - Credential Uniqueness Verification

This document describes the credential uniqueness verification functionality implemented in the user module.

## Overview

The credential uniqueness verification ensures that usernames and emails are unique across all user accounts in the system. This prevents duplicate accounts and maintains data integrity.

## Implementation Details

### Core Function: `checkCredentialUniqueness`

Located in `user.service.ts`, this function verifies if a username and/or email already exist in the database.

#### Function Signature
```typescript
async checkCredentialUniqueness(
  username?: string, 
  email?: string, 
  excludeUserId?: number
): Promise<ICredentialUniquenessResult>
```

#### Parameters
- `username` (optional): Username to check for uniqueness
- `email` (optional): Email to check for uniqueness
- `excludeUserId` (optional): User ID to exclude from the check (useful for updates)

#### Return Value
Returns an `ICredentialUniquenessResult` object with:
- `isUnique`: Boolean indicating if credentials are unique
- `errors`: Object containing specific error messages for duplicate fields

### Interface: `ICredentialUniquenessResult`

```typescript
interface ICredentialUniquenessResult {
  isUnique: boolean;
  errors: {
    username?: string;  // Error message if username is duplicated
    email?: string;     // Error message if email is duplicated
  };
}
```

## Usage Examples

### 1. Creating a New User

```typescript
const userService = new UserService();

// Check if credentials are unique before creating user
const uniquenessResult = await userService.checkCredentialUniqueness(
  'john_doe', 
  'john@example.com'
);

if (!uniquenessResult.isUnique) {
  console.log('Cannot create user - duplicates found:');
  if (uniquenessResult.errors.username) {
    console.log(`Username: ${uniquenessResult.errors.username}`);
  }
  if (uniquenessResult.errors.email) {
    console.log(`Email: ${uniquenessResult.errors.email}`);
  }
  return;
}

// Proceed with user creation
const userData = {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securePassword123',
  fullName: 'John Doe'
};

const user = await userService.createUser(userData);
```

### 2. Updating an Existing User

```typescript
const userService = new UserService();
const userId = 1;
const updateData = {
  username: 'john_doe_updated',
  email: 'john_updated@example.com'
};

// Check uniqueness excluding the current user
const uniquenessResult = await userService.checkCredentialUniqueness(
  updateData.username, 
  updateData.email, 
  userId
);

if (!uniquenessResult.isUnique) {
  console.log('Cannot update user - duplicates found');
  return;
}

// Proceed with user update
const updatedUser = await userService.updateUser(userId, updateData);
```

### 3. Checking Only One Field

```typescript
// Check only username
const usernameResult = await userService.checkCredentialUniqueness('jane_doe');

// Check only email
const emailResult = await userService.checkCredentialUniqueness(undefined, 'jane@example.com');
```

## Integration with Controllers

The uniqueness check is integrated into the following controller methods:

1. **`createUser`**: Verifies uniqueness before creating a new user
2. **`updateUser`**: Verifies uniqueness when updating username or email
3. **`register`**: Verifies uniqueness during user registration

### Error Handling

When duplicates are found, the controllers return HTTP status 409 (Conflict) with detailed error messages:

```json
{
  "error": "Validation failed",
  "details": {
    "username": "Username already exists",
    "email": "Email already exists"
  }
}
```

## Database Queries

The function uses Prisma Client's `findFirst` method with the following logic:

1. **For username check**:
   ```typescript
   const existingUsername = await prisma.userAccount.findFirst({
     where: {
       username: username,
       ...(excludeUserId && { id: { not: excludeUserId } })
     }
   });
   ```

2. **For email check**:
   ```typescript
   const existingEmail = await prisma.userAccount.findFirst({
     where: {
       email: email,
       ...(excludeUserId && { id: { not: excludeUserId } })
     }
   });
   ```

## Validation Integration

The uniqueness check integrates with existing validation functions:

- `validateCreateUserWithUniqueness`: Combines basic validation with uniqueness check
- `validateUpdateUserWithUniqueness`: Combines update validation with uniqueness check

## Performance Considerations

- The function performs separate queries for username and email checks
- Each query uses the database indexes on `username` and `email` fields
- The `excludeUserId` parameter ensures efficient updates without false positives

## Security Benefits

1. **Prevents Account Hijacking**: Ensures users can't create accounts with existing usernames or emails
2. **Data Integrity**: Maintains unique identification of users
3. **User Experience**: Provides clear feedback about registration conflicts

## Example Usage

See `uniqueness-example.ts` for a complete working example demonstrating all use cases.

## Testing

To test the functionality:

1. Set up a test database
2. Create test users with known usernames and emails
3. Run the uniqueness check functions with various scenarios
4. Verify the returned error messages match expected duplicates