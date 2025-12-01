"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyJwt = verifyJwt;
const jwt = __importStar(require("jsonwebtoken"));
function verifyJwt(token, logger) {
    const timestamp = new Date().toISOString();
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        const error = 'JWT_SECRET not configured';
        logger?.warn('JWT verification failed', { timestamp, error, hasJWT: false });
        return { isValid: false, error };
    }
    if (!token) {
        const error = 'Empty JWT token';
        logger?.warn('JWT verification failed', { timestamp, error, hasJWT: false });
        return { isValid: false, error };
    }
    try {
        const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
        if (!decoded.sub || !decoded['custom:tenant_id']) {
            const error = 'Missing required claims';
            logger?.warn('JWT verification failed', { timestamp, error, hasJWT: true });
            return { isValid: false, error };
        }
        logger?.info('JWT verification succeeded', { timestamp, hasJWT: true });
        return {
            isValid: true,
            payload: decoded
        };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : 'Invalid JWT';
        logger?.warn('JWT verification failed', { timestamp, error, hasJWT: true });
        return { isValid: false, error };
    }
}
//# sourceMappingURL=jwtVerify.js.map