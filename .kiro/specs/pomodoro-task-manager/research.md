# Research & Design Decisions

---
**Purpose**: ポモドーロタスク管理アプリケーションの技術設計に関する調査結果、アーキテクチャの検討、および設計の根拠を記録する。

**Usage**:
- ディスカバリーフェーズでの調査活動と結果を記録
- design.mdには詳細すぎる設計判断のトレードオフを文書化
- 将来の監査や再利用のための参照とエビデンスを提供
---

## Summary
- **Feature**: `pomodoro-task-manager`
- **Discovery Scope**: New Feature (Greenfield)
- **Key Findings**:
  - React 18 + TypeScript + Viteをベースとした最新のフロントエンドスタックが推奨される
  - データ永続化にはlocalStorageが適切(タスク数が限定的で、シンプルな実装が可能)
  - ドラッグ&ドロップにはdnd-kitが推奨される(react-beautiful-dndは非推奨、dnd-kitは高いカスタマイズ性とパフォーマンス)
  - 状態管理にはZustand + React Context APIの組み合わせが最適(シンプルで学習コストが低く、十分な機能性)

## Research Log

### React TypeScript アーキテクチャベストプラクティス (2025)
- **Context**: 最新のReact TypeScriptアプリケーションのアーキテクチャパターンを調査
- **Sources Consulted**:
  - https://www.creolestudios.com/reactjs-architecture-pattern/
  - https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices
  - https://dev.to/andrewbaisden/building-modern-react-apps-in-2025-a-guide-to-cutting-edge-tools-and-tech-stacks-k8g
- **Findings**:
  - TypeScriptはReactプロジェクトで必須とされ、型安全性と保守性を提供
  - 機能ベース(feature-based)のフォルダ構造が推奨される
  - 関数コンポーネントとフックが標準、クラスコンポーネントは非推奨
  - 状態管理は用途に応じて選択: ローカル状態→useState、共有状態→Context API、複雑なアプリ→Zustand/Redux
  - パフォーマンス最適化: React.memo、useMemo、useCallback、React.lazy
  - Server Componentsが注目されているが、クライアントサイドアプリには不要
- **Implications**:
  - Feature-basedアーキテクチャを採用し、各機能(タスク、プロジェクト、タグ、ポモドーロ)を独立したモジュールとして設計
  - 全てのコンポーネントで厳密な型定義を使用し、`any`を禁止
  - Context APIとZustandを組み合わせてグローバル状態を管理

### ポモドーロタイマーとReact状態管理パターン
- **Context**: ポモドーロタイマーをReactで実装する際の状態管理アプローチを調査
- **Sources Consulted**:
  - https://blog.ag-grid.com/react-data-grid-use-hooks-to-build-a-pomodoro-app/
  - https://carloshernandez.me/blog/en/pomodoro-context-api/
  - https://aleksandarpopovic.com/Infinite-Pomodoro-App-in-React/
- **Findings**:
  - useState + useEffectが最もシンプルで一般的なアプローチ
  - useReducer + useContextは複雑な状態遷移に適している
  - useRefでタイマーインターバルの参照を保持するパターンが標準
  - 状態フロー管理: Focus → Short break → Focus → Long break
  - タイマー状態: 実行中/一時停止、残り時間、現在のフェーズ
- **Implications**:
  - ポモドーロタイマーは専用のContext Providerとして実装
  - タスクとの統合ポイント: タスク選択時にタイマー開始、完了時にポモドーロ数記録
  - Web Notifications APIを使用してセッション完了通知を実装

### localStorage vs IndexedDB データ永続化比較
- **Context**: タスク管理アプリのデータ永続化方法を選択するための比較調査
- **Sources Consulted**:
  - https://browsee.io/blog/unleashing-the-power-a-comparative-analysis-of-indexdb-local-storage-and-session-storage/
  - https://medium.com/@sriweb/indexeddb-vs-localstorage-when-and-why-to-use-indexeddb-for-data-storage-in-web-applications-93a8a5a39eef
  - https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html
- **Findings**:
  - **localStorage**: 5-10MB容量、同期API、文字列のみ、シンプル、書き込み遅延0.017ms
  - **IndexedDB**: 大容量(ディスク空き容量の60%まで)、非同期API、構造化データ対応、複雑なクエリ可能、書き込み遅延はlocalStorageの10倍
  - **ユースケース**: localStorageはシンプルなセッションデータ向け、IndexedDBはオフライン対応や大量データ向け
- **Implications**:
  - タスク管理アプリはlocalStorageで十分(想定タスク数は数百程度、複雑なクエリ不要)
  - シンプルなJSON構造でデータを保存し、起動時に一括読み込み
  - エクスポート/インポート機能でJSONファイルとして保存可能

