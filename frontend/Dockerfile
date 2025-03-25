# Node.jsの公式イメージを利用（軽量なalpineベース）
FROM node:18-alpine

# 作業ディレクトリを指定
WORKDIR /app

# Next.jsのセットアップ（package.jsonとpackage-lock.jsonをコピー）
COPY package.json ./

# 依存関係をインストール（npmを使用）
RUN npm install

# 残りのソースコードをコピー
COPY . .

# Next.jsのビルド
RUN npm run build

# ポート3000を開放
EXPOSE 3000

# Next.jsアプリを起動
CMD ["npm", "start"]