# AI Agent Demo

## 概要

このアプリケーションは、単なるチャットボットを超えた実用的なAIエージェントです。ユーザーとの会話だけでなく、実際にタスクを実行できる能力を持ち、外部ツールと連携して情報検索や様々な処理を行います。

## 主な機能

- リアルタイムストリーミングレスポンス
- 外部ツール統合（YouTube、Wikipedia、Google Booksなど）
- ツール実行過程の可視化（ターミナル風表示）
- チャット履歴の保存と管理
- モダンで美しいUI

## 技術スタック

- **フロントエンド**: Next.js 15, Tailwind CSS
- **バックエンド**: Convex (リアルタイムデータベース)
- **認証**: Clerk
- **AI**: DeepSeek LLM
- **ツール統合**: WxFlows SDK
- **ワークフロー**: LangGraph

## セットアップ

### 必要環境変数

```
# 認証
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# Convex
NEXT_PUBLIC_CONVEX_URL=

# WxFlows
WXFLOWS_ENDPOINT=
WXFLOWS_API_KEY=

# LLM
DEEPSEEK_API_KEY=
```

### インストール

```bash
npm install
```

### 開発サーバー起動

```bash
# Convexサーバー起動
npx convex dev

# フロントエンド開発サーバー起動（別ターミナルで）
npm run dev
```

## 使い方

1. アカウント登録/ログイン
2. ダッシュボードでチャット開始
3. 質問や指示を入力
4. AIが回答またはツールを使用して情報検索・タスク実行
5. ツール使用時はリアルタイムで実行過程を確認可能

## デプロイ

```bash
# Convexデプロイ
npx convex deploy

# フロントエンドデプロイ（Vercelなど）
npm run build
```

## 拡張方法

- WxFlowsディレクトリに新しいツール定義を追加
- `constants/systemMessage.ts`でAIの指示を拡張
- フロントエンドUIのカスタマイズは`src/components`で行う

## 注意点

- 各サービス（WxFlows、DeepSeek、Clerkなど）のアカウントとAPIキーが必要
- ツール呼び出しには適切な権限設定とレート制限に注意
- ストリーミングレスポンスの処理にはサーバーリソースを考慮

## 貢献

プルリクエスト大歓迎です。新機能の追加や既存機能の改善など、ぜひご協力ください。
