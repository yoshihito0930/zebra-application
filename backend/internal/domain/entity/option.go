package entity

import "time"

// Option はオプションエンティティ
// DynamoDBのoptionsテーブルに対応
type Option struct {
	// StudioID はスタジオID（パーティションキー）
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// OptionID はオプションID（ソートキー）
	OptionID string `json:"option_id" dynamodbav:"option_id"`

	// OptionName はオプション名
	OptionName string `json:"option_name" dynamodbav:"option_name"`

	// Price は料金（税抜）
	Price int `json:"price" dynamodbav:"price"`

	// TaxRate は税率（例: 0.10）
	TaxRate float64 `json:"tax_rate" dynamodbav:"tax_rate"`

	// IsActive は有効/無効（削除せず非表示にする）
	IsActive bool `json:"is_active" dynamodbav:"is_active"`

	// DisplayOrder は予約フォームでの表示順（オプショナル）
	DisplayOrder *int `json:"display_order,omitempty" dynamodbav:"display_order,omitempty"`

	// CreatedAt は作成日時
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}
