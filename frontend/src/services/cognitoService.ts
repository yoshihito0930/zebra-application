import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import type { AuthResponse, LoginRequest, SignupRequest } from '../types';

// Cognito User Pool設定
const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
};

const userPool = new CognitoUserPool(poolData);

// エラーコードをユーザーフレンドリーなメッセージに変換
const getErrorMessage = (error: any): string => {
  const code = error.code || error.name;

  const errorMessages: Record<string, string> = {
    UserNotFoundException: 'メールアドレスまたはパスワードが正しくありません',
    NotAuthorizedException: 'メールアドレスまたはパスワードが正しくありません',
    UserNotConfirmedException: 'メールアドレスの検証が完了していません。メールをご確認ください。',
    UsernameExistsException: 'このメールアドレスは既に登録されています',
    InvalidPasswordException: 'パスワードは8文字以上、大文字・小文字・数字を含む必要があります',
    CodeMismatchException: '検証コードが正しくありません',
    ExpiredCodeException: '検証コードの有効期限が切れています',
    LimitExceededException: '試行回数の上限に達しました。しばらくしてから再度お試しください。',
    InvalidParameterException: '入力内容に誤りがあります',
    TooManyRequestsException: 'リクエストが多すぎます。しばらくしてから再度お試しください。',
  };

  return errorMessages[code] || error.message || '予期しないエラーが発生しました';
};

/**
 * サインアップ（ユーザー登録）
 */
export const cognitoSignup = (data: SignupRequest): Promise<{ user_id: string }> => {
  return new Promise((resolve, reject) => {
    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: data.email }),
      new CognitoUserAttribute({ Name: 'name', Value: data.name }),
      new CognitoUserAttribute({ Name: 'phone_number', Value: data.phone_number }),
      new CognitoUserAttribute({ Name: 'address', Value: data.address }),
    ];

    // カスタム属性（オプション）
    if (data.company_name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: 'custom:company_name', Value: data.company_name })
      );
    }

    userPool.signUp(
      data.email, // username
      data.password,
      attributeList,
      [],
      (err, result) => {
        if (err) {
          reject(new Error(getErrorMessage(err)));
          return;
        }

        if (!result) {
          reject(new Error('ユーザー登録に失敗しました'));
          return;
        }

        resolve({ user_id: result.userSub });
      }
    );
  });
};

/**
 * メール検証
 */
export const cognitoConfirmSignup = (email: string, code: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(new Error(getErrorMessage(err)));
        return;
      }
      resolve();
    });
  });
};

/**
 * 検証コード再送
 */
export const cognitoResendConfirmationCode = (email: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(new Error(getErrorMessage(err)));
        return;
      }
      resolve();
    });
  });
};

/**
 * ログイン
 */
export const cognitoLogin = (data: LoginRequest): Promise<AuthResponse> => {
  return new Promise((resolve, reject) => {
    const authenticationDetails = new AuthenticationDetails({
      Username: data.email,
      Password: data.password,
    });

    const cognitoUser = new CognitoUser({
      Username: data.email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session) => {
        const accessToken = session.getAccessToken().getJwtToken();
        const refreshToken = session.getRefreshToken().getToken();
        const idToken = session.getIdToken();
        const expiresIn = session.getAccessToken().getExpiration();

        // IDトークンからユーザー情報を取得
        const payload = idToken.payload;

        resolve({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
          user: {
            user_id: payload.sub,
            name: payload.name || '',
            email: payload.email || data.email,
            phone_number: payload.phone_number || '',
            company_name: payload['custom:company_name'],
            address: payload.address || '',
            role: (payload['custom:role'] || 'customer') as 'customer' | 'admin' | 'staff',
            studio_id: payload['custom:studio_id'],
            created_at: new Date().toISOString(),
          },
        });
      },
      onFailure: (err) => {
        reject(new Error(getErrorMessage(err)));
      },
      newPasswordRequired: (userAttributes) => {
        // 初回ログイン時のパスワード変更が必要な場合
        reject(new Error('パスワードの変更が必要です'));
      },
    });
  });
};

/**
 * ログアウト
 */
export const cognitoLogout = (): Promise<void> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
};

/**
 * トークンリフレッシュ
 */
export const cognitoRefreshToken = (refreshToken: string): Promise<AuthResponse> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('ユーザーが見つかりません'));
      return;
    }

    const token = new CognitoRefreshToken({ RefreshToken: refreshToken });

    cognitoUser.refreshSession(token, (err, session) => {
      if (err) {
        reject(new Error(getErrorMessage(err)));
        return;
      }

      const accessToken = session.getAccessToken().getJwtToken();
      const newRefreshToken = session.getRefreshToken().getToken();
      const expiresIn = session.getAccessToken().getExpiration();
      const idToken = session.getIdToken();
      const payload = idToken.payload;

      resolve({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
        user: {
          user_id: payload.sub,
          name: payload.name || '',
          email: payload.email || '',
          phone_number: payload.phone_number || '',
          company_name: payload['custom:company_name'],
          address: payload.address || '',
          role: (payload['custom:role'] || 'customer') as 'customer' | 'admin' | 'staff',
          studio_id: payload['custom:studio_id'],
          created_at: new Date().toISOString(),
        },
      });
    });
  });
};

/**
 * パスワードリセット申請
 */
export const cognitoForgotPassword = (email: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve();
      },
      onFailure: (err) => {
        reject(new Error(getErrorMessage(err)));
      },
    });
  });
};

/**
 * パスワードリセット確認
 */
export const cognitoConfirmPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve();
      },
      onFailure: (err) => {
        reject(new Error(getErrorMessage(err)));
      },
    });
  });
};

/**
 * 現在のユーザーを取得
 */
export const cognitoGetCurrentUser = (): CognitoUser | null => {
  return userPool.getCurrentUser();
};

/**
 * セッションを取得
 */
export const cognitoGetSession = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cognitoUser = userPool.getCurrentUser();

    if (!cognitoUser) {
      reject(new Error('ユーザーが見つかりません'));
      return;
    }

    cognitoUser.getSession((err: any, session: any) => {
      if (err) {
        reject(new Error(getErrorMessage(err)));
        return;
      }

      if (!session.isValid()) {
        reject(new Error('セッションが無効です'));
        return;
      }

      resolve(session);
    });
  });
};
