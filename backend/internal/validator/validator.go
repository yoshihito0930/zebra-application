package validator

import (
	"fmt"
	"regexp"
	"time"

	"github.com/yoshihito0930/zebra-application/pkg/apierror"
)

// ValidationResult はバリデーション結果を表す構造体
type ValidationResult struct {
	Valid   bool
	Details []apierror.ValidationErrorDetail
}

// AddError はバリデーションエラーを追加する
func (v *ValidationResult) AddError(field, message string) {
	v.Valid = false
	v.Details = append(v.Details, apierror.ValidationErrorDetail{
		Field:   field,
		Message: message,
	})
}

// ToAPIError はバリデーションエラーをAPIErrorに変換する
func (v *ValidationResult) ToAPIError() *apierror.APIError {
	if v.Valid {
		return nil
	}
	return apierror.ErrValidation.WithDetails(v.Details)
}

// メールアドレスの正規表現
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// 電話番号の正規表現（日本の電話番号形式）
// 例: 090-1234-5678, 03-1234-5678, 0312345678
var phoneRegex = regexp.MustCompile(`^0\d{1,4}-?\d{1,4}-?\d{4}$`)

// 時刻の正規表現（HH:MM形式）
var timeRegex = regexp.MustCompile(`^([01]\d|2[0-3]):([0-5]\d)$`)

// 日付の正規表現（YYYY-MM-DD形式）
var dateRegex = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$`)

// ValidateEmail はメールアドレスの形式をチェックする
func ValidateEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// ValidatePhoneNumber は電話番号の形式をチェックする
func ValidatePhoneNumber(phone string) bool {
	return phoneRegex.MatchString(phone)
}

// ValidateTime は時刻の形式をチェックする（HH:MM）
func ValidateTime(timeStr string) bool {
	return timeRegex.MatchString(timeStr)
}

// ValidateDate は日付の形式をチェックする（YYYY-MM-DD）
func ValidateDate(dateStr string) bool {
	if !dateRegex.MatchString(dateStr) {
		return false
	}

	// 実際に日付としてパース可能かチェック
	_, err := time.Parse("2006-01-02", dateStr)
	return err == nil
}

// ValidateRequired は必須フィールドのチェックを行う
func ValidateRequired(value string, fieldName string, result *ValidationResult) {
	if value == "" {
		result.AddError(fieldName, fmt.Sprintf("%sは必須です", fieldName))
	}
}

// ValidateStringLength は文字列の長さをチェックする
func ValidateStringLength(value string, fieldName string, min, max int, result *ValidationResult) {
	length := len([]rune(value)) // マルチバイト文字に対応
	if length < min || length > max {
		result.AddError(fieldName, fmt.Sprintf("%sは%d〜%d文字で入力してください", fieldName, min, max))
	}
}

// ValidateEmailFormat はメールアドレスの形式をチェックする
func ValidateEmailFormat(email string, fieldName string, result *ValidationResult) {
	if email != "" && !ValidateEmail(email) {
		result.AddError(fieldName, fmt.Sprintf("%sの形式が正しくありません", fieldName))
	}
}

// ValidatePhoneFormat は電話番号の形式をチェックする
func ValidatePhoneFormat(phone string, fieldName string, result *ValidationResult) {
	if phone != "" && !ValidatePhoneNumber(phone) {
		result.AddError(fieldName, fmt.Sprintf("%sの形式が正しくありません（例: 090-1234-5678）", fieldName))
	}
}

// ValidateDateFormat は日付の形式をチェックする
func ValidateDateFormat(dateStr string, fieldName string, result *ValidationResult) bool {
	if !ValidateDate(dateStr) {
		result.AddError(fieldName, fmt.Sprintf("%sの形式が正しくありません（YYYY-MM-DD形式で入力してください）", fieldName))
		return false
	}
	return true
}

// ValidateDateNotPast は日付が今日以降かチェックする
func ValidateDateNotPast(dateStr string, fieldName string, result *ValidationResult) {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return // 形式エラーは ValidateDateFormat で既にチェック済み
	}

	today := time.Now().Truncate(24 * time.Hour)
	if date.Before(today) {
		result.AddError(fieldName, fmt.Sprintf("%sは今日以降の日付を指定してください", fieldName))
	}
}

// ValidateTimeFormat は時刻の形式をチェックする
func ValidateTimeFormat(timeStr string, fieldName string, result *ValidationResult) bool {
	if !ValidateTime(timeStr) {
		result.AddError(fieldName, fmt.Sprintf("%sの形式が正しくありません（HH:MM形式で入力してください）", fieldName))
		return false
	}
	return true
}

// ValidateTimeRange は開始時刻が終了時刻より前かチェックする
func ValidateTimeRange(startTime, endTime string, result *ValidationResult) {
	if !ValidateTime(startTime) || !ValidateTime(endTime) {
		return // 形式エラーは ValidateTimeFormat で既にチェック済み
	}

	// 時刻を比較用にパース
	start, _ := time.Parse("15:04", startTime)
	end, _ := time.Parse("15:04", endTime)

	if !start.Before(end) {
		result.AddError("start_time", "開始時刻は終了時刻より前に設定してください")
	}
}

// ValidateEnum は値が列挙型の中に含まれるかチェックする
func ValidateEnum(value string, fieldName string, allowedValues []string, result *ValidationResult) {
	for _, allowed := range allowedValues {
		if value == allowed {
			return
		}
	}

	result.AddError(fieldName, fmt.Sprintf("%sの値が不正です（許可された値: %v）", fieldName, allowedValues))
}

// ValidatePassword はパスワードの強度をチェックする
func ValidatePassword(password string, fieldName string, result *ValidationResult) {
	if len(password) < 8 {
		result.AddError(fieldName, fmt.Sprintf("%sは8文字以上で入力してください", fieldName))
		return
	}

	// 英数字記号を含むかチェック
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)

	if !hasLetter || !hasDigit {
		result.AddError(fieldName, fmt.Sprintf("%sは英字と数字を含める必要があります", fieldName))
	}
}

// ValidateIntRange は整数が範囲内かチェックする
func ValidateIntRange(value int, fieldName string, min, max int, result *ValidationResult) {
	if value < min || value > max {
		result.AddError(fieldName, fmt.Sprintf("%sは%d〜%dの範囲で指定してください", fieldName, min, max))
	}
}

// ValidateFloatRange は浮動小数点数が範囲内かチェックする
func ValidateFloatRange(value float64, fieldName string, min, max float64, result *ValidationResult) {
	if value < min || value > max {
		result.AddError(fieldName, fmt.Sprintf("%sは%.2f〜%.2fの範囲で指定してください", fieldName, min, max))
	}
}
