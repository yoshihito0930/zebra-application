package service

import (
	"context"
	"fmt"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider"
	"github.com/aws/aws-sdk-go-v2/service/cognitoidentityprovider/types"
)

// CognitoService はCognito操作のサービス層
type CognitoService struct {
	client       *cognitoidentityprovider.Client
	userPoolID   string
	clientID     string
	clientSecret string
}

// NewCognitoService はCognitoServiceのコンストラクタ
func NewCognitoService(cfg aws.Config) *CognitoService {
	client := cognitoidentityprovider.NewFromConfig(cfg)

	return &CognitoService{
		client:       client,
		userPoolID:   os.Getenv("COGNITO_USER_POOL_ID"),
		clientID:     os.Getenv("COGNITO_CLIENT_ID"),
		clientSecret: os.Getenv("COGNITO_CLIENT_SECRET"),
	}
}

// SignUpInput はサインアップの入力パラメータ
type SignUpInput struct {
	Email       string
	Password    string
	Name        string
	PhoneNumber string
	Address     string
	CompanyName string
}

// SignUpOutput はサインアップの出力
type SignUpOutput struct {
	UserSub string // CognitoのユーザーID（UUID）
}

// SignUp はCognitoにユーザーを登録する
func (s *CognitoService) SignUp(ctx context.Context, input SignUpInput) (*SignUpOutput, error) {
	// ユーザー属性を設定
	userAttributes := []types.AttributeType{
		{
			Name:  aws.String("email"),
			Value: aws.String(input.Email),
		},
		{
			Name:  aws.String("name"),
			Value: aws.String(input.Name),
		},
		{
			Name:  aws.String("phone_number"),
			Value: aws.String(input.PhoneNumber),
		},
		{
			Name:  aws.String("address"),
			Value: aws.String(input.Address),
		},
	}

	// 会社名が指定されている場合は追加
	if input.CompanyName != "" {
		userAttributes = append(userAttributes, types.AttributeType{
			Name:  aws.String("custom:company_name"),
			Value: aws.String(input.CompanyName),
		})
	}

	// Cognitoへユーザー登録
	signUpInput := &cognitoidentityprovider.SignUpInput{
		ClientId:       aws.String(s.clientID),
		Username:       aws.String(input.Email), // メールアドレスをユーザー名として使用
		Password:       aws.String(input.Password),
		UserAttributes: userAttributes,
	}

	result, err := s.client.SignUp(ctx, signUpInput)
	if err != nil {
		return nil, fmt.Errorf("failed to sign up to Cognito: %w", err)
	}

	return &SignUpOutput{
		UserSub: *result.UserSub,
	}, nil
}

// LoginInput はログインの入力パラメータ
type LoginInput struct {
	Email    string
	Password string
}

// LoginOutput はログインの出力
type LoginOutput struct {
	AccessToken  string
	RefreshToken string
	IDToken      string
	ExpiresIn    int32
}

// Login はCognitoで認証を行う
func (s *CognitoService) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	// 認証リクエストを作成
	authInput := &cognitoidentityprovider.InitiateAuthInput{
		AuthFlow: types.AuthFlowTypeUserPasswordAuth,
		ClientId: aws.String(s.clientID),
		AuthParameters: map[string]string{
			"USERNAME": input.Email,
			"PASSWORD": input.Password,
		},
	}

	result, err := s.client.InitiateAuth(ctx, authInput)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate with Cognito: %w", err)
	}

	if result.AuthenticationResult == nil {
		return nil, fmt.Errorf("authentication result is nil")
	}

	return &LoginOutput{
		AccessToken:  *result.AuthenticationResult.AccessToken,
		RefreshToken: *result.AuthenticationResult.RefreshToken,
		IDToken:      *result.AuthenticationResult.IdToken,
		ExpiresIn:    result.AuthenticationResult.ExpiresIn,
	}, nil
}

// ConfirmSignUp はメール確認コードで登録を完了する
func (s *CognitoService) ConfirmSignUp(ctx context.Context, email, confirmationCode string) error {
	input := &cognitoidentityprovider.ConfirmSignUpInput{
		ClientId:         aws.String(s.clientID),
		Username:         aws.String(email),
		ConfirmationCode: aws.String(confirmationCode),
	}

	_, err := s.client.ConfirmSignUp(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to confirm sign up: %w", err)
	}

	return nil
}

// AdminConfirmSignUp は管理者権限でユーザーを自動確認する（開発環境用）
func (s *CognitoService) AdminConfirmSignUp(ctx context.Context, email string) error {
	input := &cognitoidentityprovider.AdminConfirmSignUpInput{
		UserPoolId: aws.String(s.userPoolID),
		Username:   aws.String(email),
	}

	_, err := s.client.AdminConfirmSignUp(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to admin confirm sign up: %w", err)
	}

	return nil
}

// GetUserFromToken はアクセストークンからユーザー情報を取得する
func (s *CognitoService) GetUserFromToken(ctx context.Context, accessToken string) (map[string]string, error) {
	input := &cognitoidentityprovider.GetUserInput{
		AccessToken: aws.String(accessToken),
	}

	result, err := s.client.GetUser(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from token: %w", err)
	}

	// 属性をマップに変換
	attributes := make(map[string]string)
	for _, attr := range result.UserAttributes {
		if attr.Name != nil && attr.Value != nil {
			attributes[*attr.Name] = *attr.Value
		}
	}

	return attributes, nil
}
