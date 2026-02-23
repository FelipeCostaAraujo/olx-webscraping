import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
        appId: string;
        email: string;
        name: string;
        roles: string[];
    };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token not provided' });
        return;
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        res.status(500).json({ error: 'JWT secret not configured' });
        return;
    }

    try {
        const payload = jwt.verify(token, Buffer.from(secret, 'base64')) as any;
        req.user = {
            sub: payload.sub,
            appId: payload.appId,
            email: payload.email,
            name: payload.name,
            roles: payload.roles ?? [],
        };
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
