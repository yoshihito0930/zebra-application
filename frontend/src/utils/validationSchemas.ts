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

// プラン作成/更新フォームスキーマ
// API 仕様 (docs/api-design.md POST /plans):
//   - plan_name: 1〜100文字
//   - description: 任意、500文字以内
//   - price: 0以上の整数（税抜）
//   - tax_rate: 0〜1の小数（例: 0.10 = 10%）
//   - display_order: 任意、0以上の整数
export const planSchema = z.object({
  plan_name: z
    .string()
    .min(1, 'プラン名を入力してください')
    .max(100, 'プラン名は100文字以内で入力してください'),
  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional()
    .or(z.literal('')),
  price: z
    .number({ error: '料金を入力してください' })
    .int('料金は整数で入力してください')
    .min(0, '料金は0円以上で入力してください')
    .max(10_000_000, '料金が大きすぎます'),
  tax_rate: z
    .number({ error: '税率を入力してください' })
    .min(0, '税率は0以上で入力してください')
    .max(1, '税率は1以下で入力してください（例: 0.10 = 10%）'),
  display_order: z
    .number({ error: '表示順を入力してください' })
    .int('表示順は整数で入力してください')
    .min(0, '表示順は0以上で入力してください'),
});

export type PlanFormData = z.infer<typeof planSchema>;

// オプション作成/更新フォームスキーマ
// プランと同様だが option_name に変更し description フィールドなし
export const optionSchema = z.object({
  option_name: z
    .string()
    .min(1, 'オプション名を入力してください')
    .max(100, 'オプション名は100文字以内で入力してください'),
  price: z
    .number({ error: '料金を入力してください' })
    .int('料金は整数で入力してください')
    .min(0, '料金は0円以上で入力してください')
    .max(10_000_000, '料金が大きすぎます'),
  tax_rate: z
    .number({ error: '税率を入力してください' })
    .min(0, '税率は0以上で入力してください')
    .max(1, '税率は1以下で入力してください（例: 0.10 = 10%）'),
  display_order: z
    .number({ error: '表示順を入力してください' })
    .int('表示順は整数で入力してください')
    .min(0, '表示順は0以上で入力してください'),
});

export type OptionFormData = z.infer<typeof optionSchema>;
// is_active はフォームでは扱わない（ToggleActiveDialog 経由で PATCH するため）
