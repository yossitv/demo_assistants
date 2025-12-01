import { CheerioCrawlerService } from './CheerioCrawlerService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CheerioCrawlerService', () => {
  let service: CheerioCrawlerService;

  beforeEach(() => {
    service = new CheerioCrawlerService();
    jest.clearAllMocks();
  });

  describe('crawlUrl', () => {
    it('should extract title and content from HTML', async () => {
      const mockHtml = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <h1>Main Heading</h1>
            <p>This is some content.</p>
            <script>console.log('should be removed');</script>
            <style>.test { color: red; }</style>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await service.crawlUrl('https://example.com/test');

      expect(result.url).toBe('https://example.com/test');
      expect(result.domain).toBe('example.com');
      expect(result.title).toBe('Test Page');
      expect(result.content).toContain('Main Heading');
      expect(result.content).toContain('This is some content');
      expect(result.content).not.toContain('console.log');
      expect(result.content).not.toContain('.test { color: red; }');
      expect(result.crawlDate).toBeInstanceOf(Date);
    });

    it('should handle pages without title', async () => {
      const mockHtml = '<html><body><p>Content without title</p></body></html>';
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await service.crawlUrl('https://example.com');

      expect(result.title).toBe('Untitled');
    });

    it('should normalize whitespace in content', async () => {
      const mockHtml = `
        <html>
          <body>
            <p>Text   with    multiple     spaces</p>
            <p>And
            
            newlines</p>
          </body>
        </html>
      `;
      mockedAxios.get.mockResolvedValue({ data: mockHtml });

      const result = await service.crawlUrl('https://example.com');

      expect(result.content).not.toContain('   ');
      expect(result.content).toMatch(/Text with multiple spaces/);
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.crawlUrl('https://example.com')).rejects.toThrow('Network error');
    });
  });
});
