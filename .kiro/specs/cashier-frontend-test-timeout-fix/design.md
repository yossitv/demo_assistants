# Design Document

## Overview

本設計は、cashier-frontendのプロパティベーステストにおけるタイムアウトエラーを修正するためのアプローチを定義します。2つのテストケースが5秒のデフォルトタイムアウトを超過しているため、適切なタイムアウト値を設定し、イテレーション回数を最適化します。

## Architecture

### 現在の問題

```
Test: Property 3 & 4
├── Default Jest timeout: 5000ms
├── Default fast-check iterations: 100
├── Each iteration:
│   ├── React component rendering
│   ├── Provider setup
│   ├── Navigation simulation
│   └── State verification
└── Total time: > 5000ms → TIMEOUT ERROR
```

### 修正後のアーキテクチャ

```
Test: Property 3 & 4
├── Jest timeout: 35000ms (35秒)
├── fast-check timeout: 30000ms (30秒)
├── fast-check iterations: 50 (削減)
├── Each iteration:
│   ├── React component rendering
│   ├── Provider setup
│   ├── Navigation simulation
│   └── State verification
└── Total time: < 30000ms → SUCCESS
```

## Components and Interfaces

### 影響を受けるファイル

**ファイル**: `apps/cashier-frontend/__tests__/avatarVisibility.property.test.tsx`

### 修正箇所1: Property 3 Test (Line ~66)

**現在の実装**:
```typescript
it("Property: Floating avatar stays visible on order and pay screens while connected", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.webUrl({ validSchemes: ["http", "https"] }),
      fc.string({ minLength: 5, maxLength: 20 }),
      async (conversationUrl, conversationId) => {
        // ... test logic
      }
    )
    // タイムアウト設定なし
  );
  // Jestタイムアウトなし
});
```

**修正後の実装**:
```typescript
it("Property: Floating avatar stays visible on order and pay screens while connected", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.webUrl({ validSchemes: ["http", "https"] }),
      fc.string({ minLength: 5, maxLength: 20 }),
      async (conversationUrl, conversationId) => {
        // ... test logic (変更なし)
      }
    ),
    { 
      numRuns: 50,      // 追加: イテレーション数を削減
      timeout: 30000    // 追加: fast-checkタイムアウト
    }
  );
}, 35000);  // 追加: Jestタイムアウト
```

### 修正箇所2: Property 4 Test (Line ~135)

**現在の実装**:
```typescript
it("Property: avatar connection and display state persists when navigating from order to pay", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.webUrl({ validSchemes: ["http", "https"] }),
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.boolean(),
      async (conversationUrl, conversationId, isCollapsed) => {
        // ... test logic
      }
    )
    // タイムアウト設定なし
  );
  // Jestタイムアウトなし
});
```

**修正後の実装**:
```typescript
it("Property: avatar connection and display state persists when navigating from order to pay", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.webUrl({ validSchemes: ["http", "https"] }),
      fc.string({ minLength: 5, maxLength: 20 }),
      fc.boolean(),
      async (conversationUrl, conversationId, isCollapsed) => {
        // ... test logic (変更なし)
      }
    ),
    { 
      numRuns: 50,      // 追加: イテレーション数を削減
      timeout: 30000    // 追加: fast-checkタイムアウト
    }
  );
}, 35000);  // 追加: Jestタイムアウト
```

## Data Models

### タイムアウト設定

```typescript
interface FastCheckConfig {
  numRuns: number;    // イテレーション回数
  timeout: number;    // fast-checkタイムアウト（ミリ秒）
}

interface JestTestConfig {
  timeout: number;    // Jestタイムアウト（ミリ秒）
}
```

### 推奨値

| 設定項目 | 値 | 理由 |
|---------|-----|------|
| `numRuns` | 50 | ナビゲーションテストは重いため、100→50に削減 |
| `fast-check timeout` | 30000ms (30秒) | 50イテレーション × 複雑なレンダリングに十分な時間 |
| `Jest timeout` | 35000ms (35秒) | fast-checkタイムアウト + 5秒のバッファ |

## Error Handling

### タイムアウトエラーの防止

**修正前**:
```
Error: Exceeded timeout of 5000 ms for a test.
```

**修正後**:
- fast-checkが30秒以内に完了
- Jestが35秒以内に完了
- タイムアウトエラーが発生しない

### エラーハンドリング戦略

1. **fast-checkタイムアウト**: テスト実行中にタイムアウトした場合、fast-checkが適切なエラーメッセージを出力
2. **Jestタイムアウト**: fast-checkが完了しない場合、Jestが最終的にタイムアウト
3. **バッファ時間**: Jest timeout > fast-check timeoutにより、fast-checkのエラーメッセージが優先される

## Testing Strategy

### 検証方法

1. **修正前のテスト実行**:
   ```bash
   cd apps/cashier-frontend
   npm test
   ```
   期待結果: 2 failed, 3 passed

2. **修正後のテスト実行**:
   ```bash
   cd apps/cashier-frontend
   npm test
   ```
   期待結果: 0 failed, 5 passed

3. **個別テスト実行**:
   ```bash
   npm test -- avatarVisibility.property.test.tsx
   ```
   期待結果: 2 passed

### テストカバレッジ

- **Property 3**: アバター表示の永続性（order/payページ）
- **Property 4**: ナビゲーション時の接続状態永続性
- 両テストとも50イテレーションで十分なカバレッジを維持

## Implementation Notes

### 変更の最小化

- テストロジックは一切変更しない
- タイムアウト設定のみを追加
- 既存の3つのパステストには影響なし

### パフォーマンス最適化

**イテレーション数の削減**:
- 100 → 50イテレーション
- テスト時間: ~10秒 → ~5秒（推定）
- カバレッジ: 十分に維持される

**タイムアウトの妥当性**:
- 30秒: 50イテレーション × 平均600ms/イテレーション = 30秒
- 35秒: 30秒 + 5秒バッファ

### 将来の拡張性

**共通設定の抽出（オプション）**:
```typescript
// __tests__/testConfig.ts (将来的に作成可能)
export const PROPERTY_TEST_CONFIG = {
  numRuns: 50,
  timeout: 30000
};

export const PROPERTY_TEST_TIMEOUT = 35000;

// 使用例
it("test", async () => {
  await fc.assert(
    fc.asyncProperty(...),
    PROPERTY_TEST_CONFIG
  );
}, PROPERTY_TEST_TIMEOUT);
```

### コンソールログの抑制（オプション）

現在、多数の`[Tavus] connected`ログが出力されています。将来的に抑制する場合：

```typescript
// jest.setup.ts
global.console = {
  ...console,
  info: jest.fn(), // テスト中はinfoログを抑制
};
```

## Performance Considerations

### テスト実行時間

**修正前**:
- Property 3: タイムアウト（5秒超過）
- Property 4: タイムアウト（5秒超過）
- 合計: 失敗

**修正後（推定）**:
- Property 3: ~5-8秒
- Property 4: ~5-8秒
- 合計: ~10-16秒（成功）

### CI/CDへの影響

- テスト時間が若干増加（タイムアウトによる失敗 → 正常完了）
- 全体のテストスイート時間: ~11秒 → ~15秒（推定）
- 許容範囲内

## Security Considerations

本修正はテスト設定のみの変更であり、セキュリティへの影響はありません。

## Backward Compatibility

- 既存のテストロジックは一切変更しない
- 他のテストファイルへの影響なし
- 完全な後方互換性を維持
