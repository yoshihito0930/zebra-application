package entity

import (
	"fmt"
	"time"
)

// BlockedSlot は予約不可枠エンティティを表す
// 休業日やプライベート利用など、予約を受け付けない時間帯を管理する
type BlockedSlot struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// BlockedSlotID はブロック枠の一意識別子（UUID）
	BlockedSlotID string `json:"blocked_slot_id" dynamodbav:"blocked_slot_id"`

	// Date はブロック対象日（YYYY-MM-DD）
	Date time.Time `json:"date" dynamodbav:"date"`

	// IsAllDay は終日ブロックかどうか
	// true: 終日ブロック（StartTime/EndTimeは使用しない）
	// false: 時間帯指定ブロック（StartTime/EndTimeが必須）
	IsAllDay bool `json:"is_all_day" dynamodbav:"is_all_day"`

	// StartTime は開始時刻（HH:MM形式、例: "10:00"）
	// IsAllDay=falseの場合のみ使用（IsAllDay=trueの場合はnil）
	StartTime *string `json:"start_time,omitempty" dynamodbav:"start_time,omitempty"`

	// EndTime は終了時刻（HH:MM形式、例: "18:00"）
	// IsAllDay=falseの場合のみ使用（IsAllDay=trueの場合はnil）
	EndTime *string `json:"end_time,omitempty" dynamodbav:"end_time,omitempty"`

	// Reason はブロック理由（例: "定休日", "プライベート利用", "メンテナンス"）
	Reason string `json:"reason" dynamodbav:"reason"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// OverlapsWith は指定された時間帯とブロック枠が重複するかを判定する
// startTime: 判定対象の開始時刻（HH:MM形式）
// endTime: 判定対象の終了時刻（HH:MM形式）
// 戻り値: 重複する場合true、重複しない場合false
//
// 重複判定のロジック:
// - 終日ブロック（IsAllDay=true）の場合は常にtrue
// - 時間帯指定ブロックの場合は、時間帯の重複をチェック（日跨ぎ対応）
func (b *BlockedSlot) OverlapsWith(startTime, endTime string) bool {
	// 終日ブロックの場合は常に重複する
	if b.IsAllDay {
		return true
	}

	// StartTime/EndTimeがnilの場合は重複しない（データ不整合を考慮）
	if b.StartTime == nil || b.EndTime == nil {
		return false
	}

	// 時間帯の重複チェック（日跨ぎ対応のため分単位で比較）
	// 重複条件: startTime < b.EndTime && b.StartTime < endTime
	// 例: 予約(10:00-14:00) と ブロック(12:00-16:00) → 重複
	startMin := timeToMinutes(startTime)
	endMin := timeToMinutes(endTime)
	bStartMin := timeToMinutes(*b.StartTime)
	bEndMin := timeToMinutes(*b.EndTime)

	return startMin < bEndMin && bStartMin < endMin
}

// timeToMinutes は時刻文字列（HH:MM形式）を0時からの経過分に変換する
// 例: "10:30" → 630, "26:00" → 1560
func timeToMinutes(timeStr string) int {
	var hour, min int
	_, err := fmt.Sscanf(timeStr, "%d:%d", &hour, &min)
	if err != nil {
		return 0
	}
	return hour*60 + min
}

// IsValid はブロック枠のデータが有効かを判定する
// 戻り値: 有効な場合true、無効な場合false
//
// バリデーションルール:
// - IsAllDay=falseの場合、StartTimeとEndTimeが必須
// - IsAllDay=trueの場合、StartTimeとEndTimeは不要（nilであるべき）
func (b *BlockedSlot) IsValid() bool {
	if b.IsAllDay {
		// 終日ブロックの場合、StartTime/EndTimeはnilであるべき
		return b.StartTime == nil && b.EndTime == nil
	}

	// 時間帯指定の場合、StartTime/EndTimeが必須
	return b.StartTime != nil && b.EndTime != nil
}
