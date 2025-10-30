"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTConfigError = void 0;
exports.isStrongSecret = isStrongSecret;
exports.isValidExpiresIn = isValidExpiresIn;
exports.generateAccessToken = generateAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class JWTConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'JWTConfigError';
    }
}
exports.JWTConfigError = JWTConfigError;
function isStrongSecret(secret) {
    if (!secret || secret.length < 32)
        return false;
    const hasLower = /[a-z]/.test(secret);
    const hasUpper = /[A-Z]/.test(secret);
    const hasDigit = /[0-9]/.test(secret);
    const hasSymbol = /[^A-Za-z0-9]/.test(secret);
    const complexity = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    return complexity >= 3;
}
function isValidExpiresIn(value) {
    if (!value)
        return false;
    const v = String(value).trim();
    if (/^\d+$/.test(v))
        return true; // seconds as number string
    if (/^\d+\s*(ms|s|m|h|d|w|y)$/.test(v))
        return true;
    if (/^\d+\s*(seconds|minutes|hours|days|weeks|years)$/.test(v))
        return true;
    return false;
}
function generateAccessToken(user) {
    const rawSecret = process.env.JWT_SECRET;
    if (!rawSecret || !isStrongSecret(rawSecret)) {
        throw new JWTConfigError('Invalid JWT secret configuration');
    }
    const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
    if (!isValidExpiresIn(expiresIn)) {
        throw new JWTConfigError('Invalid JWT_EXPIRES_IN format');
    }
    const issuer = process.env.JWT_ISSUER;
    const audience = process.env.JWT_AUDIENCE;
    const normalizedEmail = (user.email || '').toLowerCase();
    // Minimal payload - do not add iat or exp manually
    const payload = {
        sub: String(user.id),
        email: normalizedEmail,
        username: user.username,
        role: String(user.role),
    };
    const expiresNormalized = /^\d+$/.test(expiresIn) ? Number(expiresIn) : expiresIn;
    const signOptions = {
        algorithm: 'HS256',
        expiresIn: expiresNormalized,
        ...(issuer ? { issuer } : {}),
        ...(audience ? { audience } : {}),
    };
    let token;
    try {
        token = jsonwebtoken_1.default.sign(payload, rawSecret, signOptions);
    }
    catch {
        // Signing error - do not expose internals
        throw new Error('JWT_SIGN_FAILED');
    }
    // Optional verification in development to ensure standard claims present
    if (process.env.NODE_ENV !== 'production') {
        try {
            const verifyOptions = { algorithms: ['HS256'] };
            if (issuer)
                verifyOptions.issuer = issuer;
            if (audience)
                verifyOptions.audience = audience;
            jsonwebtoken_1.default.verify(token, rawSecret, verifyOptions);
        }
        catch {
            throw new Error('JWT_VERIFY_FAILED');
        }
    }
    return {
        token,
        tokenType: 'Bearer',
        expiresIn,
        user: {
            id: user.id,
            email: normalizedEmail,
            username: user.username,
            role: String(user.role),
        },
    };
}
