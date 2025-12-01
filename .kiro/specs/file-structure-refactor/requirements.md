# Requirements Document

## Introduction

lofi_demo_assistantsプロジェクトのファイル構成を見直し、保守性と可読性を向上させるためのリファクタリング要件を定義する。現在の構成には以下の課題がある：

- `public/`フォルダ内にハッシュ名の画像ファイルが散在
- `app/casher_1/`と`src/app/`の両方にコードが存在し、構造が不明確
- `public/`内の複数サブフォルダ（3dicons, assets, coffee, halloween, images）に重複の可能性
- 画像ファイルの命名規則が統一されていない

## Glossary

- **Casher_1_App**: カフェ向けキオスク注文システムのNext.jsアプリケーション
- **Public_Assets**: 静的アセット（画像、アイコン等）を格納するディレクトリ
- **App_Router**: Next.js 13+のApp Routerを使用したルーティング構造
- **Hash_Named_File**: ハッシュ値で命名されたファイル（例: 0745c70d3068a0f5765d73c874827d409c9f37b6.png）

## Requirements

### Requirement 1

**User Story:** As a developer, I want a clear and organized directory structure, so that I can easily navigate and maintain the codebase.

#### Acceptance Criteria

1. THE Casher_1_App SHALL have a single source directory for application code
2. WHEN a developer looks for component files THEN the system SHALL have components organized in a dedicated `components/` directory
3. WHEN a developer looks for page routes THEN the system SHALL have pages organized following Next.js App Router conventions
4. THE Casher_1_App SHALL remove unused or duplicate source directories

### Requirement 2

**User Story:** As a developer, I want organized and properly named static assets, so that I can easily find and reference images and icons.

#### Acceptance Criteria

1. THE Public_Assets SHALL be organized into logical subdirectories by category (icons, products, ui)
2. WHEN a new image is added THEN the system SHALL use descriptive file names instead of hash-based names
3. THE Public_Assets SHALL consolidate duplicate images into a single location
4. WHEN displaying product images THEN the system SHALL reference images from a consistent path structure

### Requirement 3

**User Story:** As a developer, I want to identify and remove unused files, so that the project remains lean and maintainable.

#### Acceptance Criteria

1. THE Casher_1_App SHALL identify all unused image files in the public directory
2. THE Casher_1_App SHALL identify all unused code files
3. WHEN unused files are identified THEN the system SHALL provide a list for review before deletion
4. THE Casher_1_App SHALL remove confirmed unused files

### Requirement 4

**User Story:** As a developer, I want consistent naming conventions, so that the codebase is predictable and easy to understand.

#### Acceptance Criteria

1. THE Casher_1_App SHALL use kebab-case for directory names
2. THE Casher_1_App SHALL use PascalCase for React component file names
3. THE Public_Assets SHALL use descriptive kebab-case names for image files
4. WHEN renaming files THEN the system SHALL update all references to those files
