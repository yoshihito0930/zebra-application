package notification

import (
	"context"
	"fmt"
	"strings"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
	"github.com/yoshihito0930/zebra-application/internal/repository"
)

// approvalEmailSubject は承認メールの件名（固定）
const approvalEmailSubject = "【スタジオゼブラ】ご予約が承認されました"

// ResolveRecipient は予約レコードから承認メールの宛先（メールアドレスと宛名）を解決する。
//
// 宛先は必ず予約レコード由来とし、管理者の手入力は受け付けない（誤送信防止）。
//   - ゲスト予約（IsGuest）: GuestEmail / GuestName を使用
//   - 会員予約: UserID から userRepo.FindByID でユーザーを引き、Email / Name を使用
//
// 戻り値:
//   - email: 宛先メールアドレス
//   - name: 宛名（敬称なし。空の場合は呼び出し側でフォールバック）
//   - err: 宛先を解決できない場合のエラー
func ResolveRecipient(ctx context.Context, reservation *entity.Reservation, userRepo repository.UserRepository) (email string, name string, err error) {
	if reservation.IsGuest {
		if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
			return "", "", fmt.Errorf("guest email is empty for reservation %s", reservation.ReservationID)
		}
		guestName := ""
		if reservation.GuestName != nil {
			guestName = *reservation.GuestName
		}
		return *reservation.GuestEmail, guestName, nil
	}

	if reservation.UserID == nil || *reservation.UserID == "" {
		return "", "", fmt.Errorf("user_id is empty for reservation %s", reservation.ReservationID)
	}
	user, findErr := userRepo.FindByID(ctx, *reservation.UserID)
	if findErr != nil {
		return "", "", fmt.Errorf("failed to find user (user_id=%s): %w", *reservation.UserID, findErr)
	}
	if user == nil {
		return "", "", fmt.Errorf("user not found (user_id=%s)", *reservation.UserID)
	}
	if user.Email == "" {
		return "", "", fmt.Errorf("user email is empty (user_id=%s)", *reservation.UserID)
	}
	return user.Email, user.Name, nil
}

// BuildApprovalEmailBody は予約レコードから承認メールの件名・本文の初期値を組み立て、
// 値が欠損しているテンプレート変数の一覧（missing）を返す。
//
// このv1ではテンプレートは固定だが、本文初期値の供給元を一箇所に閉じ込めることで、
// 将来この供給元（テンプレートエンジンやスタジオ別テンプレート等）を差し替えられるようにしている。
//
// missing が非空の場合、未展開・空欄のまま送信されるべきではない（送信API側でガードする）。
//
// 引数:
//   - reservation: 予約情報
//   - recipientName: 宛名（ResolveRecipient で解決した名前。空でも可）
//
// 戻り値:
//   - subject: 件名
//   - body: 本文（プレーンテキスト）
//   - missing: 値が欠損しているテンプレート変数の表示名一覧
func BuildApprovalEmailBody(reservation *entity.Reservation, recipientName string) (subject string, body string, missing []string) {
	missing = []string{}

	// 各変数を展開し、欠損していれば missing に記録する。
	// 欠損時は本文には分かりやすいマーカーを入れず、空欄を残さないため
	// 呼び出し側（送信API）が missing を見て送信をブロックする前提とする。
	nameVal := strings.TrimSpace(recipientName)
	if nameVal == "" {
		missing = append(missing, "宛名")
	}

	dateVal := ""
	if !reservation.Date.IsZero() {
		dateVal = reservation.Date.Format("2006年01月02日")
	} else {
		missing = append(missing, "利用日")
	}

	startVal := strings.TrimSpace(reservation.StartTime)
	endVal := strings.TrimSpace(reservation.EndTime)
	if startVal == "" || endVal == "" {
		missing = append(missing, "利用時間")
	}

	planVal := strings.TrimSpace(reservation.PlanName)
	if planVal == "" {
		missing = append(missing, "プラン名")
	}

	shootingVal := ""
	if len(reservation.ShootingType) == 0 {
		missing = append(missing, "撮影タイプ")
	} else {
		shootingVal = formatShootingTypes(reservation.ShootingType)
	}

	peopleVal := ""
	if reservation.NumberOfPeople <= 0 {
		missing = append(missing, "撮影人数")
	} else {
		peopleVal = fmt.Sprintf("%d名", reservation.NumberOfPeople)
	}

	timeRange := ""
	if startVal != "" && endVal != "" {
		timeRange = fmt.Sprintf("%s - %s", startVal, endVal)
	}

	body = fmt.Sprintf(`%s 様

スタジオゼブラのご予約が管理者により承認されました。
以下の内容でお待ちしております。

【予約内容】
予約ID: %s
予約種別: %s
利用日: %s
利用時間: %s
プラン: %s
撮影タイプ: %s
撮影人数: %s

【予約の確認・変更・キャンセル】
ご予約の詳細確認・キャンセルが可能です。

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`,
		nameVal,
		reservation.ReservationID,
		formatReservationType(reservation.ReservationType),
		dateVal,
		timeRange,
		planVal,
		shootingVal,
		peopleVal,
	)

	return approvalEmailSubject, body, missing
}
