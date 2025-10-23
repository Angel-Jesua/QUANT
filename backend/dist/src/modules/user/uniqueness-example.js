"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demonstrateCredentialUniqueness = demonstrateCredentialUniqueness;
const user_service_1 = require("./user.service");
/**
 * Example demonstrating how to use the credential uniqueness check functionality
 */
async function demonstrateCredentialUniqueness() {
    const userService = new user_service_1.UserService();
    console.log('=== Credential Uniqueness Check Examples ===\n');
    // Example 1: Check both username and email for a new user
    console.log('1. Checking new user credentials:');
    const newUserData = {
        username: 'john_doe',
        email: 'john@example.com'
    };
    const uniquenessResult1 = await userService.checkCredentialUniqueness(newUserData.username, newUserData.email);
    console.log(`Username: ${newUserData.username}`);
    console.log(`Email: ${newUserData.email}`);
    console.log(`Is unique: ${uniquenessResult1.isUnique}`);
    if (!uniquenessResult1.isUnique) {
        console.log('Errors:');
        if (uniquenessResult1.errors.username) {
            console.log(`  - Username: ${uniquenessResult1.errors.username}`);
        }
        if (uniquenessResult1.errors.email) {
            console.log(`  - Email: ${uniquenessResult1.errors.email}`);
        }
    }
    console.log('');
    // Example 2: Check only username
    console.log('2. Checking only username:');
    const usernameOnlyResult = await userService.checkCredentialUniqueness('jane_doe');
    console.log(`Username: jane_doe`);
    console.log(`Is unique: ${usernameOnlyResult.isUnique}`);
    if (!usernameOnlyResult.isUnique) {
        console.log(`Error: ${usernameOnlyResult.errors.username}`);
    }
    console.log('');
    // Example 3: Check only email
    console.log('3. Checking only email:');
    const emailOnlyResult = await userService.checkCredentialUniqueness(undefined, 'jane@example.com');
    console.log(`Email: jane@example.com`);
    console.log(`Is unique: ${emailOnlyResult.isUnique}`);
    if (!emailOnlyResult.isUnique) {
        console.log(`Error: ${emailOnlyResult.errors.email}`);
    }
    console.log('');
    // Example 4: Update user scenario (exclude current user from check)
    console.log('4. Checking credentials for user update (excluding current user):');
    const currentUserId = 1;
    const updateUserData = {
        username: 'john_doe_updated',
        email: 'john_updated@example.com'
    };
    const updateUniquenessResult = await userService.checkCredentialUniqueness(updateUserData.username, updateUserData.email, currentUserId);
    console.log(`User ID to exclude: ${currentUserId}`);
    console.log(`New username: ${updateUserData.username}`);
    console.log(`New email: ${updateUserData.email}`);
    console.log(`Is unique: ${updateUniquenessResult.isUnique}`);
    if (!updateUniquenessResult.isUnique) {
        console.log('Errors:');
        if (updateUniquenessResult.errors.username) {
            console.log(`  - Username: ${updateUniquenessResult.errors.username}`);
        }
        if (updateUniquenessResult.errors.email) {
            console.log(`  - Email: ${updateUniquenessResult.errors.email}`);
        }
    }
    console.log('');
    // Example 5: Practical usage in user creation
    console.log('5. Practical example: User creation workflow');
    const newUserCreationData = {
        username: 'new_user',
        email: 'newuser@example.com',
        password: 'securePassword123',
        fullName: 'New User'
    };
    try {
        // Step 1: Check credential uniqueness
        const creationUniquenessCheck = await userService.checkCredentialUniqueness(newUserCreationData.username, newUserCreationData.email);
        if (!creationUniquenessCheck.isUnique) {
            console.log('Cannot create user - duplicates found:');
            Object.entries(creationUniquenessCheck.errors).forEach(([field, error]) => {
                console.log(`  ${field}: ${error}`);
            });
            return;
        }
        // Step 2: If unique, proceed with user creation
        console.log('Credentials are unique, proceeding with user creation...');
        // const createdUser = await userService.createUser(newUserCreationData);
        // console.log('User created successfully:', createdUser);
    }
    catch (error) {
        console.error('Error during user creation:', error);
    }
}
// Run the example if this file is executed directly
if (require.main === module) {
    demonstrateCredentialUniqueness().catch(console.error);
}