### React ドラッグ&ドロップライブラリ比較 (2025)
- **Context**: タスク並び替えのためのドラッグ&ドロップライブラリを選定
- **Sources Consulted**:
  - https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react
  - https://npm-compare.com/@dnd-kit/core,react-beautiful-dnd,react-dnd,react-sortable-hoc
  - https://dev.to/epilot/curious-case-of-drag-and-drop-16ng
- **Findings**:
  - **react-beautiful-dnd**: 2022年にAtlassianが非推奨化、コミュニティフォークhello-pangea/dndが存在、シンプルで使いやすいが更新停止
  - **@dnd-kit/core**: 高度にカスタマイズ可能、モジュラー設計、複雑なインタラクション向け、パフォーマンス最適化済み、アクティブメンテナンス
  - **react-dnd**: HTML5 DnD API基盤、柔軟だが学習コスト高い
- **Implications**:
  - dnd-kitを採用(長期的なメンテナンス、柔軟性、TypeScript完全対応)
  - リスト並び替えとドラッグ可能なタスクカードを実装
  - タッチデバイス対応も組み込まれている

### React UIコンポーネントライブラリ比較 (2025)
- **Context**: プロダクションレディなUIコンポーネントライブラリを選定
- **Sources Consulted**:
  - https://www.untitledui.com/blog/react-component-libraries
  - https://codeparrot.ai/blogs/material-ui-vs-shadcn
  - https://medium.com/@dewantanjilhossain/shadcn-ui-vs-material-ui-why-developers-are-switching-their-react-tech-stack-5e20a133cd80
- **Findings**:
  - **Material-UI (MUI)**: Googleのマテリアルデザイン実装、大規模コミュニティ、プロダクションレディ、多機能(DataGrid、DatePickerなど)、バンドルサイズ大きめ
  - **Shadcn UI**: Radix UI + Tailwind CSS基盤、コピー&ペースト方式、高カスタマイズ性、バンドルサイズ最小、学習コストあり
  - **TypeScript対応**: 両方とも完全なTypeScriptサポート、WCAG準拠、ダークモード対応
- **Implications**:
  - Material-UIを採用(迅速な開発、プロダクションレディ、DatePickerが必要、一貫したデザイン)
  - Shadcn UIは将来的なカスタマイズ拡張時の選択肢として保留
  - ダークモード/ライトモードはMUIのテーマシステムで実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Feature-based Monolithic | 各機能(タスク、プロジェクト、タグ、ポモドーロ)を独立したフォルダに配置 | 明確な境界、並行開発可能、スケーラブル | 初期設定が複雑 | React 2025ベストプラクティスに準拠 |
| Component-based (従来型) | コンポーネント、フック、サービスをタイプ別に配置 | シンプル、小規模向け | 機能追加時にファイルが散在 | 非推奨 |
| Layered Architecture | プレゼンテーション層、ビジネスロジック層、データ層を分離 | 関心の分離、テスト容易性 | オーバーエンジニアリングの可能性 | シンプルなアプリには過剰 |

**選択**: Feature-based Monolithic
- React 2025ベストプラクティスに準拠
- 各機能が独立したモジュールとして成長可能
- チーム開発時のコンフリクト最小化

## Design Decisions

### Decision: 状態管理ライブラリの選定

- **Context**: タスク、プロジェクト、タグ、ポモドーロの状態を複数コンポーネント間で共有する必要がある
- **Alternatives Considered**:
  1. **Redux Toolkit** — 強力な状態管理、DevTools、広く採用されている
  2. **Zustand** — シンプル、軽量、学習コスト低い、TypeScript完全対応
  3. **Context API only** — 追加依存なし、シンプル、パフォーマンス課題あり
  4. **Recoil** — Atom-based、柔軟だが学習コスト高い
- **Selected Approach**: **Zustand + Context API**
  - Zustandをグローバル状態(タスク、プロジェクト、タグ)に使用
  - Context APIをポモドーロタイマー(UI固有の状態)に使用
- **Rationale**:
  - Zustandは学習コストが低く、ボイラープレートが少ない
  - TypeScriptとの相性が良く、型安全性を確保
  - Context APIはポモドーロのような独立した機能に適している
  - Reduxは過剰な複雑さをもたらす(小〜中規模アプリ)
- **Trade-offs**:
  - **Benefits**: シンプルさ、パフォーマンス、学習コスト低減
  - **Compromises**: Reduxほどの成熟したエコシステムはない、DevTools機能が限定的
- **Follow-up**:
  - Zustand DevToolsを統合して開発時のデバッグを支援
  - パフォーマンス測定を実装フェーズで実施

