# Flutter Dependency Checker

GitHub ActionsでFlutterバージョンとパッケージをチェックしてSlackに通知するシンプルなツールです。

## 機能

- Flutter SDKの最新バージョンチェック
- pubspec.yamlから依存パッケージのバージョンチェック
- 更新可能なパッケージの検出（メジャー/マイナー/パッチバージョンで色分け）
- Slackへの通知（Excelファイル付き）

## 重要な前提条件

### Flutterバージョンの取得について

このツールは、チェック対象のFlutterプロジェクトで**FVM（Flutter Version Management）を使用していることを前提**としています。

- **`.fvmrc`ファイルからFlutterバージョンを取得します**
- `.fvmrc`ファイルが存在しない場合は、`pubspec.yaml`の`environment`セクションから取得を試みます
- どちらからも取得できない場合は、最新のFlutterバージョンが表示されます

**推奨**: チェック対象のリポジトリに`.fvmrc`ファイルを配置してください。

`.fvmrc`ファイルの例：
```
flutter: "3.24.0"
```

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd flutter-version-notification
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. ビルド

```bash
npm run build
```

### 4. 設定ファイルの作成

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
    "includeDevDeps": true
  }
}
```

**注意**: チェック対象のリポジトリには`.fvmrc`ファイルまたは`pubspec.yaml`にFlutterバージョンが記載されている必要があります。

### 5. Slack Botの作成と設定

#### 5.1. Slack Appの作成

1. [Slack API](https://api.slack.com/apps)にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. App名とワークスペースを選択して作成

#### 5.2. Bot Token Scopesの設定

1. 左メニューから「OAuth & Permissions」を選択
2. 「Bot Token Scopes」セクションで以下のスコープを追加：
   - `chat:write` - メッセージ送信
   - `files:write` - ファイルアップロード（Excelファイル添付に必要）

#### 5.3. Botのインストール

1. 「OAuth & Permissions」ページの上部で「Install to Workspace」をクリック
2. 権限を確認して「許可する」をクリック
3. 表示される「Bot User OAuth Token」（`xoxb-`で始まるトークン）をコピー

#### 5.4. Botをチャンネルに招待

通知を送信するSlackチャンネルで以下を実行：

```
/invite @your-bot-name
```

#### 5.5. チャンネルIDの取得

1. SlackのWeb版でチャンネルを開く
2. ブラウザのURLからチャンネルIDを確認
   - 例: `https://your-workspace.slack.com/archives/C0123456789A` → `C0123456789A`

### 6. GitHub Actionsシークレットの設定

GitHubリポジトリで以下のシークレットを設定します：

1. リポジトリの「Settings」を開く
2. 左メニューから「Secrets and variables」→「Actions」を選択
3. 「New repository secret」をクリックして、以下のシークレットを順番に追加：

#### 必須のシークレット

**`SLACK_BOT_TOKEN`**
- 値: Slack Bot User OAuth Token（`xoxb-`で始まるトークン）
- 説明: Slackに通知を送信するために必要

**`SLACK_CHANNEL`**
- 値: SlackチャンネルID（例: `C0123456789A`）
- 説明: 通知を送信するチャンネルID

#### オプションのシークレット

**`GH_TOKEN`**
- 値: GitHub Personal Access Token（`ghp_`で始まるトークン）
- 説明: プライベートリポジトリにアクセスする場合や、レート制限を回避するために必要
- 取得方法:
  1. GitHubの「Settings」→「Developer settings」→「Personal access tokens」→「Tokens (classic)」
  2. 「Generate new token (classic)」をクリック
  3. スコープで`repo`（プライベートリポジトリの場合）または`public_repo`を選択
  4. トークンを生成してコピー

### 7. ワークフローの確認

`.github/workflows/flutter-version-check.yml`が設定済みです。

- **スケジュール実行**: 毎週月曜日 9:00 JST（UTC 0:00）
- **手動実行**: Actionsタブから「Flutter Version & Package Check」ワークフローを選択し、「Run workflow」をクリック

### 8. ローカルでのテスト実行（オプション）

ローカルでテストする場合は、環境変数を設定して実行：

```bash
export SLACK_BOT_TOKEN=xoxb-your-token
export SLACK_CHANNEL=C0123456789A
export GH_TOKEN=ghp_your-token  # オプション
export REPOSITORIES_CONFIG=repositories.json

npm run check
```

## 動作確認

### 初回実行

1. GitHub Actionsの「Actions」タブを開く
2. 「Flutter Version & Package Check」ワークフローを選択
3. 「Run workflow」をクリックして手動実行
4. 実行が完了したら、指定したSlackチャンネルに通知が届くことを確認

### 通知内容

- 総リポジトリ数、成功/失敗数
- Flutter SDK最新版と各リポジトリのFlutterバージョン
- 更新可能なパッケージ一覧（最大5個、残りは「他X個」として表示）
- Excelファイル（スレッドに添付）:
  - 全パッケージの詳細情報
  - メジャーバージョンアップ: 赤色
  - マイナー/パッチバージョンアップ: 青色

## トラブルシューティング

### Flutterバージョンが正しく表示されない

- チェック対象のリポジトリに`.fvmrc`ファイルが存在するか確認
- `.fvmrc`ファイルの形式が正しいか確認（`flutter: "3.24.0"`または`flutter: 3.24.0`）
- `pubspec.yaml`の`environment`セクションにFlutterバージョンが記載されているか確認

### Excelファイルが送信されない

- Slack Botに`files:write`スコープが設定されているか確認
- Botがチャンネルに参加しているか確認（`/invite @your-bot-name`）
- GitHub Actionsのログでエラーメッセージを確認

### プライベートリポジトリにアクセスできない

- `GH_TOKEN`シークレットが設定されているか確認
- GitHub Tokenに`repo`スコープが付与されているか確認

## ライセンス

MIT
