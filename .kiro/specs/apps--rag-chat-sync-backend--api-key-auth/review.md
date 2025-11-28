# Implementation Plan

あなたは Senior Backend Architect 兼 QA Reviewer です。

以下に 4つのドキュメントがあります：
1. Requirements Document（requirements.md）
2. Design Document（design.md）
3. Implementation Task List（task.md）
4. Review Requirements Document（review.md）

これら全体をレビューし、次の観点で評価してください：

------------------------------------------------------------
1. 整合性チェック
------------------------------------------------------------
- Requirements → Design → Tasks の流れが一貫しているか？
- すべてのタスクが対応する要件を実現しているか？
- 要件がすべてタスクに落とし込まれているか？
- 過剰なタスクや重複タスクはないか？

------------------------------------------------------------
2. 抜け漏れチェック
------------------------------------------------------------
- 要件なのに実装タスクに反映されていない点は？
- Design に書いてあるのに Tasks にないものは？
- 想定されるが記述されていないテスト項目は？

------------------------------------------------------------
3. リスク分析
------------------------------------------------------------
- この変更が既存システムへ与える影響のリスク
- バグ・後方互換性・運用リスク
- セキュリティ上の懸念（API Key / JWT併存 など）
- Tavus 接続時の不具合リスク

------------------------------------------------------------
4. 改善提案
------------------------------------------------------------
- タスク粒度の改善提案
- 実装方針の改善案
- 適切な抽象化や責務分離の提案
- テスト観点の追加提案

------------------------------------------------------------
5. 総合まとめ（必須）
------------------------------------------------------------
- 主要な問題点（あれば）
- 実装計画が要件を完全に満たしているかの総評
- Go / No-Go の判断

------------------------------------------------------------

- [ ] 1. Add API Key support to API Gateway configuration
  - Modify `infrastructure/lib/rag-chat-backend-stack.ts` to add API Key and Usage Plan
  - Create API Key resource with name 'tavus-llm-key'
  - Create minimal Usage Plan without rate limiting
  - Associate API Key with Usage Plan
  - Link Usage Plan to API deployment stage
  - Add `apiKeyRequired: true` to `/v1/chat/completions` endpoint
  - Add CloudFormation output for API Key value
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 2. Implement API Key authentication in ChatController
  - [ ] 2.1 Add authentication context extraction method
    - Create `extractAuthenticationContext()` private method in ChatController
    - Implement JWT claim extraction (existing logic)
    - Implement API Key header detection (`x-api-key` or `X-API-Key`)
    - Return authentication context with tenantId, userId, and authMethod
    - Return null if both JWT and API Key are missing
    - _Requirements: 1.1, 2.1, 2.2, 5.2_

  - [ ]* 2.2 Write property test for authentication context extraction
    - **Property 1: JWT authentication continues to work**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 2.3 Write property test for API Key fallback
    - **Property 2: API Key authentication succeeds when JWT is absent**
    - **Validates: Requirements 1.1, 1.4**

  - [ ] 2.4 Update handle() method to use new authentication
    - Replace direct JWT claim extraction with `extractAuthenticationContext()` call
    - Handle null authentication context with 401 Unauthorized response
    - Extract tenantId, userId, and authMethod from context
    - Add logging for authentication method used
    - Maintain all existing request processing logic
    - _Requirements: 1.3, 2.3, 5.1_

  - [ ]* 2.5 Write property test for fixed ID assignment
    - **Property 4: Fixed ID assignment for API Key requests**
    - **Validates: Requirements 1.4**

  - [ ]* 2.6 Write property test for use case consistency
    - **Property 6: Use case execution consistency**
    - **Validates: Requirements 1.5, 2.5**

  - [ ]* 2.7 Write unit tests for authentication scenarios
    - Test valid JWT authentication
    - Test API Key authentication with `x-api-key` header
    - Test API Key authentication with `X-API-Key` header
    - Test JWT priority when both JWT and API Key present
    - Test 401 response when both authentication methods missing
    - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Deploy and verify API Key functionality
  - [ ] 4.1 Deploy CDK stack to test environment
    - Run `npm run cdk:deploy`
    - Extract API Key from CloudFormation outputs
    - Note API Gateway endpoint URL
    - _Requirements: 4.1, 4.2_

  - [ ]* 4.2 Manual testing with API Key
    - Test POST to `/v1/chat/completions` with valid API Key
    - Test POST with invalid API Key (expect 403)
    - Test POST with no authentication (expect 401)
    - Test POST with valid JWT (expect 200, existing flow)
    - Verify response format includes completion field
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

  - [ ]* 4.3 Integration test for API Gateway validation
    - Write integration test that sends requests to deployed API
    - Test valid API Key → 200 response
    - Test invalid API Key → 403 response
    - Test no auth → 401 response
    - _Requirements: 4.3, 4.5_

- [ ] 5. Final checkpoint - Verify no breaking changes
  - Ensure all tests pass, ask the user if questions arise.