### Decision: データ永続化戦略

- **Context**: タスクデータを永続化し、アプリ再起動後も保持する必要がある
- **Alternatives Considered**:
  1. **localStorage** — シンプル、同期API、5-10MB制限
  2. **IndexedDB** — 大容量、非同期API、複雑
  3. **Cloud Sync (Firebase/Supabase)** — リアルタイム同期、バックエンド必要
- **Selected Approach**: **localStorage with JSON serialization**
- **Rationale**:
  - タスク数は通常数百程度(5MB以内で十分)
  - シンプルな実装で要件を満たせる
  - オフライン動作が保証される
- **Trade-offs**:
  - **Benefits**: シンプル、信頼性、依存なし
  - **Compromises**: 同期機能なし、大量データには不向き
- **Follow-up**:
  - 将来的なクラウド同期のための拡張ポイントを設計に組み込む
  - エクスポート/インポート機能でデータ移行を可能にする

### Decision: UIコンポーネントライブラリ

- **Context**: 迅速な開発とプロダクション品質のUIコンポーネントが必要
- **Alternatives Considered**:
  1. **Material-UI** — プロダクションレディ、大規模コミュニティ、多機能
  2. **Shadcn UI** — 高カスタマイズ性、Tailwind CSS、軽量
  3. **Ant Design** — エンタープライズ向け、複雑
  4. **Chakra UI** — アクセシビリティ重視、シンプル
- **Selected Approach**: **Material-UI (MUI v6)**
- **Rationale**:
  - DatePickerコンポーネントが要件に必須
  - ダークモード/ライトモードが標準搭載
  - プロダクションレディで安定性が高い
  - 大規模なコミュニティとドキュメント
- **Trade-offs**:
  - **Benefits**: 迅速な開発、一貫したデザイン、プロダクション品質
  - **Compromises**: バンドルサイズが大きい、カスタマイズに制限あり
- **Follow-up**:
  - Tree-shakingを有効化してバンドルサイズを最適化
  - 必要に応じてカスタムテーマを作成

### Decision: ドラッグ&ドロップライブラリ

- **Context**: タスクの並び替え機能を実装する必要がある
- **Alternatives Considered**:
  1. **@dnd-kit/core** — 最新、高カスタマイズ性、アクティブメンテナンス
  2. **react-beautiful-dnd** — シンプルだが非推奨(2022年)
  3. **hello-pangea/dnd** — react-beautiful-dndのコミュニティフォーク
  4. **react-dnd** — 柔軟だが学習コスト高い
- **Selected Approach**: **@dnd-kit/core + @dnd-kit/sortable**
- **Rationale**:
  - アクティブなメンテナンスとTypeScript完全対応
  - react-beautiful-dndは非推奨で将来的なリスクあり
  - パフォーマンス最適化とタッチデバイス対応が組み込まれている
- **Trade-offs**:
  - **Benefits**: 長期的な安定性、柔軟性、パフォーマンス
  - **Compromises**: 学習コスト、セットアップがやや複雑
- **Follow-up**:
  - タスクリストとカンバンビューでの動作を検証
  - アクセシビリティ対応(キーボード操作)を実装

## Risks & Mitigations

- **Risk 1: localStorageの容量制限**
  - Mitigation: エクスポート機能を提供し、アーカイブ機能でデータを削減。容量監視とユーザー警告を実装。

- **Risk 2: ポモドーロタイマーのブラウザタブ非アクティブ時の精度低下**
  - Mitigation: Web Workers APIを使用してバックグラウンドでタイマーを実行。Document Visibility APIで精度を補正。

- **Risk 3: ドラッグ&ドロップのモバイルデバイス対応**
  - Mitigation: dnd-kitのタッチセンサーを活用。タッチデバイスでの操作性をテストで検証。

- **Risk 4: Material-UIのバンドルサイズ**
  - Mitigation: Tree-shakingを有効化し、必要なコンポーネントのみインポート。Lazy loadingで初期ロードを最適化。

## References
- [React Architecture Patterns 2025](https://www.bacancytechnology.com/blog/react-architecture-patterns-and-best-practices) — アーキテクチャパターンのベストプラクティス
- [dnd-kit Documentation](https://docs.dndkit.com/) — ドラッグ&ドロップライブラリ公式ドキュメント
- [Material-UI Documentation](https://mui.com/) — UIコンポーネントライブラリ公式ドキュメント
- [Zustand Documentation](https://zustand-demo.pmnd.rs/) — 状態管理ライブラリ公式ドキュメント
- [localStorage vs IndexedDB Comparison](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html) — データ永続化の比較
