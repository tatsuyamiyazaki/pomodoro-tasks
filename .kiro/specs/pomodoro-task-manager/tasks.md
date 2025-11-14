# Implementation Plan

## Overview
本実装計画は、ポモドーロタスク管理アプリケーションの開発タスクを定義します。各タスクはTDD方式で実装され、要件と設計に基づいて段階的に構築されます。

## Task List

### Phase 1: プロジェクトセットアップと基盤構築

- [x] 1. プロジェクト初期化とビルド環境構築
- [x] 1.1 (P) Viteプロジェクトの作成とTypeScript設定
  - Vite 5でReact + TypeScriptプロジェクトを初期化
  - tsconfig.jsonで厳密な型チェック設定を有効化(noImplicitAny, strictNullChecksなど)
  - ビルドとdev serverが正常に起動することを確認
  - _Requirements: 10_

- [x] 1.2 (P) 依存関係のインストールと設定
  - Material-UI (MUI) v6, Zustand v4, @dnd-kit/core v6, @dnd-kit/sortableをインストール
  - ESLintとPrettierを設定し、コード品質ルールを適用
  - package.jsonにdev, build, previewスクリプトを追加
  - _Requirements: 10_

- [x] 1.3 (P) Feature-basedディレクトリ構造の作成
  - src/features/(tasks, projects, tags, pomodoro, dashboard)ディレクトリを作成
  - src/shared/(components, types, utils)ディレクトリを作成
  - src/services/storage.tsファイルを作成
  - _Requirements: 10_

### Phase 2: データ永続化とストレージ基盤

- [x] 2. StorageServiceの実装
- [x] 2.1 (P) localStorage永続化サービスの構築
  - save, load, remove, clear メソッドを実装
  - Result型でエラーハンドリングを実装(quota_exceeded, parse_error, not_found, unknown)
  - getUsedSpaceとgetAvailableSpaceメソッドを実装
  - _Requirements: 9_

- [x] 2.2 (P) エクスポート/インポート機能の実装
  - exportData()でJSON形式のデータをダウンロード可能にする
  - importData()でファイルアップロードとバージョン互換性チェックを実装
  - データバリデーション(必須フィールド、型検証)を追加
  - _Requirements: 9_

- [x] 2.3 (P) StorageServiceのユニットテスト
  - save/loadの正常系とエラー系をテスト
  - 容量超過エラーのシミュレーション
  - exportData/importDataのデータ整合性テスト
  - _Requirements: 9_

### Phase 3: タスク管理の状態管理とビジネスロジック

- [x] 3. TaskStoreの実装
- [x] 3.1 タスクCRUD操作の実装
  - createTask, updateTask, deleteTask, toggleTaskCompletionを実装
  - IDの自動生成(uuidまたはnanoid)とタイムスタンプ管理
  - StorageServiceと連携してlocalStorageに自動保存(デバウンス300ms)
  - _Requirements: 1, 9_

- [x] 3.2 サブタスク管理機能の実装
  - addSubTask, updateSubTask, deleteSubTask, toggleSubTaskCompletionを実装
  - サブタスク完了率の計算ロジックを実装
  - すべてのサブタスク完了時の親タスク自動完了提案ロジック
  - _Requirements: 2_

- [x] 3.3 ビューフィルタリングロジックの実装
  - getFilteredTasks()で9種類のビュー(today, overdue, tomorrow, thisWeek, next7Days, highPriority, upcoming, completed, all)をサポート
  - 期限フィルタリング(今日、期限切れ、今週、次の7日間)の実装
  - 優先度フィルタリングと完了状態フィルタリングの実装
  - _Requirements: 5, 8_

- [x] 3.4 検索機能の実装
  - setSearchQuery()でクエリを設定
  - getFilteredTasks()内でname, description, tags, projectNameを対象に部分一致検索(大文字小文字区別なし)を実装
  - 検索結果のメモ化(useMemo)でパフォーマンス最適化
  - _Requirements: 10_

- [x] 3.5 タスクの並び替え機能の実装
  - reorderTasks(taskIds)でタスクのorder属性を更新
  - ドラッグ&ドロップ後の順序保持ロジック
  - _Requirements: 10_

