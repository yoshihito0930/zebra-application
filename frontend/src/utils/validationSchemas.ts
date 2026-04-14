import { z } from 'zod';

// ログインフォームスキーマ
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// サインアップフォームスキーマ
export const signupSchema = z.object({
  name: z
    .string()
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'パスワードは大文字、小文字、数字を含む必要があります'
    ),
  confirmPassword: z.string().min(1, 'パスワード（確認）を入力してください'),
  phone_number: z
    .string()
  .min(1, '電話番号を入力してください')
    .regex(/^0\d{1,4}-?\d{1,4}-?\d{4}$/, '有効な電話番号を入力してください'),
  company_name: z.string().optional(),
  address: z
    .string()
    .min(1, '住所を入力してください')
    .max(200, '住所は200文字以内で入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupSchema>;
