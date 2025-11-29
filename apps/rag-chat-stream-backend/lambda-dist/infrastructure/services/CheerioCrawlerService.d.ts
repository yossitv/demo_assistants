import { ICrawlerService, CrawledContent } from '../../domain/services/ICrawlerService';
import { RetryOptions } from '../../shared/retry';
export declare class CheerioCrawlerService implements ICrawlerService {
    private readonly circuitBreaker;
    private readonly retryOptions;
    private readonly requestTimeoutMs;
    constructor(retryOptions?: RetryOptions);
    crawlUrl(url: string): Promise<CrawledContent>;
    private validateUrl;
}
//# sourceMappingURL=CheerioCrawlerService.d.ts.map