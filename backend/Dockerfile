# Build Stage: Golang公式イメージを利用してビルド
FROM golang:1.18-alpine AS builder
WORKDIR /app

# Go Modulesのキャッシュを活用するために、まずgo.modとgo.sumをコピー
COPY ../go.mod ./
COPY ../go.sum ./
RUN go mod download

# アプリケーションのソースコードをコピー
COPY . .

# バイナリをビルド（CGO無効、Linux向けにビルド）
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/app .

# Final Stage: ビルドしたバイナリだけをスリムなscratchイメージにコピー
FROM scratch
COPY --from=builder /app/app /app/app
EXPOSE 8080
ENTRYPOINT ["/app/app"]
