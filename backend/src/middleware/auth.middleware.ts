/**
 * JWT authentication middleware to protect routes.
 * Validates Bearer token, decodes payload, attaches req.userId and req.user, then next()
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, VerifyOptions } from 'jsonwebtoken';

type ReqWithUser = Request & { user?: { id: number; email?: string; username?: string; role?: string }; userId?: number };

function extractBearerToken(header?: string | null): string | null {
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
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

    const verifyOptions: VerifyOptions = { algorithms: ['HS256'] };
    if (issuer) verifyOptions.issuer = issuer;
    if (audience) verifyOptions.audience = audience;

    const decoded = jwt.verify(token, secret, verifyOptions);
    if (!decoded || typeof decoded === 'string') {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
      return;
    }

    const payload = decoded as JwtPayload & { email?: string; username?: string; role?: string; id?: number | string };
    const sub = payload.sub ?? payload.id;
    const idNum = typeof sub === 'string' ? parseInt(sub, 10) : typeof sub === 'number' ? sub : NaN;

    if (isNaN(idNum)) {
      res.status(401).json({ error: 'Unauthorized', message: 'Token payload missing valid subject' });
      return;
    }

    (req as ReqWithUser).userId = idNum;
    (req as ReqWithUser).user = {
      id: idNum,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token verification failed' });
  }
}