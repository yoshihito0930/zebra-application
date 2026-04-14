package entity

import "time"

// Option はオプションエンティティ
// DynamoDBのoptionsテーブルに対応
type Option struct {
	// StudioID はスタジオID（パーティションキー）
	StudioID string

	// OptionID はオプションID（ソートキー）
	OptionID string

	// OptionName はオプション名
	OptionName string

	// Price は料金（税抜）
	Price int

	// TaxRate は税率（例: 0.10）
	TaxRate float64

	// IsActive は有効/無効（削除せず非表示にする）
	IsActive bool

	// DisplayOrder は予約フォームでの表示順（オプショナル）
	DisplayOrder *int

	// CreatedAt は作成日時
	CreatedAt time.Time

	// UpdatedAt は更新日時
	UpdatedAt time.Time
}
