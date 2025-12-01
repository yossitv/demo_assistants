"use strict";
// Custom error classes for the application
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.ExternalServiceError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = void 0;
class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Authorization failed') {
        super(message);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ExternalServiceError extends Error {
    statusCode;
    constructor(message, statusCode = 502) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
class InternalError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InternalError';
    }
}
exports.InternalError = InternalError;
//# sourceMappingURL=errors.js.map