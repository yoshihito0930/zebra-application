package middleware

import (
	"context"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/yoshihito0930/zebra-application/pkg/apierror"
	"github.com/yoshihito0930/zebra-application/pkg/response"
)

// CognitoAuthMiddleware extracts authenticated user identity from API Gateway
// COGNITO_USER_POOLS authorizer claims.
//
// API Gateway validates the Cognito JWT before invoking the Lambda and places
// the verified claims at request.RequestContext.Authorizer["claims"]. This
// middleware reads those claims and populates the context for downstream handlers.
//
// Expected claims (set during signup via AdminUpdateUserAttributes):
//
//	"sub"               → user_id (Cognito UUID, used as DynamoDB primary key)
//	"email"             → user email
//	"custom:role"       → "customer" | "admin" | "staff"
//	"custom:studio_id"  → studio ID (admin/staff only, empty for customer)
func CognitoAuthMiddleware(next Handler) Handler {
	return func(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
		rawClaims, ok := request.RequestContext.Authorizer["claims"]
		if !ok || rawClaims == nil {
			log.Printf("CognitoAuthMiddleware: no claims in authorizer context")
			return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
		}

		claims, ok := rawClaims.(map[string]interface{})
		if !ok {
			log.Printf("CognitoAuthMiddleware: claims has unexpected type")
			return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
		}

		userID, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)
		role, _ := claims["custom:role"].(string)
		studioID, _ := claims["custom:studio_id"].(string)

		if userID == "" || email == "" {
			log.Printf("CognitoAuthMiddleware: missing required claims (sub or email)")
			return response.ErrorWithCORS(apierror.ErrUnauthorized), nil
		}

		// custom:role が未設定の場合は customer をデフォルトとする（移行期対応）
		if role == "" {
			role = string(RoleCustomer)
		}

		ctx = context.WithValue(ctx, UserIDKey, userID)
		ctx = context.WithValue(ctx, EmailKey, email)
		ctx = context.WithValue(ctx, RoleKey, role)
		ctx = context.WithValue(ctx, StudioIDKey, studioID)

		return next(ctx, request)
	}
}
