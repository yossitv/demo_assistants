"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Namespace = void 0;
var Namespace = /** @class */ (function () {
    function Namespace(tenantId, knowledgeSpaceId, version) {
        this.tenantId = tenantId;
        this.knowledgeSpaceId = knowledgeSpaceId;
        this.version = version;
        this.value = "t_".concat(tenantId, "_ks_").concat(knowledgeSpaceId, "_").concat(version);
    }
    Namespace.prototype.toString = function () {
        return this.value;
    };
    return Namespace;
}());
exports.Namespace = Namespace;
