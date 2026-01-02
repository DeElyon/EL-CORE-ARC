import { Injectable } from '@nestjs/common';
import { AiCoreService } from './ai-core.service';
import { BuddyAI } from './buddy/buddy.service';
import { NellyAI } from './nelly/nelly.service';
import { LinaAI } from './lina/lina.service';
import { UnoAI } from './uno/uno.service';
import { LibrarianAI } from './librarian/librarian.service';

/**
 * Main AI Hub Service
 * Orchestrates all AI personalities
 */
@Injectable()
export class AiHubService {
  constructor(
    public readonly core: AiCoreService,
    public readonly buddy: BuddyAI,
    public readonly nelly: NellyAI,
    public readonly lina: LinaAI,
    public readonly uno: UnoAI,
    public readonly librarian: LibrarianAI,
  ) {}
}
