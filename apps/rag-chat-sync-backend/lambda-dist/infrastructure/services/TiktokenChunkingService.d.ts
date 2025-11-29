import { IChunkingService, ChunkingConfig } from '../../domain/services/IChunkingService';
export declare class TiktokenChunkingService implements IChunkingService {
    private readonly encoding;
    constructor();
    chunkText(text: string, config: ChunkingConfig): string[];
}
//# sourceMappingURL=TiktokenChunkingService.d.ts.map