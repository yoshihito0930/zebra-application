package middleware

import (
	"context"

	"github.com/aws/aws-lambda-go/events"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// Role はユーザーのロールを表す型
type Role string

const (
	RoleCustomer Role = "customer" // スタジオ利用者
	RoleAdmin    Role = "admin"    // スタジオ管理者
	RoleStaff    Role = "staff"    // スタジオスタッフ（閲覧のみ）
)

// RequireRole は指定されたロールのいずれかを持つユーザーのみアクセスを許可するミドルウェア
//
// 使用例:
//
//	// 管理者のみアクセス可能
//	handler := RequireRole(actualHandler, RoleAdmin)
//
//	// 顧客または管理者のみアクセス可能
//	handler := RequireRole(actualHandler, RoleCustomer, RoleAdmin)
func RequireRole(next Handler, allowedRoles ...Role) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// コンテキストからロールを取得
		role, ok := ctx.Value(RoleKey).(string)
		if !ok || role == "" {
			return response.ErrorWithCORS(apierror.ErrForbiddenRole), nil
		}

		// 許可されたロールのいずれかと一致するかチェック
		for _, allowedRole := range allowedRoles {
			if Role(role) == allowedRole {
				// 許可されたロールと一致したので、次のハンドラーに処理を委譲
				return next(ctx, request)
			}
		}

		// 許可されたロールと一致しない場合はエラー
		return response.ErrorWithCORS(apierror.ErrForbiddenRole), nil
	}
}

// RequireStudioScope はスタジオスコープをチェックするミドルウェア
//
// admin/staffは所属スタジオのデータのみアクセス可能。
// リクエストに含まれるstudio_idとトークンのstudio_idが一致することを検証する。
//
// 使用例:
//
//	// パスパラメータの {id} がstudio_idの場合
//	handler := RequireStudioScope(actualHandler, "id")
//
//	// クエリパラメータの studio_id をチェックする場合
//	handler := RequireStudioScope(actualHandler, "studio_id")
//
// 注意:
//   - customerロールの場合はチェックをスキップ（すべてのスタジオにアクセス可能）
//   - admin/staffロールの場合のみチェック
func RequireStudioScope(next Handler, studioIDParamName string) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		// コンテキストからロールとstudio_idを取得
		role, _ := ctx.Value(RoleKey).(string)
		userStudioID, _ := ctx.Value(StudioIDKey).(string)

		// customerロールの場合はチェックをスキップ
		if Role(role) == RoleCustomer {
			return next(ctx, request)
		}

		// admin/staffロールの場合、スタジオスコープをチェック
		if Role(role) == RoleAdmin || Role(role) == RoleStaff {
			// リクエストからstudio_idを取得
			var requestStudioID string

			// パスパラメータから取得
			if id, ok := request.PathParameters[studioIDParamName]; ok {
				requestStudioID = id
			}

			// パスパラメータになければ、クエリパラメータから取得
			if requestStudioID == "" {
				if id, ok := request.QueryStringParameters[studioIDParamName]; ok {
					requestStudioID = id
				}
			}

			// studio_idが一致しない場合はエラー
			if requestStudioID != "" && requestStudioID != userStudioID {
				return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
			}
		}

		// 次のハンドラーに処理を委譲
		return next(ctx, request)
	}
}

// RequireOwnership はリソースの所有者のみアクセスを許可するミドルウェア
//
// 顧客は自分の予約・問い合わせのみアクセス可能。
// 管理者・スタッフはスタジオスコープでチェック済みなのでスキップ。
//
// 使用例:
//
//	// 予約詳細の取得: GET /reservations/{id}
//	// リポジトリから予約を取得し、予約のuser_idとトークンのuser_idが一致するかチェック
//	func handler(ctx context.Context, request events.APIGatewayProxyRequest) {
//	    reservationID := request.PathParameters["id"]
//	    reservation, err := repo.FindByID(ctx, reservationID)
//
//	    // 所有者チェック
//	    if !CheckOwnership(ctx, reservation.UserID) {
//	        return response.ErrorWithCORS(apierror.ErrForbiddenResource), nil
//	    }
//
//	    return response.OK(reservation), nil
//	}
func CheckOwnership(ctx context.Context, resourceOwnerID string) bool {
	// コンテキストからロールとuser_idを取得
	role, _ := ctx.Value(RoleKey).(string)
	userID, _ := ctx.Value(UserIDKey).(string)

	// 管理者・スタッフの場合はチェックをスキップ（スタジオスコープで既にチェック済み）
	if Role(role) == RoleAdmin || Role(role) == RoleStaff {
		return true
	}

	// 顧客の場合、user_idが一致するかチェック
	return userID == resourceOwnerID
}

// GetUserIDFromContext はコンテキストからuser_idを取得するヘルパー関数
func GetUserIDFromContext(ctx context.Context) string {
	userID, _ := ctx.Value(UserIDKey).(string)
	return userID
}

// GetRoleFromContext はコンテキストからroleを取得するヘルパー関数
func GetRoleFromContext(ctx context.Context) string {
	role, _ := ctx.Value(RoleKey).(string)
	return role
}

// GetStudioIDFromContext はコンテキストからstudio_idを取得するヘルパー関数
func GetStudioIDFromContext(ctx context.Context) string {
	studioID, _ := ctx.Value(StudioIDKey).(string)
	return studioID
}

// GetEmailFromContext はコンテキストからemailを取得するヘルパー関数
func GetEmailFromContext(ctx context.Context) string {
	email, _ := ctx.Value(EmailKey).(string)
	return email
}
