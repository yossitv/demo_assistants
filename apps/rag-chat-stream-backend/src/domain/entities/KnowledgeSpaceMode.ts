export type KnowledgeSpaceMode = 
  | 'product_recommend'  // 製品レコメンド: 構造化された製品データ
  | 'qa'                 // Q&A: 質問と回答のペア
  | 'document'           // ドキュメント: 段落単位の自由形式テキスト
  | 'description';       // 説明: 製品説明などの自由形式テキスト

export interface ModeConfig {
  mode: KnowledgeSpaceMode;
  chunkingStrategy: 'product' | 'qa_pair' | 'paragraph' | 'section';
  extractionMethod: 'structured' | 'qa_extraction' | 'simple_split';
  metadataFields?: string[];
}

export const MODE_CONFIGS: Record<KnowledgeSpaceMode, ModeConfig> = {
  product_recommend: {
    mode: 'product_recommend',
    chunkingStrategy: 'product',
    extractionMethod: 'structured',
    metadataFields: ['productId', 'productName', 'price', 'currency', 'category'],
  },
  qa: {
    mode: 'qa',
    chunkingStrategy: 'qa_pair',
    extractionMethod: 'qa_extraction',
    metadataFields: ['question', 'answer'],
  },
  document: {
    mode: 'document',
    chunkingStrategy: 'section',
    extractionMethod: 'simple_split',
    metadataFields: ['section', 'heading'],
  },
  description: {
    mode: 'description',
    chunkingStrategy: 'paragraph',
    extractionMethod: 'simple_split',
    metadataFields: ['topic'],
  },
};
