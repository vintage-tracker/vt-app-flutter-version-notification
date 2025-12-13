# Flutter Version Notification

GitHub ActionsでFlutterバージョンとパッケージをチェックしてSlackに通知するシンプルなツールです。

## 機能

- Flutter SDKの最新バージョンチェック
- pubspec.yamlから依存パッケージのバージョンチェック
- 更新可能なパッケージの検出
- Slackへの通知

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. 設定ファイルの作成

`repositories.json.sample`をコピーして`repositories.json`を作成します：

```bash
cp repositories.json.sample repositories.json
```

`repositories.json`を編集して、チェック対象のリポジトリを設定します：

```json
{
  "repositories": [
    {
      "name": "example_app",
      "description": "サンプルFlutterアプリ",
      "url": "https://github.com/your-org/example_app"
    }
  ],
  "settings": {
    "defaultNotifyChannel": "C0984UGV52Q",
    "includeDevDeps": true
  }
}
```

### 4. 環境変数の設定

以下の環境変数を設定します：

- `SLACK_BOT_TOKEN`: Slack Bot Token（必須）
- `GITHUB_TOKEN`: GitHub Token（オプション、API制限回避用）

### 5. ローカル実行

```bash
npm run check
```

## GitHub Actions設定

### 1. シークレットの設定

GitHubリポジトリのSettings > Secrets and variables > Actionsで以下を設定：

- `SLACK_BOT_TOKEN`: Slack Bot Token
- `GITHUB_TOKEN`: GitHub Token（オプション）

### 2. ワークフローの実行

`.github/workflows/flutter-version-check.yml`が設定済みです。

- **スケジュール実行**: 毎週月曜日 9:00 JST（UTC 0:00）
- **手動実行**: Actionsタブから`workflow_dispatch`で実行可能

## Slack Bot設定

Slack Appを作成し、以下の権限を設定：

- `chat:write` - メッセージ送信

Botをチャンネルに招待：

```
/invite @your-bot-name
```

## ファイル構成

```
.
├── .github/
│   └── workflows/
│       └── flutter-version-check.yml  # GitHub Actionsワークフロー
├── src/
│   └── check.ts                       # メインスクリプト
├── repositories.json.sample          # 設定ファイルのサンプル
├── package.json
└── README.md
```

## ライセンス

MIT
# flutter-version-notification-bot
# flutter-version-notification-bot
