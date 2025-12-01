import { ParseResult } from '../entities/Product';

export interface IProductParserService {
  parseMarkdown(content: string): ParseResult;
}
