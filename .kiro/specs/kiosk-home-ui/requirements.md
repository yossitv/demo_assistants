# Requirements Document

## Introduction

カフェのセルフオーダーキオスク（/casher_1/home）のホーム画面を、初見で「迷わず注文を始められる」ブランドらしさと温かみがあり、大画面タッチデバイスに最適化された世界水準の UI に改善することを目的とする。

Airbnb や Uber、Starbucks アプリなどのトッププロダクトは、**1画面1タスク（Single Primary Action）/ 強い視線誘導 / 最小限の情報量** によって、初回ユーザーでも迷わず操作できる構成になっている。本ホーム画面も、同様の原則と、Material Design / Apple HIG / WCAG・キオスク UX ガイドラインに沿って設計する。

## Glossary

- **Home_Screen**: `/casher_1/home` に表示されるセルフオーダーキオスクの最初の画面
- **Hero_Section**: ユーザーが最初に目にするメインのビジュアルエリア（キャッチコピー・ビジュアル・CTA を含む）
- **CTA_Button**: 「注文を開始」ボタン（Primary Call To Action）。画面上で最も重要な操作
- **Info_Card**: 使い方や注意事項等を表示する補助的な情報カード
- **Kiosk_User**: カフェでセルフオーダー端末を使用する顧客
- **Viewport**: 実際に表示されている画面領域（ブラウザ・OS の UI を除いた部分）
- **3-Step_Indicator**: 注文プロセスを示す3ステップの視覚的インジケーター（Order → Pay → Pick up）
- **Language_Selector**: 言語切替コントロール

## Global Design Principles (参考指針)

※参考指針であり、「SHALL」ではない。ただし設計・レビュー時に優先的に考慮すること。

1. **Single Primary Action**: Home_Screen 上の最重要アクションを「注文を開始」のみに絞り、CTA_Button を視覚的に最も目立たせる
2. **視線誘導の明確化（Z/F パターン）**: ロゴ → Hero コピー → CTA_Button → 3ステップ説明という視線の流れを構成
3. **大画面タッチ向け最適化**: 最低 48×48px のタッチターゲット、十分な間隔、遠くからでも読める文字サイズ
4. **アクセシビリティ / コントラスト**: WCAG 2.1 AA 基準（通常テキスト 4.5:1 以上、UI コンポーネント 3:1 以上）
5. **最小限の情報・強いヒエラルキー**: 不要な装飾や情報を排除し、「どこをタップすればいいか」を一瞬で理解できる

---

## Requirements

### Requirement 1: Hero_Section & First Impression

**User Story:** As a Kiosk_User, I want to see an attractive and inviting home screen, so that I feel comfortable starting my order.

#### Acceptance Criteria

1.1. WHEN the Home_Screen loads THEN the Hero_Section SHALL display a high-resolution hero image or illustration clearly related to coffee/cafe (e.g., latte art, beans, barista), optimized for the kiosk's native resolution (no visible pixelation or stretching at 1080×1920 or equivalent).

1.2. WHEN the Home_Screen is displayed THEN the Hero_Section (background image + main copy + CTA_Button) SHALL occupy at least 60% and at most 80% of the viewport height.

1.3. WHEN the Home_Screen is displayed THEN the CTA_Button SHALL be fully visible without scrolling on all supported kiosk resolutions, and on screens ≥ 1080px height, the center of the CTA_Button SHALL be located within the central 50% of the viewport height.

