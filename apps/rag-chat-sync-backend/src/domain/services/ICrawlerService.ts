// Interface for web crawling service
// Requirements: 1.3 - Crawl URLs and extract main text content

export interface CrawledContent {
  url: string;
  domain: string;
  title: string;
  content: string;
  crawlDate: Date;
}

export interface ICrawlerService {
  /**
   * Crawls a URL and extracts the main text content
   * @param url - The URL to crawl
   * @returns Promise resolving to crawled content with metadata
   */
  crawlUrl(url: string): Promise<CrawledContent>;
}
