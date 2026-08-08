# Life Hub

複数ジャンル（起業・筋トレ・一時項目など）を1つの PWA で横断管理するアプリ。

## 特徴

- **ホーム**: 今日/今週タスクの統合
- **下部ナビ**: 項目ごとに画面切替。設定から追加・削除（一時項目可）
- **起業**: DM / 週次 / 案件 / IGリスト
- **筋トレ**: 体重・カロリー・トレーニング
- **PWA**: スマホでホーム画面追加、PCでも利用
- **同期**: Puter アカウント + 同期ID

## 開発

```bash
npm install
npm run dev
```

HTTPS または localhost で Service Worker / インストールが有効になります。

## ビルド

```bash
npm run build
npm run preview
```

## GitHub Pages

`main` へ push すると Actions が `dist/` を GitHub Pages に公開します。

1. GitHub にリポジトリを作成して push
2. Settings → Pages → Source を **GitHub Actions** にする
3. Actions の Deploy 完了後、表示された URL を開く

`vite.config.ts` の `base: './'` により、プロジェクト Pages（`https://<user>.github.io/<repo>/`）でも動作します。
