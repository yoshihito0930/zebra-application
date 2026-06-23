package notification

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	"github.com/aws/aws-sdk-go-v2/service/sesv2/types"
	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// EmailService はメール送信サービス
type EmailService struct {
	sesClient   *sesv2.Client
	senderEmail string
	baseURL     string // ゲスト予約確認用のベースURL
	dryRun      bool   // true の場合は実際にSESへ送信せず内容をログ出力する（誤送信防止）
}

// NewEmailService は EmailService のコンストラクタ
func NewEmailService(sesClient *sesv2.Client) *EmailService {
	senderEmail := os.Getenv("SES_SENDER_EMAIL")
	if senderEmail == "" {
		senderEmail = "noreply@studio-zebra.com"
	}

	baseURL := os.Getenv("GUEST_RESERVATION_URL")
	if baseURL == "" {
		baseURL = "https://studio-zebra.com/reservations/guest"
	}

	// EMAIL_DRY_RUN=true のとき、実際の送信を行わずログ出力のみとする。
	// dev環境ではtrueに設定し、本番宛の誤送信を防止する。
	dryRun := os.Getenv("EMAIL_DRY_RUN") == "true"

	return &EmailService{
		sesClient:   sesClient,
		senderEmail: senderEmail,
		baseURL:     baseURL,
		dryRun:      dryRun,
	}
}

// SenderEmail は送信元メールアドレス（スタジオのドメイン）を返す
func (s *EmailService) SenderEmail() string {
	return s.senderEmail
}

// IsDryRun はドライランモードか否かを返す
func (s *EmailService) IsDryRun() bool {
	return s.dryRun
}

