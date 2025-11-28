# カフェ セルフオーダーキオスク プロジェクト概要

## プロジェクト説明

カフェ店舗向けのセルフオーダーキオスクシステム。
初見のユーザーでも迷わず注文を完了できる、直感的で温かみのある UI を目指す。

## 技術スタック

- **フロントエンド**: React + TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand（または React Context）
- **国際化**: react-i18next
- **テスト**: Vitest + React Testing Library

## デザインシステム

### ブランドカラー
| 用途 | カラーコード | 説明 |
|------|-------------|------|
| Primary | `#8B5A2B` | メインのブランドカラー（コーヒーブラウン） |
| Secondary | `#A0522D` | アクセントカラー |
| Background | `#FFF8F0` | 温かみのある背景色 |
| Text | `#2D1810` | 本文テキスト |

### タッチターゲット
- 最小サイズ: 48×48px
- CTA ボタン: 240px × 72px 以上（768px 以上の画面）

### アクセシビリティ
- WCAG 2.1 AA 準拠
- テキストコントラスト比: 4.5:1 以上
- UI コンポーネントコントラスト比: 3:1 以上

## コーディング規約

- コンポーネントは関数コンポーネント（FC）で記述
- Props には TypeScript の型定義を必須とする
- コメントは日本語可
- ファイル命名: PascalCase（コンポーネント）、kebab-case（ユーティリティ）

## ディレクトリ構成

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── pages/          # ページコンポーネント
├── hooks/          # カスタムフック
├── i18n/           # 国際化リソース
├── styles/         # グローバルスタイル
└── utils/          # ユーティリティ関数
```

## 対応言語

- 日本語（デフォルト）
- English

## 参考資料

- Material Design ガイドライン
- Apple Human Interface Guidelines
- Nielsen Norman キオスク UX ガイド
