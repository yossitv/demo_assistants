# Requirements Document

## Introduction

本仕様は、cashier-frontendのプロパティベーステストにおけるタイムアウトエラーを修正するための要件を定義します。現在、`avatarVisibility.property.test.tsx`の2つのテストケースがJestのデフォルトタイムアウト（5秒）を超過して失敗しています。これらのテストは100回のイテレーションを実行するプロパティベーステストであり、複雑なReactコンポーネントのレンダリングとナビゲーションを含むため、より長いタイムアウトが必要です。

## Glossary

- **Property-Based Test**: fast-checkライブラリを使用した、ランダムな入力値で多数回実行される網羅的テスト
- **Jest Timeout**: Jestテストフレームワークが個々のテストケースに許可する最大実行時間
- **fast-check Timeout**: fast-checkライブラリがプロパティテスト全体に許可する最大実行時間
- **numRuns**: fast-checkがプロパティテストを実行するイテレーション回数
- **Avatar Visibility Test**: アバターコンポーネントの表示状態と接続状態を検証するテスト
- **Navigation Test**: ページ間のナビゲーション時の状態永続性を検証するテスト

## Requirements

### Requirement 1

**User Story:** As a developer, I want Property 3 test to complete successfully, so that avatar visibility across shopping screens can be verified.

#### Acceptance Criteria

1. WHEN the test "Property: Floating avatar stays visible on order and pay screens while connected" is executed, THEN the test SHALL complete within the configured timeout period
2. WHEN the test runs, THEN the test SHALL execute 50 iterations instead of the default 100
3. WHEN the test runs, THEN fast-check SHALL have a timeout of 30000 milliseconds
4. WHEN the test runs, THEN Jest SHALL have a timeout of 35000 milliseconds
5. WHEN the test completes, THEN the test SHALL pass without timeout errors

### Requirement 2

**User Story:** As a developer, I want Property 4 test to complete successfully, so that connection persistence during navigation can be verified.

#### Acceptance Criteria

1. WHEN the test "Property: avatar connection and display state persists when navigating from order to pay" is executed, THEN the test SHALL complete within the configured timeout period
2. WHEN the test runs, THEN the test SHALL execute 50 iterations instead of the default 100
3. WHEN the test runs, THEN fast-check SHALL have a timeout of 30000 milliseconds
4. WHEN the test runs, THEN Jest SHALL have a timeout of 35000 milliseconds
5. WHEN the test completes, THEN the test SHALL pass without timeout errors

### Requirement 3

**User Story:** As a developer, I want all existing tests to continue passing, so that the timeout fixes do not break other functionality.

#### Acceptance Criteria

1. WHEN the test suite is executed after timeout fixes, THEN all 3 previously passing tests SHALL continue to pass
2. WHEN the test suite is executed, THEN the total number of passing tests SHALL be 5
3. WHEN the test suite is executed, THEN the total number of failing tests SHALL be 0
4. WHEN the test suite completes, THEN the exit code SHALL be 0 (success)

### Requirement 4

**User Story:** As a developer, I want timeout configuration to be consistent, so that future property-based tests can use the same pattern.

#### Acceptance Criteria

1. WHEN timeout values are configured, THEN the Jest timeout SHALL be 5000 milliseconds longer than the fast-check timeout
2. WHEN numRuns is configured, THEN the value SHALL be 50 for navigation-heavy tests
3. WHEN timeout configuration is applied, THEN the configuration SHALL follow the pattern: `fc.assert(fc.asyncProperty(...), { numRuns: 50, timeout: 30000 })` followed by Jest timeout as third argument to `it()`
