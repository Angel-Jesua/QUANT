"use strict";
/**
 * JWT authentication middleware to protect routes.
 * Validates Bearer token, decodes payload, attaches req.userId and req.user, then next()
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJWT = authenticateJWT;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function extractBearerToken(header) {
    if (!header)
        return null;
    const parts = header.split(' ');
    if (parts.length !== 2)
        return null;
    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme))
        return null;
    return token;
}
function authenticateJWT(req, res, next) {
    try {
        // Try to get token from Authorization header first, then from cookies
        const authHeader = req.headers['authorization'] || req.get('Authorization');
        let token = extractBearerToken(typeof authHeader === 'string' ? authHeader : null);
        // Fallback to cookie if no Authorization header
        if (!token && req.cookies?.token) {
            token = req.cookies.token;
        }
        if (!token) {
            res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
            return;
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            res.status(500).json({ error: 'Server configuration error', message: 'JWT secret not configured' });
            return;
        }
        const issuer = process.env.JWT_ISSUER;
        const audience = process.env.JWT_AUDIENCE;
        const verifyOptions = { algorithms: ['HS256'] };
        if (issuer)
            verifyOptions.issuer = issuer;
        if (audience)
            verifyOptions.audience = audience;
        const decoded = jsonwebtoken_1.default.verify(token, secret, verifyOptions);
        if (!decoded || typeof decoded === 'string') {
            res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
            return;
        }
        const payload = decoded;
        const sub = payload.sub ?? payload.id;
        const idNum = typeof sub === 'string' ? parseInt(sub, 10) : typeof sub === 'number' ? sub : NaN;
        if (isNaN(idNum)) {
            res.status(401).json({ error: 'Unauthorized', message: 'Token payload missing valid subject' });
            return;
        }
        req.userId = idNum;
        req.user = {
            id: idNum,
            email: payload.email,
            username: payload.username,
            role: payload.role,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized', message: 'Token verification failed' });
    }
}
