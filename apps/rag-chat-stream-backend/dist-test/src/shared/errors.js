"use strict";
// Custom error classes for the application
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalError = exports.ExternalServiceError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = void 0;
var AuthenticationError = /** @class */ (function (_super) {
    __extends(AuthenticationError, _super);
    function AuthenticationError(message) {
        if (message === void 0) { message = 'Authentication failed'; }
        var _this = _super.call(this, message) || this;
        _this.name = 'AuthenticationError';
        return _this;
    }
    return AuthenticationError;
}(Error));
exports.AuthenticationError = AuthenticationError;
var AuthorizationError = /** @class */ (function (_super) {
    __extends(AuthorizationError, _super);
    function AuthorizationError(message) {
        if (message === void 0) { message = 'Authorization failed'; }
        var _this = _super.call(this, message) || this;
        _this.name = 'AuthorizationError';
        return _this;
    }
    return AuthorizationError;
}(Error));
exports.AuthorizationError = AuthorizationError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'ValidationError';
        return _this;
    }
    return ValidationError;
}(Error));
exports.ValidationError = ValidationError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'NotFoundError';
        return _this;
    }
    return NotFoundError;
}(Error));
exports.NotFoundError = NotFoundError;
var ExternalServiceError = /** @class */ (function (_super) {
    __extends(ExternalServiceError, _super);
    function ExternalServiceError(message, statusCode) {
        if (statusCode === void 0) { statusCode = 502; }
        var _this = _super.call(this, message) || this;
        _this.statusCode = statusCode;
        _this.name = 'ExternalServiceError';
        return _this;
    }
    return ExternalServiceError;
}(Error));
exports.ExternalServiceError = ExternalServiceError;
var InternalError = /** @class */ (function (_super) {
    __extends(InternalError, _super);
    function InternalError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'InternalError';
        return _this;
    }
    return InternalError;
}(Error));
exports.InternalError = InternalError;
