# Terraform UI Setup

GitHub Actions経由でTerraformの操作をWebUIから行うシステム。

## 🚀 セットアップ手順

### 1. GitHub Personal Access Token 作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 新しいトークン作成（scope: `repo`, `workflow`）
3. 生成されたトークンをコピー

### 2. 環境変数設定

#### ローカル開発（`.env`）
```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your_username
GITHUB_REPO=sns-app
```

#### Vercelデプロイ用
Vercel管理画面の Environment Variables に以下を設定：
```
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your_username  
GITHUB_REPO=sns-app
```

### 3. 動作確認

1. `http://localhost:3000/terraform` にアクセス
2. ボタンクリックでワークフローが発火することを確認

## 🔄 ワークフロー連鎖

```
[Apply ボタン] 
    ↓
Terraform Apply 
    ↓（成功時）
Test ワークフロー
    ↓（成功時） 
Deploy ワークフロー
```

```
[Destroy ボタン]
    ↓
Terraform Destroy
```

## 🔐 セキュリティ

- UIからの操作時は確認入力が不要（UI専用フラグで判定）
- 手動のworkflow_dispatch時は確認入力が必要
- GitHub APIトークンは漏洩注意

## 📝 トリガー条件

### Terraform Apply
- `terraform-infra/**` のファイル変更でpush → 自動実行
- UIボタンクリック → 手動実行

### Terraform Destroy  
- UIボタンクリックのみ（危険操作のため）

## 🌐 Vercelデプロイ後のURL

`https://your-vercel-app.vercel.app/terraform`