- [x] 3.6 (P) TaskStoreのユニットテスト
  - CRUD操作の正常系とエラー系をテスト
  - ビューフィルタリングロジックの各ビュータイプをテスト
  - 検索機能の部分一致とケース非依存をテスト
  - サブタスク完了率計算のエッジケース(0個、すべて完了など)をテスト
  - _Requirements: 1, 2, 5, 8, 10_

### Phase 4: プロジェクトとタグの状態管理

- [x] 4. ProjectStoreとTagStoreの実装
- [x] 4.1 (P) ProjectStoreの構築
  - createProject, updateProject, deleteProject, getProjectByIdを実装
  - プロジェクト削除時の確認ダイアログとprojectIdのnull設定ロジック
  - getProjectStats()でタスク統計(totalTasks, completedTasks)を計算
  - StorageServiceと連携してlocalStorageに保存
  - _Requirements: 3, 9_

- [x] 4.2 (P) TagStoreの構築
  - createTag, updateTag, deleteTag, getOrCreateTagを実装
  - タグ名の重複検証ロジック
  - getTagTaskCount()でタグごとのタスク数を計算
  - StorageServiceと連携してlocalStorageに保存
  - _Requirements: 4, 9_

- [x] 4.3 (P) ProjectStoreとTagStoreのユニットテスト
  - プロジェクト/タグCRUD操作の正常系とエラー系をテスト
  - プロジェクト削除時の関連タスク処理をテスト
  - タグ名重複検証とgetOrCreateTagの動作をテスト
  - 統計計算の正確性をテスト
  - _Requirements: 3, 4_

### Phase 5: ポモドーロタイマーの状態管理

- [x] 5. PomodoroContextの実装
- [x] 5.1 タイマー状態管理の構築
  - PomodoroContextとuseReducerでタイマー状態を管理
  - startPomodoro, pausePomodoro, resumePomodoro, resetPomodoro, skipPhaseを実装
  - useRefでタイマーinterval IDを保持し、useEffectでカウントダウン処理
  - _Requirements: 7_

- [x] 5.2 セッションフロー管理の実装
  - Focus → Short break → Long breakのフェーズ遷移ロジック
  - longBreakInterval(デフォルト4)ごとにLong breakへ遷移
  - セッション完了時のNotification API呼び出し(サポートされている場合)
  - _Requirements: 7_

- [x] 5.3 ポモドーロ数記録とTaskStoreとの統合
  - セッション完了時にTaskStore.updateTask()でcompletedPomodorosを更新
  - タスクIDの存在確認とエラーハンドリング
  - タイマー実行中のcurrentTaskIdを管理
  - _Requirements: 7_

- [x] 5.4 設定のカスタマイズと永続化
  - updateSettings()でfocusDuration, shortBreakDuration, longBreakDuration, longBreakIntervalを変更可能に
  - 設定のみlocalStorageに保存し、アプリ再起動時に復元
  - 設定値の正の整数検証
  - _Requirements: 7, 9_

- [x] 5.5 (P) PomodoroContextのユニットテスト
  - タイマーのカウントダウンとフェーズ遷移をテスト
  - startPomodoro, pause, resume, reset, skipPhaseの動作をテスト
  - セッション完了時のTaskStore連携をモックでテスト
  - 設定のカスタマイズと永続化をテスト
  - _Requirements: 7, 9_

### Phase 6: UIレイアウトとテーマ管理

- [x] 6. アプリケーションレイアウトとテーマの実装
- [x] 6.1 Material-UIテーマの設定
  - ライトモードとダークモードのテーマ定義
  - ThemeProviderとuseStateでテーマ切り替え機能を実装
  - localStorageでテーマ設定を永続化
  - _Requirements: 10_

- [x] 6.2 Layoutコンポーネントの構築
  - サイドバー、メインコンテンツエリア、トップバーの3ペインレイアウトを実装
  - Material-UI DrawerとAppBarコンポーネントを使用
  - レスポンシブデザインでモバイルデバイス対応(Drawer collapsible)
  - _Requirements: 10_

- [x] 6.3 (P) TopBarコンポーネントの実装
  - アプリタイトル、クイックタスク追加ボタン、検索バー、テーマ切り替えボタンを配置
  - クイックタスク追加でTaskStore.createTask()をデフォルト値で呼び出し
  - 検索バーでTaskStore.setSearchQuery()を呼び出し
  - _Requirements: 1, 10_

