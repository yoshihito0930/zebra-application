package notification

import (
	"context"
	"fmt"
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

	return &EmailService{
		sesClient:   sesClient,
		senderEmail: senderEmail,
		baseURL:     baseURL,
	}
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
        <li><strong>予約ID:</strong> %s</li>
        <li><strong>利用日:</strong> %s</li>
        <li><strong>利用時間:</strong> %s - %s</li>
        <li><strong>撮影タイプ:</strong> %s</li>
        <li><strong>撮影人数:</strong> %d名</li>
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
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople,
		confirmationURL, confirmationURL)

	bodyText := fmt.Sprintf(`
ご予約ありがとうございます

%s 様

スタジオゼブラのご予約を承りました。
以下の内容で予約を受け付けております。管理者の承認をお待ちください。

【予約内容】
予約ID: %s
利用日: %s
利用時間: %s - %s
撮影タイプ: %s
撮影人数: %d名

【予約の確認・変更・キャンセル】
以下のリンクから予約の詳細確認、キャンセルが可能です。
このリンクはブックマークしておくことをお勧めします。

%s

────────────────────────────────────
このメールに心当たりがない場合は、削除していただいて構いません。
お問い合わせ: スタジオゼブラ
Email: info@studio-zebra.com
`, guestName, reservation.ReservationID, dateStr, reservation.StartTime, reservation.EndTime,
		formatShootingTypes(reservation.ShootingType), reservation.NumberOfPeople, confirmationURL)

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

// formatShootingTypes は撮影タイプの配列を読みやすい文字列に変換する
func formatShootingTypes(types []string) string {
	if len(types) == 0 {
		return "未指定"
	}

	result := ""
	for i, t := range types {
		if i > 0 {
			result += "、"
		}
		result += t
	}
	return result
}

// formatDateTime は日時を読みやすい形式にフォーマットする
func formatDateTime(t time.Time) string {
	return t.Format("2006年01月02日 15:04")
}
