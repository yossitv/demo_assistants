import { IProductParserService } from '../../domain/services/IProductParserService';
import { ParseResult } from '../../domain/entities/Product';
export declare class ProductParserService implements IProductParserService {
    parseMarkdown(content: string): ParseResult;
    private extractItems;
    private parseItem;
}
//# sourceMappingURL=ProductParserService.d.ts.map