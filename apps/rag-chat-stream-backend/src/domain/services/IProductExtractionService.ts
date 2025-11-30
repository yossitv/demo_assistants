import { Product } from '../entities/Product';

export interface ProductExtractionResult {
  products: Product[];
  errors: string[];
}

export interface IProductExtractionService {
  extractFromText(text: string): Promise<ProductExtractionResult>;
}
