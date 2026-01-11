# Notion Diagram Generator

Notion上で選択したテキストを図解画像に変換するChrome拡張機能です。

## 機能

- **テキスト選択**: Notionページ上でテキストを選択
- **図解生成**: Gemini APIを使用してテキストを分析し、図解を自動生成
- **4種類の図解スタイル**:
  - フローチャート: 処理の流れをステップごとに表示
  - マインドマップ: 中心トピックから放射状に関連項目を配置
  - インフォグラフィック: 重要なポイントをカード形式で表示
  - タイムライン: 時系列順にイベントを配置
- **Notion連携**: 生成した画像をクリップボード経由でNotionに挿入

## インストール方法

### 1. 拡張機能をダウンロード

このリポジトリをクローンまたはダウンロードします。

### 2. Chromeに読み込み

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `notion-diagram-extension` フォルダを選択

### 3. Gemini APIキーを取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「Create API Key」でAPIキーを生成
3. 拡張機能のポップアップでAPIキーを入力・保存

## 使い方

1. Notionページを開く
2. 図解化したいテキストを選択
3. 拡張機能アイコンをクリック
4. 「選択テキストを取得」ボタンをクリック
5. 図解スタイルを選択
6. 「図解を生成」ボタンをクリック
7. 生成された画像をプレビューで確認
8. 「Notionに挿入」または「ダウンロード」を選択

## ファイル構成

```
notion-diagram-extension/
├── manifest.json        # 拡張機能の設定ファイル
├── popup.html           # ポップアップUI
├── popup.js             # ポップアップのロジック
├── background.js        # バックグラウンド処理（API通信）
├── content.js           # Notionページ上で動作するスクリプト
├── icons/               # アイコン画像
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── styles/
    ├── popup.css        # ポップアップのスタイル
    └── content.css      # コンテンツスクリプトのスタイル
```

## 技術スタック

- **Chrome Extension Manifest V3**
- **Gemini API (gemini-1.5-flash)**: テキスト分析・構造化
- **SVG生成**: JavaScriptでSVG図解を動的生成
- **OffscreenCanvas**: SVGからPNGへの変換

## 注意事項

- Gemini APIの利用にはAPIキーが必要です
- APIの利用制限に注意してください
- 生成される図解はテキストの内容を要約・構造化したものです

## ライセンス

MIT License
