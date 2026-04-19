# String Keeper

ギターごとの弦交換時期と通知タイミングを 1 画面で管理する Next.js アプリケーションです。  
登録した内容は SQLite に保存されるため、ページを再読み込みしても状態を保持できます。

## 機能

- ギター名の登録
- 各ギター 6 本の弦ごとの交換日設定
- 通知タイミング設定
  - 2週間前
  - 1週間前
  - 3日前
  - 1日前
- 交換期限超過 / 当日 / 近日予定の通知表示
- SQLite へのローカル永続化

## 技術構成

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite
  - Node.js 組み込みの `node:sqlite` を使用

## 動作要件

- Node.js 24 以上
  - `node:sqlite` を利用しているため
- npm

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 利用可能なコマンド

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## データ保存

- SQLite ファイルは初回起動時に自動生成されます
- 保存先:

```text
data/string-keeper.sqlite
```

- 以下のデータを保存します
  - ギター一覧
  - 各弦の交換日
  - 通知タイミング設定

### 初期データ

初回起動時にはサンプルのギターと通知設定が自動投入されます。

### データをリセットする方法

SQLite ファイルを削除すると、次回起動時に初期状態で再生成されます。

```bash
rm data/string-keeper.sqlite
```

## 主なファイル構成

```text
app/
  actions.ts        Server Actions
  home-client.tsx   クライアント側 UI
  page.tsx          サーバ側エントリ
lib/
  sqlite.ts         SQLite 初期化・読み書き
  string-keeper.ts  型定義・通知計算・共有ロジック
data/
  string-keeper.sqlite
```

## 実装メモ

- 画面表示時にサーバ側で SQLite から状態を読み込みます
- 登録、交換日更新、通知設定更新は Server Actions 経由で保存します
- ページ `/` は SQLite 読み込みのため動的レンダリングです

## 注意点

- `node:sqlite` は Node.js 上で experimental 扱いです。起動時やビルド時に warning が表示されることがあります
- ローカルファイルへ書き込む構成のため、永続ファイルシステムを持たない実行環境ではそのままの運用に向きません
- 本番環境で運用する場合は、永続ボリューム付きの環境か、別の永続ストレージへの移行を検討してください