- [x] 6.4 (P) Sidebarコンポーネントの実装
  - ビュー選択リスト(9種類のViewType)を表示
  - タグ一覧とプロジェクト一覧を表示
  - 各ビュー/タグ/プロジェクトのタスク数をバッジで表示
  - TaskStore.setSelectedView()を呼び出してビューを切り替え
  - _Requirements: 4, 5, 10_

### Phase 7: タスク管理UIの実装

- [x] 7. TaskFormとTaskListコンポーネントの構築
- [x] 7.1 TaskFormの実装
  - タスク作成・編集フォームをMaterial-UI Dialogで実装
  - 名前、詳細、期限(DatePicker)、優先度、プロジェクト、タグ、予定ポモドーロ数、予定時間(estimatedDurationMinutes)の入力フィールド
  - バリデーション: 名前必須、期限の妥当性検証、estimatedDurationMinutesのデフォルト値25分
  - TaskStore.createTask()またはupdateTask()を呼び出し
  - _Requirements: 1, 8_

- [x] 7.2 TaskListの実装
  - TaskStore.getFilteredTasks()でフィルタリング済みタスクを表示
  - タスクカードで名前、期限、優先度、進捗(サブタスク完了率)、ポモドーロ数を表示
  - 期限が24時間以内のタスクを警告色で強調表示
  - 期限切れタスクを視覚的にマーク
  - タスククリックでTaskFormを開いて編集可能に
  - _Requirements: 1, 5, 8_

- [x] 7.3 ドラッグ&ドロップ並び替えの実装
  - @dnd-kit/sortableを使用してタスクリストをドラッグ可能に
  - ドロップ後にTaskStore.reorderTasks()を呼び出し
  - タッチデバイスでも動作するようにタッチセンサーを設定
  - _Requirements: 10_

- [x] 7.4 サブタスク管理UIの実装
  - TaskForm内でサブタスク一覧を表示
  - サブタスク追加フィールドとTaskStore.addSubTask()の呼び出し
  - サブタスクの完了チェックボックスとToggleSubTaskCompletion()の呼び出し
  - サブタスク削除ボタンとdeleteSubTask()の呼び出し
  - 親タスクの進捗バーでサブタスク完了率を視覚化
  - _Requirements: 2_

- [x] 7.5 タスク完了アニメーションの実装
  - タスク完了時にフェードアウトまたはチェックマークアニメーションを表示
  - Material-UI Transitionコンポーネントを活用
  - _Requirements: 10_

### Phase 8: プロジェクトとタグ管理UIの実装

- [ ] 8. ProjectFormとTagFilterコンポーネントの構築
- [ ] 8.1 (P) ProjectFormの実装
  - プロジェクト作成・編集フォームをMaterial-UI Dialogで実装
  - 名前、説明、色設定(ColorPicker)の入力フィールド
  - バリデーション: 名前必須、color形式検証(Hex)
  - ProjectStore.createProject()またはupdateProject()を呼び出し
  - プロジェクト削除ボタンと確認ダイアログ(関連タスク数の表示)
  - _Requirements: 3_

- [ ] 8.2 (P) TagFilterの実装
  - Sidebar内でタグ一覧を表示
  - 各タグのタスク数バッジを表示
  - タグクリックでTaskStore.setSelectedView('all')とtagフィルタを適用
  - 新しいタグ追加UIとTagStore.getOrCreateTag()の呼び出し
  - _Requirements: 4_

### Phase 9: ポモドーロタイマーUIの実装

- [ ] 9. PomodoroTimerコンポーネントの構築
- [ ] 9.1 タイマー表示と制御UIの実装
  - 円形プログレスバー(Material-UI CircularProgress)で残り時間を視覚化
  - 開始/一時停止/再開/リセット/スキップボタンを配置
  - 現在のフェーズ(Focus, Short Break, Long Break)を表示
  - PomodoroContext.startPomodoro()などのアクションを呼び出し
  - _Requirements: 7_

- [ ] 9.2 タスクとの統合UIの実装
  - TaskList内でタスクごとにポモドーロ開始ボタンを配置
  - タイマー実行中は現在のタスクを強調表示
  - タスクのestimatedPomodorosとcompletedPomodorosを比較して進捗を表示
  - タイマー中断時の確認ダイアログ
  - _Requirements: 7_

