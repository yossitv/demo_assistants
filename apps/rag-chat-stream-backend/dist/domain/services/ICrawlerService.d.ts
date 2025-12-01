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
//# sourceMappingURL=ICrawlerService.d.ts.map