package entity

import "time"

// UserRole はユーザーのロールを表す
type UserRole string

const (
	// UserRoleCustomer はスタジオ利用者（顧客）
	UserRoleCustomer UserRole = "customer"
	// UserRoleAdmin はスタジオ管理者（予約の承認・管理を行う）
	UserRoleAdmin UserRole = "admin"
	// UserRoleStaff はスタジオスタッフ（予約の閲覧のみ可能）
	UserRoleStaff UserRole = "staff"
)

// User はユーザーエンティティを表す
// スタジオ利用者（customer）、スタジオ管理者（admin）、スタジオスタッフ（staff）を含む
type User struct {
	// StudioID は所属スタジオID（admin/staffのみ、customerはnilまたは空文字）
	StudioID *string `json:"studio_id,omitempty" dynamodbav:"studio_id,omitempty"`

	// UserID はユーザーの一意識別子（UUID）
	UserID string `json:"user_id" dynamodbav:"user_id"`

	// Name はユーザーの名前
	Name string `json:"name" dynamodbav:"name"`

	// Email はメールアドレス（ユニーク制約あり）
	Email string `json:"email" dynamodbav:"email"`

	// PhoneNumber は電話番号
	PhoneNumber string `json:"phone_number" dynamodbav:"phone_number"`

	// CompanyName は会社名（オプショナル）
	CompanyName *string `json:"company_name,omitempty" dynamodbav:"company_name,omitempty"`

	// Address は住所
	Address string `json:"address" dynamodbav:"address"`

	// Role はユーザーのロール（customer/admin/staff）
	Role UserRole `json:"role" dynamodbav:"role"`

	// CreatedAt は登録日時（UTC、ISO8601形式）
	CreatedAt time.Time `json:"created_at" dynamodbav:"created_at"`

	// UpdatedAt は更新日時（UTC、ISO8601形式）
	UpdatedAt time.Time `json:"updated_at" dynamodbav:"updated_at"`
}

// IsAdmin は管理者ロールかどうかを判定する
func (u *User) IsAdmin() bool {
	return u.Role == UserRoleAdmin
}

// IsStaff はスタッフロールかどうかを判定する
func (u *User) IsStaff() bool {
	return u.Role == UserRoleStaff
}

// IsCustomer は顧客ロールかどうかを判定する
func (u *User) IsCustomer() bool {
	return u.Role == UserRoleCustomer
}

// BelongsToStudio は指定されたスタジオに所属しているかを判定する
// admin/staffのみがスタジオに所属する（customerはfalseを返す）
func (u *User) BelongsToStudio(studioID string) bool {
	if u.StudioID == nil {
		return false
	}
	return *u.StudioID == studioID
}

// HasStudioAccess はスタジオへのアクセス権限があるかを判定する
// admin/staffのみがtrueを返す
func (u *User) HasStudioAccess() bool {
	return u.IsAdmin() || u.IsStaff()
}