1.4. WHEN the Home_Screen is displayed THEN the Home_Screen SHALL use warm, inviting colors consistent with the cafe brand (primary palette: #8B5A2B, #A0522D, plus neutral supporting colors), and text rendered on top of the hero image SHALL achieve at least 4.5:1 contrast ratio against its background.

1.5. WHEN the hero image fails to load THEN the Hero_Section SHALL fall back to a solid color or gradient background from the brand palette, preserving CTA visibility and text legibility.

---

### Requirement 2: Primary CTA_Button

**User Story:** As a Kiosk_User, I want the start button to be immediately obvious, so that I can begin ordering without confusion.

#### Acceptance Criteria

2.1. WHEN the Home_Screen is displayed THEN the CTA_Button's tappable area SHALL be at least 48×48px on all supported resolutions, and on kiosk screens ≥ 768px width, the visual size SHALL be at least 240px width × 72px height.

2.2. WHEN the CTA_Button is displayed THEN the CTA_Button SHALL include a clear text label (e.g., 「注文を開始」/ "Start Order") in the currently selected language, with the label text not exceeding 2 words.

2.3. WHEN the CTA_Button is idle THEN the CTA_Button SHALL include a subtle pulse or glow animation with: animation loop interval ≥ 2s, scale change ≤ 1.05x, no flashing frequency exceeding 3 flashes per second, and respecting the system's "reduced motion" setting.

2.4. WHEN the Kiosk_User touches the CTA_Button THEN the CTA_Button SHALL provide clear visual feedback (elevation/shadow change, slight scale, or color tint) visible within 100ms of interaction and persisting for at least 150ms.

2.5. WHEN the Home_Screen is displayed THEN the CTA_Button SHALL be placed horizontally centered within the Hero_Section on screens ≥ 768px width, or full width minus side margins (16–24px) on smaller screens.

---

### Requirement 3: 3-Step Process Indicator

**User Story:** As a Kiosk_User, I want to understand the ordering process at a glance, so that I know what to expect.

#### Acceptance Criteria

3.1. WHEN the Home_Screen is displayed THEN the Home_Screen SHALL show a 3-step process indicator with the steps: Order（注文）, Pay（お支払い）, Pick up（受け取り）.

3.2. WHEN the step indicator is displayed THEN each step SHALL include a simple, easily recognizable icon and a brief label (max 2 words per language) in the current language.

3.3. WHEN the Home_Screen is displayed THEN the 3-step indicator SHALL be visually subordinate to the CTA_Button by: being placed below the CTA_Button, using smaller font size than the CTA label, and using less saturated colors than the CTA_Button background.

3.4. WHEN the Home_Screen is displayed on screens ≥ 768px width THEN the steps SHALL be arranged horizontally in a single row; on screens < 768px width, steps SHALL be stacked vertically or in a 2+1 grid.

---

### Requirement 4: Simplicity & Information Hierarchy

**User Story:** As a Kiosk_User, I want the interface to be simple and uncluttered, so that I can focus on starting my order.

#### Acceptance Criteria

4.1. WHEN the Home_Screen is displayed THEN the area above the fold SHALL include only: Brand logo, Language selector, Hero_Section (visual, main copy), CTA_Button, 3-step process indicator, and optionally a compact Info_Card entry point.

4.2. WHEN the Home_Screen is displayed THEN detailed Info_Card content SHALL either be condensed into a short (max 2 lines) summary with a "More" link, or be moved to a secondary view (modal or separate Help screen).

4.3. WHEN the Home_Screen is displayed THEN the layout SHALL maintain minimum 16px spacing between unrelated components and use a consistent spacing scale (multiples of 8px).

4.4. WHEN the Home_Screen is displayed THEN typography SHALL clearly distinguish: Primary heading (largest font), Secondary heading (smaller than primary), and Body text (≥ 16px equivalent for kiosk distance readability).

---

### Requirement 5: Language Selector

**User Story:** As a Kiosk_User, I want the language selector to be accessible but not prominent, so that I can switch languages if needed without it cluttering the main view.

#### Acceptance Criteria

5.1. WHEN the Home_Screen is displayed THEN the language selector SHALL be positioned in the header area, aligned to the top-right corner (opposite the logo).

5.2. WHEN the Home_Screen is displayed THEN the language selector SHALL be visually subtle using a compact control (e.g., globe icon + current language code) and avoiding strong fill colors that compete with the CTA_Button.

5.3. WHEN the Kiosk_User interacts with the language selector THEN the selector SHALL provide immediate visual feedback within 100ms.

5.4. WHEN the user changes the language THEN all textual elements on the Home_Screen SHALL update to the selected language without requiring a page reload.

---

### Requirement 6: Responsive & Kiosk-size Variants

**User Story:** As a Kiosk_User, I want the screen to work well on different kiosk sizes, so that the experience is consistent regardless of the terminal.

#### Acceptance Criteria

6.1. WHEN the Home_Screen is viewed on screens 768px or wider THEN the Home_Screen SHALL display the full layout with Hero_Section occupying the left or central area, and Info_Card entry point in a secondary column or side area.

6.2. WHEN the Home_Screen is viewed on screens narrower than 768px THEN the Home_Screen SHALL stack content vertically in order: Header (logo + language selector), Hero_Section, CTA_Button, 3-step process indicator, Info_Card entry point.

6.3. WHEN the layout changes due to screen size or orientation THEN the CTA_Button SHALL maintain its prominence by retaining minimum size requirements, preserving high-contrast styling, and staying fully visible without scrolling in portrait orientation.

---

### Requirement 7: Accessibility & Feedback

**User Story:** As a Kiosk_User with diverse abilities, I want the home screen to be easy to see and understand, so that I can start my order without strain.

#### Acceptance Criteria

7.1. WHEN the Home_Screen is displayed THEN all text and essential UI components SHALL meet WCAG 2.1 AA contrast requirements: text vs background ≥ 4.5:1, UI components/icons vs adjacent color ≥ 3:1.

7.2. WHEN interactive elements indicate state (default/hover/active/disabled) THEN state SHALL NOT be conveyed by color alone (combine color + shadow/outline/shape).

7.3. WHEN the system "reduced motion" preference is enabled THEN non-essential animations (e.g., CTA pulse) SHALL be disabled or significantly reduced.

7.4. WHEN the Home_Screen fails to load critical content (e.g., menu API unavailable) THEN a non-technical, user-friendly message SHALL be displayed explaining that ordering is temporarily unavailable and prompting the user to contact staff.

---

### Requirement 8: UX Validation & KPIs (Optional)

**User Story:** As a product owner, I want to validate the UX effectiveness, so that I can ensure the kiosk meets usability standards.

#### Acceptance Criteria

8.1. GIVEN a usability test with at least 5 participants per key user segment WHEN participants are asked to "Use the kiosk to start an order" without guidance THEN ≥ 95% of participants SHALL successfully tap the CTA_Button within 10 seconds.

8.2. WHEN post-test questionnaires are administered THEN the median rating for "画面はわかりやすかった / The screen was easy to understand" SHALL be 4 or higher on a 5-point scale.

---

## References

- Starbucks モバイルアプリ: 直感的なメニューとシンプルな決済フロー
- Airbnb / Uber ランディング: 一つの主要タスクに集中させるヒーロー + 強い CTA + 最小限のテキスト
- Material Design / Apple HIG: タッチターゲット 44–48pt/px 以上・一貫したレイアウト・十分なスペーシング
- Nielsen Norman / kiosk UX ガイド: 不要なビジュアルの削減・明確なタップ可能要素・シンプルなステップ