- [ ] 9.3 ポモドーロ設定UIの実装
  - 設定画面(Material-UI Dialog)でfocusDuration, shortBreakDuration, longBreakDuration, longBreakIntervalを編集可能に
  - PomodoroContext.updateSettings()を呼び出し
  - 設定値の正の整数検証
  - _Requirements: 7_

### Phase 10: 概要ダッシュボードの実装

- [ ] 10. DashboardStatsコンポーネントの構築
- [ ] 10.1 統計情報の集計と表示
  - TaskStoreから未完了タスク数、完了済みタスク数を計算
  - タスクのestimatedDurationMinutesを合計して予定時間の合計を表示
  - 本日の完了率を円グラフまたはプログレスバーで視覚的に表示
  - ProjectStoreから各プロジェクトの統計を取得
  - _Requirements: 6_

- [ ] 10.2 週間統計グラフの実装
  - Chart.jsまたはRechartsを使用して週間の完了統計をグラフで表示
  - 過去7日間の完了タスク数を棒グラフで可視化
  - リアルタイム更新(TaskStore変更時に自動再計算)
  - _Requirements: 6_

### Phase 11: 統合テストとE2Eテスト

- [ ] 11. システム全体の統合とテスト
- [ ] 11.1 (P) 統合テストの実装
  - TaskStore + StorageService: タスク作成後のlocalStorage保存を確認
  - PomodoroContext + TaskStore: セッション完了後のポモドーロ数記録を確認
  - TaskList + dnd-kit: ドラッグ&ドロップ後の順序更新を確認
  - Sidebar + TaskStore: ビュー選択後のフィルタリング結果を確認
  - _Requirements: 1, 5, 7, 9, 10_

- [ ] 11.2 (P) E2Eテストの実装
  - タスク作成 → ポモドーロ開始 → セッション完了 → ポモドーロ数更新のフルフローをテスト
  - サイドバーからビュー切り替え → タスク一覧更新をテスト
  - ダークモード/ライトモード切り替え → テーマ適用をテスト
  - エクスポート → インポート → データ復元をテスト
  - _Requirements: 7, 9, 10_

### Phase 12: パフォーマンス最適化とエラーハンドリング

- [ ] 12. 最終調整と品質改善
- [ ] 12.1 パフォーマンス最適化の実装
  - React.memoでTaskListとTaskFormコンポーネントの不要な再レンダリングを防止
  - useMemoでgetFilteredTasks()の結果をメモ化
  - react-windowで仮想スクロールを実装(1000タスク以上の場合)
  - Code splittingでDashboard, Settings画面をReact.lazyで遅延ロード
  - _Requirements: 10_

- [ ] 12.2 エラーハンドリングとモニタリングの実装
  - React Error Boundaryで予期しないエラーをキャッチしてエラー画面を表示
  - localStorage容量超過時のユーザー警告ダイアログとエクスポート提案
  - localStorage読み込み失敗時のリトライボタン
  - Notification API未対応時のサイレントフォールバック
  - _Requirements: 9_

- [ ] 12.3 キーボードショートカットの実装
  - タスク追加(Ctrl+N)、検索フォーカス(Ctrl+K)、ポモドーロ開始/停止(Ctrl+P)などのショートカット
  - useEffectでkeydownイベントリスナーを登録
  - Material-UI Tooltipでショートカットヒントを表示
  - _Requirements: 10_

## Requirements Coverage

| Requirement | Tasks |
|-------------|-------|
| 1 - タスクの基本管理 | 3.1, 6.3, 7.1, 7.2, 11.1 |
| 2 - サブタスク管理 | 3.2, 7.4 |
| 3 - プロジェクト管理 | 4.1, 8.1 |
| 4 - タグ機能 | 4.2, 6.4, 8.2 |
| 5 - タスクビュー機能 | 3.3, 6.4, 7.2, 11.1 |
| 6 - 概要ダッシュボード | 10.1, 10.2 |
| 7 - ポモドーロタイマー統合 | 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 11.1, 11.2 |
| 8 - タスク期限管理 | 3.3, 7.1, 7.2 |
| 9 - データの永続化 | 2.1, 2.2, 3.1, 4.1, 4.2, 5.4, 11.2, 12.2 |
| 10 - ユーザーインターフェース | 1.1, 1.2, 1.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 7.3, 7.5, 11.1, 11.2, 12.1, 12.3 |

すべての要件が実装タスクにマッピングされています。
