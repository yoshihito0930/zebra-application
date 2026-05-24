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
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
      'パスワードは大文字、小文字、数字、記号を含む必要があります'
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

// プロフィール更新フォームスキーマ
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
  phone_number: z
    .string()
    .min(1, '電話番号を入力してください')
    .regex(/^0\d{1,4}-?\d{1,4}-?\d{4}$/, '有効な電話番号を入力してください'),
  company_name: z.string().max(200, '会社名は200文字以内で入力してください').optional(),
  address: z
    .string()
    .max(200, '住所は200文字以内で入力してください')
    .optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

// パスワード変更フォームスキーマ
export const changePasswordSchema = z.object({
  current_password: z
    .string()
    .min(1, '現在のパスワードを入力してください'),
  new_password: z
    .string()
    .min(8, '新しいパスワードは8文字以上で入力してください')
    .max(100, '新しいパスワードは100文字以内で入力してください')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/,
      'パスワードは大文字、小文字、数字、記号を含む必要があります'
    ),
  confirm_password: z.string().min(1, 'パスワード（確認）を入力してください'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'パスワードが一致しません',
  path: ['confirm_password'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// ブロック枠作成フォームスキーマ
// API 仕様 (docs/api-design.md):
//   - date: YYYY-MM-DD、今日以降
//   - is_all_day=false の場合 start_time/end_time は HH:MM 必須、end > start
//   - reason: 1〜200文字
const HHMM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const todayYMD = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const blockedSlotSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '日付を選択してください')
      .refine((d) => d >= todayYMD(), '今日以降の日付を指定してください'),
    is_all_day: z.boolean(),
    start_time: z
      .string()
      .regex(HHMM_REGEX, 'HH:MM形式で入力してください')
      .optional()
      .or(z.literal('')),
    end_time: z
      .string()
      .regex(HHMM_REGEX, 'HH:MM形式で入力してください')
      .optional()
      .or(z.literal('')),
    reason: z
      .string()
      .min(1, '理由を入力してください')
      .max(200, '理由は200文字以内で入力してください'),
  })
  .superRefine((val, ctx) => {
    if (val.is_all_day) return;
    if (!val.start_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['start_time'],
        message: '開始時刻を入力してください',
      });
    }
    if (!val.end_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: '終了時刻を入力してください',
      });
    }
    if (val.start_time && val.end_time && val.end_time <= val.start_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: '終了時刻は開始時刻より後にしてください',
      });
    }
  });

export type BlockedSlotFormData = z.infer<typeof blockedSlotSchema>;
