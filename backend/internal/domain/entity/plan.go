package entity

import "time"

// Plan は料金プランエンティティを表す
type Plan struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// PlanID は料金プランの一意識別子
	PlanID string `json:"plan_id" dynamodbav:"plan_id"`

	// PlanName は料金プラン名（例: "1時間プラン", "半日プラン"）
	PlanName string `json:"plan_name" dynamodbav:"plan_name"`

	// Description はプランの説明（オプショナル）
	Description *string `json:"description,omitempty" dynamodbav:"description,omitempty"`

	// Price は料金（税抜、単位: 円）
	Price int `json:"price" dynamodbav:"price"`

	// TaxRate は税率（例: 0.10 = 10%）
	TaxRate float64 `json:"tax_rate" dynamodbav:"tax_rate"`

	// IsActive は有効/無効フラグ（削除せず非表示にする）
	IsActive bool `json:"is_active" dynamodbav:"is_active"`

	// DisplayOrder は予約フォームでの表示順（オプショナル、数値が小さい方が先に表示）
	DisplayOrder *int `json:"display_order,omitempty" dynamodbav:"display_order,omitempty"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// CalculateTotalPrice は税込価格を計算する
// 戻り値: 税込価格（円単位、小数点以下切り捨て）
//
// 計算式: Price * (1 + TaxRate)
// 例: Price=10000, TaxRate=0.10 → 10000 * 1.10 = 11000円
func (p *Plan) CalculateTotalPrice() int {
	return int(float64(p.Price) * (1 + p.TaxRate))
}

// IsAvailable はプランが利用可能かどうかを判定する
// 戻り値: IsActiveがtrueの場合はtrue、falseの場合はfalse
//
// 注意: 将来的に有効期限などの条件を追加する場合は、このメソッドを拡張する
func (p *Plan) IsAvailable() bool {
	return p.IsActive
}

// GetPriceWithTax は税込価格を取得する（CalculateTotalPriceのエイリアス）
// API レスポンスなどで税込価格を返す際に使用
func (p *Plan) GetPriceWithTax() int {
	return p.CalculateTotalPrice()
}
