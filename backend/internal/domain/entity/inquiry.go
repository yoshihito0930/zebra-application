package entity

import "time"

// InquiryStatus は問い合わせのステータスを表す
type InquiryStatus string

const (
	// InquiryStatusOpen は未回答の問い合わせ
	InquiryStatusOpen InquiryStatus = "open"
	// InquiryStatusReplied は回答済みの問い合わせ
	InquiryStatusReplied InquiryStatus = "replied"
	// InquiryStatusClosed はクローズ済みの問い合わせ
	InquiryStatusClosed InquiryStatus = "closed"
)

// Inquiry は問い合わせエンティティを表す
type Inquiry struct {
	// StudioID はスタジオの一意識別子
	StudioID string `json:"studio_id" dynamodbav:"studio_id"`

	// InquiryID は問い合わせの一意識別子
	InquiryID string `json:"inquiry_id" dynamodbav:"inquiry_id"`

	// UserID は問い合わせ者のユーザーID
	UserID string `json:"user_id" dynamodbav:"user_id"`

	// InquiryTitle は質問の題名
	InquiryTitle string `json:"inquiry_title" dynamodbav:"inquiry_title"`

	// InquiryDetail は質問の内容
	InquiryDetail string `json:"inquiry_detail" dynamodbav:"inquiry_detail"`

	// InquiryStatus は問い合わせのステータス（open/replied/closed）
	InquiryStatus InquiryStatus `json:"inquiry_status" dynamodbav:"inquiry_status"`

	// ReplyDetail は回答内容（回答時に記入、オプショナル）
	ReplyDetail *string `json:"reply_detail,omitempty" dynamodbav:"reply_detail,omitempty"`

	// RepliedAt は回答日時（オプショナル）
	RepliedAt *time.Time `json:"replied_at,omitempty" dynamodbav:"replied_at,omitempty"`

	// CreatedAt は作成日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// IsReplied は回答済みかどうかを判定する
// 戻り値: ステータスがrepliedまたはclosedの場合true、openの場合false
func (i *Inquiry) IsReplied() bool {
	return i.InquiryStatus == InquiryStatusReplied || i.InquiryStatus == InquiryStatusClosed
}

// CanReply は回答可能かどうかを判定する
// 戻り値: ステータスがopenの場合true、それ以外の場合false
//
// 注意: 既に回答済み（replied）の問い合わせに再度回答することも
// ビジネス要件によっては許可される場合があるため、必要に応じて調整
func (i *Inquiry) CanReply() bool {
	return i.InquiryStatus == InquiryStatusOpen
}

// IsOpen は未回答かどうかを判定する
// 戻り値: ステータスがopenの場合true、それ以外の場合false
func (i *Inquiry) IsOpen() bool {
	return i.InquiryStatus == InquiryStatusOpen
}

// IsClosed はクローズ済みかどうかを判定する
// 戻り値: ステータスがclosedの場合true、それ以外の場合false
func (i *Inquiry) IsClosed() bool {
	return i.InquiryStatus == InquiryStatusClosed
}
