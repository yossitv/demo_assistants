# Implementation Plan

- [ ] 1. Update CreateKnowledgeSpaceUseCase.property.test.ts mock implementations
  - Add delete method to knowledgeSpaceRepo mock
  - Add deleteCollection method to vectorRepo mock
  - Verify TypeScript compilation succeeds
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.1 Add delete method to knowledgeSpaceRepo mock
  - Locate the knowledgeSpaceRepo mock definition (around line 35-40)
  - Add delete method with signature: `delete: jest.fn(async (tenantId: string, ksId: string) => {})`
  - Implement simple logic to remove from savedKnowledgeSpaces array if needed
  - _Requirements: 1.1, 1.3_

- [ ] 1.2 Add deleteCollection method to vectorRepo mock
  - Locate the vectorRepo mock definition (around line 43-52)
  - Add deleteCollection method with signature: `deleteCollection: jest.fn(async (collectionName: string) => {})`
  - Implement logic to delete from upsertedChunks Map
  - _Requirements: 1.2, 1.4_

- [ ] 1.3 Verify CreateKnowledgeSpaceUseCase.property.test.ts compiles
  - Run: `cd apps/rag-chat-stream-backend && npm run build`
  - Confirm no TypeScript errors for this file
  - _Requirements: 1.5_

- [ ] 2. Update CompleteFlow.integration.test.ts in-memory implementations
  - Add delete method to InMemoryKnowledgeSpaceRepository
  - Add update and delete methods to InMemoryAgentRepository
  - Add deleteCollection method to InMemoryVectorRepository
  - Verify TypeScript compilation succeeds
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.1 Add delete method to InMemoryKnowledgeSpaceRepository
  - Locate InMemoryKnowledgeSpaceRepository class (around line 47)
  - Add delete method: `async delete(tenantId: string, ksId: string): Promise<void>`
  - Implement: delete from knowledgeSpaces Map using key `${tenantId}:${ksId}`
  - _Requirements: 2.1_

- [ ] 2.2 Add update method to InMemoryAgentRepository
  - Locate InMemoryAgentRepository class (around line 69)
  - Add update method: `async update(agent: Agent): Promise<void>`
  - Implement: update in agents Map if key exists
  - _Requirements: 2.2_

- [ ] 2.3 Add delete method to InMemoryAgentRepository
  - In the same InMemoryAgentRepository class
  - Add delete method: `async delete(tenantId: string, agentId: string): Promise<void>`
  - Implement: delete from agents Map using key `${tenantId}:${agentId}`
  - _Requirements: 2.3_

- [ ] 2.4 Add deleteCollection method to InMemoryVectorRepository
  - Locate InMemoryVectorRepository class (around line 103)
  - Add deleteCollection method: `async deleteCollection(collectionName: string): Promise<void>`
  - Implement: delete from collections Map
  - _Requirements: 2.4_

- [ ] 2.5 Verify CompleteFlow.integration.test.ts compiles
  - Run: `cd apps/rag-chat-stream-backend && npm run build`
  - Confirm no TypeScript errors for this file
  - _Requirements: 2.5_

- [ ] 3. Run full test suite and verify all tests pass
  - Execute: `cd apps/rag-chat-stream-backend && npm run test`
  - Verify: 342 tests pass, 0 tests fail
  - Verify: 40 test suites pass, 0 test suites fail
  - Verify: Exit code is 0
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ] 3.1 Run CreateKnowledgeSpaceUseCase.property.test.ts specifically
  - Execute: `npm test -- CreateKnowledgeSpaceUseCase.property.test.ts`
  - Verify all property-based tests pass with 100 iterations
  - _Requirements: 4.2_

- [ ] 3.2 Run CompleteFlow.integration.test.ts specifically
  - Execute: `npm test -- CompleteFlow.integration.test.ts`
  - Verify all integration tests pass
  - _Requirements: 4.3_

- [ ] 4. Final verification checkpoint
  - Confirm TypeScript compilation succeeds: `npm run build`
  - Confirm all tests pass: `npm run test`
  - Confirm no regression in existing tests
  - Ask user if any issues arise
  - _Requirements: All_