// SendApprovalEmailWithBody は承認メールを、呼び出し側が用意した件名・本文（プレーンテキスト）で送信する。
//
// 承認時の自動送信ではなく、管理者がレビュー画面で内容を確認・編集したうえで明示的に送信する用途。
// 送信元は常にスタジオのドメイン（SES_SENDER_EMAIL）であり、宛先は呼び出し側が予約レコードから解決する。
//
// ドライラン（EMAIL_DRY_RUN=true）の場合はSESを呼ばず、宛先・件名・本文をログ出力して成功扱いで返す。
//
// 引数:
//   - ctx: コンテキスト
//   - recipientEmail: 宛先メールアドレス（予約レコード由来）
//   - subject: 件名
//   - body: 本文（プレーンテキスト）
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）
func (s *EmailService) SendApprovalEmailWithBody(ctx context.Context, recipientEmail, subject, body string) error {
	if recipientEmail == "" {
		return fmt.Errorf("recipient email is required")
	}
	if subject == "" {
		return fmt.Errorf("subject is required")
	}
	if body == "" {
		return fmt.Errorf("body is required")
	}

	if s.dryRun {
		log.Printf("[EMAIL_DRY_RUN] approval email not sent. from=%s to=%s subject=%q body=\n%s",
			s.senderEmail, recipientEmail, subject, body)
		return nil
	}

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Text: &types.Content{
						Data:    aws.String(body),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	if _, err := s.sesClient.SendEmail(ctx, input); err != nil {
		return fmt.Errorf("failed to send approval email: %w", err)
	}

	return nil
}

// SendGuestReservationConfirmation はゲスト予約の確認メールを送信する
//
// 送信内容:
//   - 予約内容の確認
//   - 予約詳細確認用のトークンリンク
//   - キャンセル・変更の案内
//
// 引数:
//   - ctx: コンテキスト
//   - reservation: 予約情報
//   - token: ゲスト確認用トークン
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）
func (s *EmailService) SendGuestReservationConfirmation(ctx context.Context, reservation *entity.Reservation, token string) error {
	if reservation.GuestEmail == nil {
		return fmt.Errorf("guest email is required")
	}

	recipientEmail := *reservation.GuestEmail
	guestName := ""
	if reservation.GuestName != nil {
		guestName = *reservation.GuestName
	}

	// 予約確認用URL
	confirmationURL := fmt.Sprintf("%s/%s", s.baseURL, token)

	// 予約日時のフォーマット
	dateStr := reservation.Date.Format("2006年01月02日")

	// メール本文を作成
	subject := "【スタジオゼブラ】ご予約ありがとうございます"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約ありがとうございます</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約を承りました。<br>
    以下の内容で予約を受け付けております。管理者の承認をお待ちください。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影種別:</strong> %s</li>
        <li><strong>撮影詳細:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
        <li><strong>カメラマン氏名:</strong> %s</li>
        <li><strong>機材保険:</strong> %s</li>
        <li><strong>ホリゾント養生:</strong> %s</li>
    </ul>

    <h3>予約の確認・変更・キャンセル</h3>
    <p>以下のリンクから予約の詳細確認、キャンセルが可能です。<br>
    このリンクはブックマークしておくことをお勧めします。</p>

    <p><a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">予約を確認する</a></p>

    <p style="color: #666; font-size: 12px;">
    または以下のURLをコピーしてブラウザに貼り付けてください:<br>
    %s
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, guestName, dateStr, reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection),
		confirmationURL, confirmationURL)

	bodyText := fmt.Sprintf(`
ご予約ありがとうございます

%s 様

スタジオゼブラのご予約を承りました。
以下の内容で予約を受け付けております。管理者の承認をお待ちください。

【予約内容】
利用日: %s
利用時間: %s - %s
撮影種別: %s
撮影詳細: %s
撮影人数: %d名
カメラマン氏名: %s
機材保険: %s
ホリゾント養生: %s

【予約の確認・変更・キャンセル】
以下のリンクから予約の詳細確認、キャンセルが可能です。
このリンクはブックマークしておくことをお勧めします。

%s

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, dateStr, reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection),
		confirmationURL)

	// SESでメール送信
	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendGuestReservationCancellation はゲスト予約のキャンセル完了メールを送信する
func (s *EmailService) SendGuestReservationCancellation(ctx context.Context, reservation *entity.Reservation) error {
	if reservation.GuestEmail == nil {
		return fmt.Errorf("guest email is required")
	}

	recipientEmail := *reservation.GuestEmail
	guestName := ""
	if reservation.GuestName != nil {
		guestName = *reservation.GuestName
	}

	// 予約日時のフォーマット
	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】予約キャンセル完了のお知らせ"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>予約キャンセル完了</h2>

    <p>%s 様</p>

    <p>以下の予約をキャンセルいたしました。</p>

    <h3>キャンセルした予約</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
    </ul>

    <p>またのご利用をお待ちしております。</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	bodyText := fmt.Sprintf(`
予約キャンセル完了

%s 様

以下の予約をキャンセルいたしました。

【キャンセルした予約】
予約ID: %s
利用日: %s
利用時間: %s - %s

またのご利用をお待ちしております。

────────────────────────────────────
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendGuestReservationPromotion はゲスト予約の本予約への昇格受付メールを送信する
func (s *EmailService) SendGuestReservationPromotion(ctx context.Context, reservation *entity.Reservation) error {
	if reservation.GuestEmail == nil {
		return fmt.Errorf("guest email is required")
	}

	recipientEmail := *reservation.GuestEmail
	guestName := ""
	if reservation.GuestName != nil {
		guestName = *reservation.GuestName
	}

	// 予約日時のフォーマット
	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】本予約への切り替え受付完了"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>本予約への切り替え受付完了</h2>

    <p>%s 様</p>

    <p>仮予約を本予約に切り替えるリクエストを承りました。<br>
    管理者の承認をお待ちください。承認が完了次第、メールでお知らせいたします。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>ステータス:</strong> 承認待ち</li>
    </ul>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	bodyText := fmt.Sprintf(`
本予約への切り替え受付完了

%s 様

仮予約を本予約に切り替えるリクエストを承りました。
管理者の承認をお待ちください。承認が完了次第、メールでお知らせいたします。

【予約内容】
予約ID: %s
利用日: %s
利用時間: %s - %s
ステータス: 承認待ち

────────────────────────────────────
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendCustomerReservationConfirmation は会員予約の確認メールを送信する
//
// 送信内容:
//   - 予約内容の確認
//   - マイページからの確認・キャンセル案内
//
// 引数:
//   - ctx: コンテキスト
//   - reservation: 予約情報
//   - user: 予約者ユーザー
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）
func (s *EmailService) SendCustomerReservationConfirmation(ctx context.Context, reservation *entity.Reservation, user *entity.User) error {
	if user == nil || user.Email == "" {
		return fmt.Errorf("user email is required")
	}

	recipientEmail := user.Email
	customerName := user.Name

	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】ご予約ありがとうございます"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約ありがとうございます</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約を承りました。<br>
    以下の内容で予約を受け付けております。管理者の承認をお待ちください。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影種別:</strong> %s</li>
        <li><strong>撮影詳細:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
        <li><strong>カメラマン氏名:</strong> %s</li>
        <li><strong>機材保険:</strong> %s</li>
        <li><strong>ホリゾント養生:</strong> %s</li>
    </ul>

    <h3>予約の確認・変更・キャンセル</h3>
    <p>マイページから予約の詳細確認・キャンセルが可能です。</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, customerName, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection))

	bodyText := fmt.Sprintf(`
ご予約ありがとうございます

%s 様

スタジオゼブラのご予約を承りました。
以下の内容で予約を受け付けております。管理者の承認をお待ちください。

【予約内容】
予約種別: %s
利用日: %s
利用時間: %s - %s
撮影種別: %s
撮影詳細: %s
撮影人数: %d名
カメラマン氏名: %s
機材保険: %s
ホリゾント養生: %s

【予約の確認・変更・キャンセル】
マイページから予約の詳細確認・キャンセルが可能です。

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, customerName, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection))

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendAdminReservationNotification はスタジオ管理者宛の予約通知メールを送信する
// 会員予約の場合は customer を渡し、ゲスト予約の場合は customer に nil を渡す
//
// 引数:
//   - ctx: コンテキスト
//   - reservation: 予約情報
//   - customer: 会員予約の予約者ユーザー（ゲスト予約時は nil）
//   - adminEmails: 管理者メールアドレスのリスト
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）。adminEmailsが空の場合はnilを返す（呼び出し側でログ）
func (s *EmailService) SendAdminReservationNotification(ctx context.Context, reservation *entity.Reservation, customer *entity.User, adminEmails []string) error {
	if len(adminEmails) == 0 {
		return nil
	}

	dateStr := reservation.Date.Format("2006年01月02日")

	// 予約者情報を整形
	var reserverKind, reserverName, reserverEmail, reserverPhone, reserverCompany string
	if customer != nil {
		reserverKind = "会員予約"
		reserverName = customer.Name
		reserverEmail = customer.Email
		reserverPhone = customer.PhoneNumber
		if customer.CompanyName != nil {
			reserverCompany = *customer.CompanyName
		}
	} else {
		reserverKind = "ゲスト予約"
		if reservation.GuestName != nil {
			reserverName = *reservation.GuestName
		}
		if reservation.GuestEmail != nil {
			reserverEmail = *reservation.GuestEmail
		}
		if reservation.GuestPhone != nil {
			reserverPhone = *reservation.GuestPhone
		}
		if reservation.GuestCompany != nil {
			reserverCompany = *reservation.GuestCompany
		}
	}
	if reserverCompany == "" {
		reserverCompany = "—"
	}

	subject := "【スタジオゼブラ管理】新規予約が登録されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>新規予約が登録されました</h2>

    <p>以下の予約が新規登録されました。管理画面から承認してください。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約区分:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影種別:</strong> %s</li>
        <li><strong>撮影詳細:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
        <li><strong>カメラマン氏名:</strong> %s</li>
        <li><strong>機材保険:</strong> %s</li>
        <li><strong>ホリゾント養生:</strong> %s</li>
    </ul>

    <h3>予約者情報</h3>
    <ul>
        <li><strong>お名前:</strong> %s</li>
        <li><strong>メール:</strong> %s</li>
        <li><strong>電話:</strong> %s</li>
        <li><strong>会社名:</strong> %s</li>
    </ul>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールはスタジオゼブラ予約管理システムからの自動送信です。
    </p>
</body>
</html>
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection),
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	bodyText := fmt.Sprintf(`
新規予約が登録されました

以下の予約が新規登録されました。管理画面から承認してください。

【予約内容】
予約ID: %s
予約区分: %s
予約種別: %s
利用日: %s
利用時間: %s - %s
撮影種別: %s
撮影詳細: %s
撮影人数: %d名
カメラマン氏名: %s
機材保険: %s
ホリゾント養生: %s

【予約者情報】
お名前: %s
メール: %s
電話: %s
会社名: %s

────────────────────────────────────
このメールはスタジオゼブラ予約管理システムからの自動送信です。
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.ShootingDetails,
		reservation.NumberOfPeople, reservation.PhotographerName,
		formatYesNo(reservation.EquipmentInsurance), formatYesNo(reservation.NeedsProtection),
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: adminEmails,
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send admin notification email: %w", err)
	}

	return nil
}

// formatReservationType は予約種別を日本語表記に変換する
func formatReservationType(t entity.ReservationType) string {
	switch t {
	case entity.ReservationTypeRegular:
		return "本予約"
	case entity.ReservationTypeTentative:
		return "仮予約"
	case entity.ReservationTypeLocationScout:
		return "ロケハン"
	case entity.ReservationTypeSecondKeep:
		return "第2キープ"
	default:
		return string(t)
	}
}

// shootingTypeLabels は撮影種別のDB値→日本語ラベルの対応表
// フロントエンドの選択肢（CreateReservationModal.tsx）と一致させる
var shootingTypeLabels = map[string]string{
	"stills":                  "スチール撮影",
	"video":                   "ムービー撮影",
	"music_with_restrictions": "楽器の演奏を伴う撮影(制限あり)",
}

// formatShootingTypes は撮影種別の配列を日本語ラベルに変換して読みやすい文字列にする
// 未知の値はそのまま出力する
func formatShootingTypes(types []string) string {
	if len(types) == 0 {
		return "未指定"
	}

	result := ""
	for i, t := range types {
		if i > 0 {
			result += "、"
		}
		if label, ok := shootingTypeLabels[t]; ok {
			result += label
		} else {
			result += t
		}
	}
	return result
}

// formatYesNo は真偽値を「あり」「なし」に変換する
func formatYesNo(b bool) string {
	if b {
		return "あり"
	}
	return "なし"
}

// formatDateTime は日時を読みやすい形式にフォーマットする
func formatDateTime(t time.Time) string {
	return t.Format("2006年01月02日 15:04")
}

// formatReservationStatus は予約ステータスを日本語表記に変換する
func formatReservationStatus(s entity.ReservationStatus) string {
	switch s {
	case entity.ReservationStatusPending:
		return "承認待ち"
	case entity.ReservationStatusTentative:
		return "仮予約"
	case entity.ReservationStatusConfirmed:
		return "確定"
	case entity.ReservationStatusWaitlisted:
		return "繰り上げ待ち"
	case entity.ReservationStatusScheduled:
		return "ロケハン予定"
	case entity.ReservationStatusCancelled:
		return "キャンセル済み"
	case entity.ReservationStatusExpired:
		return "期限切れ"
	case entity.ReservationStatusCompleted:
		return "完了"
	default:
		return string(s)
	}
}

// SendCustomerReservationApproval は会員予約の承認通知メールを送信する
//
// 送信内容:
//   - 予約が承認された旨
//   - 予約内容と確定後のステータス
//   - マイページからの確認案内
//
// 引数:
//   - ctx: コンテキスト
//   - reservation: 予約情報
//   - user: 予約者ユーザー
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）
func (s *EmailService) SendCustomerReservationApproval(ctx context.Context, reservation *entity.Reservation, user *entity.User) error {
	if user == nil || user.Email == "" {
		return fmt.Errorf("user email is required")
	}

	recipientEmail := user.Email
	customerName := user.Name

	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】ご予約が承認されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約が承認されました</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約が管理者により承認されました。<br>
    以下の内容でお待ちしております。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>ステータス:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約の確認・変更・キャンセル</h3>
    <p>マイページから予約の詳細確認・キャンセルが可能です。</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, customerName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople)

	bodyText := fmt.Sprintf(`
ご予約が承認されました

%s 様

スタジオゼブラのご予約が管理者により承認されました。
以下の内容でお待ちしております。

【予約内容】
予約ID: %s
予約種別: %s
ステータス: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約の確認・変更・キャンセル】
マイページから予約の詳細確認・キャンセルが可能です。

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, customerName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendGuestReservationApproval はゲスト予約の承認通知メールを送信する
//
// 送信内容:
//   - 予約が承認された旨
//   - 予約内容と確定後のステータス
//   - 予約詳細確認用のトークンリンク
//
// 引数:
//   - ctx: コンテキスト
//   - reservation: 予約情報（GuestEmail / GuestName / GuestToken が必須）
//
// 戻り値:
//   - error: 送信エラー（送信成功時はnil）
func (s *EmailService) SendGuestReservationApproval(ctx context.Context, reservation *entity.Reservation) error {
	if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
		return fmt.Errorf("guest email is required")
	}
	if reservation.GuestToken == nil || *reservation.GuestToken == "" {
		return fmt.Errorf("guest token is required")
	}

	recipientEmail := *reservation.GuestEmail
	guestName := ""
	if reservation.GuestName != nil {
		guestName = *reservation.GuestName
	}

	confirmationURL := fmt.Sprintf("%s/%s", s.baseURL, *reservation.GuestToken)
	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】ご予約が承認されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約が承認されました</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約が管理者により承認されました。<br>
    以下の内容でお待ちしております。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>ステータス:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約の確認・変更・キャンセル</h3>
    <p>以下のリンクから予約の詳細確認、キャンセルが可能です。</p>

    <p><a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">予約を確認する</a></p>

    <p style="color: #666; font-size: 12px;">
    または以下のURLをコピーしてブラウザに貼り付けてください:<br>
    %s
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, guestName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		confirmationURL, confirmationURL)

	bodyText := fmt.Sprintf(`
ご予約が承認されました

%s 様

スタジオゼブラのご予約が管理者により承認されました。
以下の内容でお待ちしております。

【予約内容】
予約ID: %s
予約種別: %s
ステータス: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約の確認・変更・キャンセル】
以下のリンクから予約の詳細確認、キャンセルが可能です。

%s

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople, confirmationURL)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendCustomerReservationUpdate は会員予約の更新通知メールを送信する
//
// 送信内容:
//   - 予約内容が変更された旨
//   - 更新後の予約内容
//   - マイページからの確認案内
func (s *EmailService) SendCustomerReservationUpdate(ctx context.Context, reservation *entity.Reservation, user *entity.User) error {
	if user == nil || user.Email == "" {
		return fmt.Errorf("user email is required")
	}

	recipientEmail := user.Email
	customerName := user.Name

	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】ご予約内容が変更されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約内容が変更されました</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約内容が変更されました。<br>
    変更後の内容は以下の通りです。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>ステータス:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約の確認・変更・キャンセル</h3>
    <p>マイページから予約の詳細確認・キャンセルが可能です。</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, customerName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople)

	bodyText := fmt.Sprintf(`
ご予約内容が変更されました

%s 様

スタジオゼブラのご予約内容が変更されました。
変更後の内容は以下の通りです。

【予約内容】
予約ID: %s
予約種別: %s
ステータス: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約の確認・変更・キャンセル】
マイページから予約の詳細確認・キャンセルが可能です。

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, customerName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendGuestReservationUpdate はゲスト予約の更新通知メールを送信する
//
// 送信内容:
//   - 予約内容が変更された旨
//   - 更新後の予約内容
//   - 予約詳細確認用のトークンリンク
func (s *EmailService) SendGuestReservationUpdate(ctx context.Context, reservation *entity.Reservation) error {
	if reservation.GuestEmail == nil || *reservation.GuestEmail == "" {
		return fmt.Errorf("guest email is required")
	}
	if reservation.GuestToken == nil || *reservation.GuestToken == "" {
		return fmt.Errorf("guest token is required")
	}

	recipientEmail := *reservation.GuestEmail
	guestName := ""
	if reservation.GuestName != nil {
		guestName = *reservation.GuestName
	}

	confirmationURL := fmt.Sprintf("%s/%s", s.baseURL, *reservation.GuestToken)
	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】ご予約内容が変更されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>ご予約内容が変更されました</h2>

    <p>%s 様</p>

    <p>スタジオゼブラのご予約内容が変更されました。<br>
    変更後の内容は以下の通りです。</p>

    <h3>予約内容</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>ステータス:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約の確認・キャンセル</h3>
    <p>以下のリンクから予約の詳細確認、キャンセルが可能です。</p>

    <p><a href="%s" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">予約を確認する</a></p>

    <p style="color: #666; font-size: 12px;">
    または以下のURLをコピーしてブラウザに貼り付けてください:<br>
    %s
    </p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールに心当たりがない場合は、削除していただいて構いません。<br>
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, guestName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		confirmationURL, confirmationURL)

	bodyText := fmt.Sprintf(`
ご予約内容が変更されました

%s 様

スタジオゼブラのご予約内容が変更されました。
変更後の内容は以下の通りです。

【予約内容】
予約ID: %s
予約種別: %s
ステータス: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約の確認・キャンセル】
以下のリンクから予約の詳細確認、キャンセルが可能です。

%s

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, reservation.ReservationID, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		confirmationURL)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendCustomerReservationCancellation は会員予約のキャンセル完了メールを送信する
func (s *EmailService) SendCustomerReservationCancellation(ctx context.Context, reservation *entity.Reservation, user *entity.User) error {
	if user == nil || user.Email == "" {
		return fmt.Errorf("user email is required")
	}

	recipientEmail := user.Email
	customerName := user.Name

	dateStr := reservation.Date.Format("2006年01月02日")

	subject := "【スタジオゼブラ】予約キャンセル完了のお知らせ"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>予約キャンセル完了</h2>

    <p>%s 様</p>

    <p>以下の予約をキャンセルいたしました。</p>

    <h3>キャンセルした予約</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
    </ul>

    <p>またのご利用をお待ちしております。</p>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    お問い合わせ: スタジオゼブラ<br>
    Email: info@studio-zebra.com
    </p>
</body>
</html>
`, customerName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	bodyText := fmt.Sprintf(`
予約キャンセル完了

%s 様

以下の予約をキャンセルいたしました。

【キャンセルした予約】
予約ID: %s
利用日: %s
利用時間: %s - %s

またのご利用をお待ちしております。

────────────────────────────────────
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, customerName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: []string{recipientEmail},
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendAdminReservationUpdateNotification はスタジオ管理者宛の予約変更通知メールを送信する
// 会員予約の場合は customer を渡し、ゲスト予約の場合は customer に nil を渡す
func (s *EmailService) SendAdminReservationUpdateNotification(ctx context.Context, reservation *entity.Reservation, customer *entity.User, adminEmails []string) error {
	if len(adminEmails) == 0 {
		return nil
	}

	dateStr := reservation.Date.Format("2006年01月02日")

	var reserverKind, reserverName, reserverEmail, reserverPhone, reserverCompany string
	if customer != nil {
		reserverKind = "会員予約"
		reserverName = customer.Name
		reserverEmail = customer.Email
		reserverPhone = customer.PhoneNumber
		if customer.CompanyName != nil {
			reserverCompany = *customer.CompanyName
		}
	} else {
		reserverKind = "ゲスト予約"
		if reservation.GuestName != nil {
			reserverName = *reservation.GuestName
		}
		if reservation.GuestEmail != nil {
			reserverEmail = *reservation.GuestEmail
		}
		if reservation.GuestPhone != nil {
			reserverPhone = *reservation.GuestPhone
		}
		if reservation.GuestCompany != nil {
			reserverCompany = *reservation.GuestCompany
		}
	}
	if reserverCompany == "" {
		reserverCompany = "—"
	}

	subject := "【スタジオゼブラ管理】予約が変更されました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>予約が変更されました</h2>

    <p>以下の予約内容が変更されました。</p>

    <h3>予約内容（変更後）</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約区分:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>ステータス:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約者情報</h3>
    <ul>
        <li><strong>お名前:</strong> %s</li>
        <li><strong>メール:</strong> %s</li>
        <li><strong>電話:</strong> %s</li>
        <li><strong>会社名:</strong> %s</li>
    </ul>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールはスタジオゼブラ予約管理システムからの自動送信です。
    </p>
</body>
</html>
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	bodyText := fmt.Sprintf(`
予約が変更されました

以下の予約内容が変更されました。

【予約内容（変更後）】
予約ID: %s
予約区分: %s
予約種別: %s
ステータス: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約者情報】
お名前: %s
メール: %s
電話: %s
会社名: %s

────────────────────────────────────
このメールはスタジオゼブラ予約管理システムからの自動送信です。
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType),
		formatReservationStatus(reservation.Status), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: adminEmails,
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send admin update notification email: %w", err)
	}

	return nil
}

// SendAdminReservationCancellationNotification はスタジオ管理者宛の予約キャンセル通知メールを送信する
// 会員予約の場合は customer を渡し、ゲスト予約の場合は customer に nil を渡す
func (s *EmailService) SendAdminReservationCancellationNotification(ctx context.Context, reservation *entity.Reservation, customer *entity.User, adminEmails []string) error {
	if len(adminEmails) == 0 {
		return nil
	}

	dateStr := reservation.Date.Format("2006年01月02日")

	var reserverKind, reserverName, reserverEmail, reserverPhone, reserverCompany string
	if customer != nil {
		reserverKind = "会員予約"
		reserverName = customer.Name
		reserverEmail = customer.Email
		reserverPhone = customer.PhoneNumber
		if customer.CompanyName != nil {
			reserverCompany = *customer.CompanyName
		}
	} else {
		reserverKind = "ゲスト予約"
		if reservation.GuestName != nil {
			reserverName = *reservation.GuestName
		}
		if reservation.GuestEmail != nil {
			reserverEmail = *reservation.GuestEmail
		}
		if reservation.GuestPhone != nil {
			reserverPhone = *reservation.GuestPhone
		}
		if reservation.GuestCompany != nil {
			reserverCompany = *reservation.GuestCompany
		}
	}
	if reserverCompany == "" {
		reserverCompany = "—"
	}

	subject := "【スタジオゼブラ管理】予約がキャンセルされました"
	bodyHTML := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6;">
    <h2>予約がキャンセルされました</h2>

    <p>以下の予約がキャンセルされました。</p>

    <h3>キャンセルされた予約</h3>
    <ul>
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>予約区分:</strong> %s</li>
        <li><strong>予約種別:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
    </ul>

    <h3>予約者情報</h3>
    <ul>
        <li><strong>お名前:</strong> %s</li>
        <li><strong>メール:</strong> %s</li>
        <li><strong>電話:</strong> %s</li>
        <li><strong>会社名:</strong> %s</li>
    </ul>

    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

    <p style="color: #666; font-size: 12px;">
    このメールはスタジオゼブラ予約管理システムからの自動送信です。
    </p>
</body>
</html>
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	bodyText := fmt.Sprintf(`
予約がキャンセルされました

以下の予約がキャンセルされました。

【キャンセルされた予約】
予約ID: %s
予約区分: %s
予約種別: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約者情報】
お名前: %s
メール: %s
電話: %s
会社名: %s

────────────────────────────────────
このメールはスタジオゼブラ予約管理システムからの自動送信です。
`, reservation.ReservationID, reserverKind, formatReservationType(reservation.ReservationType), dateStr,
		reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		reserverName, reserverEmail, reserverPhone, reserverCompany)

	input := &sesv2.SendEmailInput{
		FromEmailAddress: aws.String(s.senderEmail),
		Destination: &types.Destination{
			ToAddresses: adminEmails,
		},
		Content: &types.EmailContent{
			Simple: &types.Message{
				Subject: &types.Content{
					Data:    aws.String(subject),
					Charset: aws.String("UTF-8"),
				},
				Body: &types.Body{
					Html: &types.Content{
						Data:    aws.String(bodyHTML),
						Charset: aws.String("UTF-8"),
					},
					Text: &types.Content{
						Data:    aws.String(bodyText),
						Charset: aws.String("UTF-8"),
					},
				},
			},
		},
	}

	_, err := s.sesClient.SendEmail(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to send admin cancellation notification email: %w", err)
	}

	return nil
}
