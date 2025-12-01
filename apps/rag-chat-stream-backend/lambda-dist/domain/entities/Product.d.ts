export interface Product {
    id: string;
    name: string;
    description: string;
    category?: string;
    price?: number;
    currency?: string;
    availability?: string;
    tags?: string[];
    imageUrl?: string;
    productUrl?: string;
    brand?: string;
    updatedAt?: string;
}
export interface ParseError {
    itemIndex: number;
    field?: string;
    reason: string;
}
export interface ParseResult {
    products: Product[];
    errors: ParseError[];
    summary: {
        totalItems: number;
        successCount: number;
        failureCount: number;
    };
}
export declare const SCHEMA_VERSION = "v1";
//# sourceMappingURL=Product.d.ts.map