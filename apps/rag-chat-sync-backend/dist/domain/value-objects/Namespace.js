"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Namespace = void 0;
class Namespace {
    tenantId;
    knowledgeSpaceId;
    version;
    value;
    constructor(tenantId, knowledgeSpaceId, version) {
        this.tenantId = tenantId;
        this.knowledgeSpaceId = knowledgeSpaceId;
        this.version = version;
        this.value = `t_${tenantId}_ks_${knowledgeSpaceId}_${version}`;
    }
    toString() {
        return this.value;
    }
}
exports.Namespace = Namespace;
//# sourceMappingURL=Namespace.js.map