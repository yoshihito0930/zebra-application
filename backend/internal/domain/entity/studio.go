package entity

import (
	"strings"
	"time"
)

// Studio はスタジオエンティティを表す
type Studio struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// StudioName はスタジオ名
	StudioName string `json:"studio_name" dynamodbav:"studio_name"`

	// StudioAddress はスタジオの住所
	StudioAddress string `json:"studio_address" dynamodbav:"studio_address"`

	// PhoneNumber はスタジオの電話番号
	PhoneNumber string `json:"phone_number" dynamodbav:"phone_number"`

	// Email はスタジオのメールアドレス
	Email string `json:"email" dynamodbav:"email"`

	// BusinessHoursStart は営業開始時刻（HH:MM形式、例: "10:00"）
	BusinessHoursStart string `json:"business_hours_start" dynamodbav:"business_hours_start"`

	// BusinessHoursEnd は営業終了時刻（HH:MM形式、例: "18:00"）
	BusinessHoursEnd string `json:"business_hours_end" dynamodbav:"business_hours_end"`

	// RegularHolidays は定休日のリスト（例: ["sunday", "monday"]）
	RegularHolidays []string `json:"regular_holidays,omitempty" dynamodbav:"regular_holidays,omitempty"`

	// TentativeExpiryDays は仮予約の有効期限（利用日の何日前か）
	TentativeExpiryDays int `json:"tentative_expiry_days" dynamodbav:"tentative_expiry_days"`

	// CancellationPolicy はキャンセルポリシーの説明（オプショナル）
	CancellationPolicy *string `json:"cancellation_policy,omitempty" dynamodbav:"cancellation_policy,omitempty"`

	// IsActive はスタジオの有効/無効フラグ
	IsActive bool `json:"is_active" dynamodbav:"is_active"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// IsRegularHoliday は指定された日付が定休日かどうかを判定する
// date: 判定対象の日付
// 戻り値: 定休日の場合true、営業日の場合false
func (s *Studio) IsRegularHoliday(date time.Time) bool {
	// 曜日を小文字の英語名で取得（例: "monday", "sunday"）
	weekday := strings.ToLower(date.Weekday().String())

	// RegularHolidaysに含まれているかチェック
	for _, holiday := range s.RegularHolidays {
		if strings.ToLower(holiday) == weekday {
			return true
		}
	}
	return false
}

// IsWithinBusinessHours は指定された時間帯が営業時間内かどうかを判定する
// startTime: 開始時刻（HH:MM形式）
// endTime: 終了時刻（HH:MM形式）
// 戻り値: 営業時間内の場合true、営業時間外の場合false
//
// 注意: この実装は簡易版です。厳密な時刻比較を行う場合は、
// time.Parseを使って時刻をパースし、比較する必要があります。
func (s *Studio) IsWithinBusinessHours(startTime, endTime string) bool {
	// 簡易的な文字列比較（HH:MM形式を想定）
	// "10:00" < "18:00" のような辞書順比較
	// 厳密な実装が必要な場合は、後でリファクタリング可能
	return startTime >= s.BusinessHoursStart && endTime <= s.BusinessHoursEnd
}
