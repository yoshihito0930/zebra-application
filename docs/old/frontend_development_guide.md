# フロントエンド開発ガイド

## 初期設定手順

### 1. 依存関係のインストール

選定した技術スタックに基づいて、以下のパッケージをインストールします：

```bash
# コア依存関係
npm install zustand @tanstack/react-query

# UIライブラリ
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
npm install @headlessui/react @heroicons/react
npm install framer-motion react-toastify

# フォームとバリデーション
npm install react-hook-form zod @hookform/resolvers

# その他のユーティリティ
npm install next-auth next-intl
npm install recharts
npm install date-fns
```

### 2. Tailwind CSSの設定

Tailwind CSSの設定ファイルをカスタマイズして、アプリケーション全体で一貫したデザインシステムを実現します：

```js
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        secondary: {
          // セカンダリカラーの定義
        },
        // 予約状態を表す色
        reservation: {
          tentative: '#FCD34D',  // 仮予約：黄色
          confirmed: '#34D399',  // 確定予約：緑色
          second_hold: '#60A5FA', // 第二キープ：青色
          location_scout: '#A78BFA', // ロケハン：紫色
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        heading: ['Noto Sans JP', 'sans-serif'],
      },
      spacing: {
        // カスタムスペーシング
      },
      borderRadius: {
        // カスタム角丸
      },
      boxShadow: {
        // カスタムシャドウ
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

### 3. APIクライアントの設定

```typescript
// src/api/client.ts
import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラー時の処理
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 4. 状態管理の設定

```typescript
// src/store/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

```typescript
// src/store/reservations.ts
import { create } from 'zustand';
import { Reservation } from '../types/models';

interface ReservationsState {
  reservations: Reservation[];
  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, data: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;
}

export const useReservationsStore = create<ReservationsState>((set) => ({
  reservations: [],
  setReservations: (reservations) => set({ reservations }),
  addReservation: (reservation) => 
    set((state) => ({ 
      reservations: [...state.reservations, reservation] 
    })),
  updateReservation: (id, data) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    })),
  removeReservation: (id) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.id !== id),
    })),
}));
```

## コンポーネント開発ガイドライン

### コンポーネント構造

```tsx
// src/components/common/Button.tsx
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50',
        secondary: 'bg-secondary-600 text-white hover:bg-secondary-700',
        ghost: 'hover:bg-primary-50 hover:text-primary-600',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-8 px-3 rounded-md',
        lg: 'h-12 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

### フォームコンポーネント例

```tsx
// src/components/reservations/ReservationForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { TimePicker } from '../common/TimePicker';

// バリデーションスキーマ
const reservationSchema = z.object({
  date: z.date({
    required_error: "日付を選択してください",
  }),
  start_time: z.string().min(1, "開始時刻を入力してください"),
  end_time: z.string().min(1, "終了時刻を入力してください"),
  reservation_type: z.enum(['tentative', 'confirmed', 'second_hold', 'location_scout'], {
    required_error: "予約タイプを選択してください",
  }),
  needs_protection: z.boolean().default(false),
  number_of_people: z.number().min(1, "人数を入力してください"),
  plan_type: z.enum(['A', 'B'], {
    required_error: "プランを選択してください",
  }),
  equipment_insurance: z.boolean().default(false),
  shooting_type: z.enum(['stills', 'video', 'music'], {
    required_error: "撮影内容を選択してください",
  }),
  shooting_details: z.string().optional(),
  photographer_name: z.string().min(1, "カメラマン名を入力してください"),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

interface ReservationFormProps {
  onSubmit: (data: ReservationFormData) => void;
  initialData?: Partial<ReservationFormData>;
  isLoading?: boolean;
}

export function ReservationForm({ onSubmit, initialData = {}, isLoading = false }: ReservationFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      date: initialData.date || new Date(),
      start_time: initialData.start_time || '',
      end_time: initialData.end_time || '',
      reservation_type: initialData.reservation_type || 'tentative',
      needs_protection: initialData.needs_protection || false,
      number_of_people: initialData.number_of_people || 1,
      plan_type: initialData.plan_type || 'A',
      equipment_insurance: initialData.equipment_insurance || false,
      shooting_type: initialData.shooting_type || 'stills',
      shooting_details: initialData.shooting_details || '',
      photographer_name: initialData.photographer_name || '',
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            予約日
          </label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <DatePicker
                selected={field.value}
                onChange={field.onChange}
                className="w-full"
              />
            )}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* 他のフォームフィールド */}
        {/* ... */}
        
        <div className="col-span-1 md:col-span-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? '送信中...' : '予約を申し込む'}
          </Button>
        </div>
      </div>
    </form>
  );
}
```

## ページ開発例

### カレンダーページの例

```tsx
// src/app/calendar/page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar } from '@/components/calendar/Calendar';
import { ReservationDetail } from '@/components/reservations/ReservationDetail';
import { fetchCalendarData } from '@/api/calendar';
import { Spinner } from '@/components/common/Spinner';

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  // カレンダーデータの取得
  const { data: calendarData, isLoading, error } = useQuery({
    queryKey: ['calendar', format(selectedDate, 'yyyy-MM')],
    queryFn: () => fetchCalendarData(format(selectedDate, 'yyyy-MM')),
  });

  // 日付選択ハンドラー
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedReservationId(null);
  };

  // 予約選択ハンドラー
  const handleReservationClick = (reservationId: string) => {
    setSelectedReservationId(reservationId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 text-center">
        カレンダーデータの読み込みに失敗しました。再度お試しください。
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">予約カレンダー</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Calendar
            events={calendarData?.events || []}
            onDateClick={handleDateClick}
            onEventClick={handleReservationClick}
            selectedDate={selectedDate}
          />
        </div>
        
        <div>
          <div className="sticky top-24 bg-white p-4 rounded-lg border shadow-sm">
            <h2 className="text-lg font-medium mb-4">
              {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
            </h2>
            
            {selectedReservationId ? (
              <ReservationDetail id={selectedReservationId} />
            ) : (
              <div className="text-sm text-gray-500">
                予約を選択すると詳細が表示されます
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## APIフック開発例

```typescript
// src/hooks/useReservations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { 
  fetchReservations, 
  fetchReservationById,
  createReservation,
  updateReservation,
  deleteReservation 
} from '@/api/reservations';
import { useReservationsStore } from '@/store/reservations';
import type { Reservation, CreateReservationData, UpdateReservationData } from '@/types/models';

export function useReservations(filters?: Record<string, any>) {
  const setReservations = useReservationsStore(state => state.setReservations);
  
  return useQuery({
    queryKey: ['reservations', filters],
    queryFn: () => fetchReservations(filters),
    onSuccess: (data) => {
      setReservations(data);
    }
  });
}

export function useReservation(id?: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservationById(id!),
    enabled: !!id,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const addReservation = useReservationsStore(state => state.addReservation);
  
  return useMutation({
    mutationFn: (data: CreateReservationData) => createReservation(data),
    onSuccess: (newReservation) => {
      addReservation(newReservation);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('予約が申し込まれました');
    },
    onError: () => {
      toast.error('予約の申し込みに失敗しました');
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  const updateReservationInStore = useReservationsStore(state => state.updateReservation);
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReservationData }) => 
      updateReservation(id, data),
    onSuccess: (updatedReservation) => {
      updateReservationInStore(updatedReservation.id, updatedReservation);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', updatedReservation.id] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('予約が更新されました');
    },
    onError: () => {
      toast.error('予約の更新に失敗しました');
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  const removeReservation = useReservationsStore(state => state.removeReservation);
  
  return useMutation({
    mutationFn: (id: string) => deleteReservation(id),
    onSuccess: (_, id) => {
      removeReservation(id);
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('予約がキャンセルされました');
    },
    onError: () => {
      toast.error('予約のキャンセルに失敗しました');
    },
  });
}
```

## グローバル設定とセットアップ

### React Queryのセットアップ

```tsx
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1分
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer position="top-right" autoClose={3000} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### レイアウトへの適用

```tsx
// src/app/layout.tsx
import './globals.css';
import { Noto_Sans_JP } from 'next/font/google';
import Providers from './providers';

const notoSansJp = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
});

export const metadata = {
  title: 'スタジオゼブラ - 撮影スタジオ予約システム',
  description: 'スタジオゼブラの予約管理システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="min-h-screen bg-gray-50">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## ユーティリティ関数

```typescript
// src/lib/date-utils.ts
import {
  format,
  parse,
  isValid,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';

// 日付をフォーマット (例: 2023年5月15日)
export const formatDate = (date: Date): string => {
  if (!isValid(date)) return '';
  return format(date, 'yyyy年M月d日', { locale: ja });
};

// 時刻をフォーマット (例: 14:30)
export const formatTime = (date: Date): string => {
  if (!isValid(date)) return '';
  return format(date, 'HH:mm');
};

// 日付と時刻を結合してDateオブジェクトに変換
export const combineDateAndTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes);
  return result;
};

// 月の日付範囲を取得
export const getMonthDateRange = (date: Date) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return { start, end };
};

// 週の日付範囲を取得
export const getWeekDateRange = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // 月曜始まり
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return { start, end };
};

// 日付範囲の全日付を配列で取得
export const getDaysInRange = (start: Date, end: Date) => {
  return eachDayOfInterval({ start, end });
};

// 時間枠を生成 (例: 10:00, 10:30, 11:00, ...)
export const generateTimeSlots = (
  startHour: number,
  endHour: number,
  intervalMinutes: number
): string[] => {
  const slots: string[] = [];
  const totalMinutesInDay = endHour * 60;
  let currentMinutes = startHour * 60;

  while (currentMinutes < totalMinutesInDay) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
    currentMinutes += intervalMinutes;
  }

  return slots;
};
```

## API実装例

```typescript
// src/api/reservations.ts
import apiClient from './client';
import type { Reservation, CreateReservationData, UpdateReservationData } from '@/types/models';

// 予約一覧を取得
export const fetchReservations = async (params?: Record<string, any>): Promise<Reservation[]> => {
  const { data } = await apiClient.get('/reservations', { params });
  return data;
};

// 特定の予約を取得
export const fetchReservationById = async (id: string): Promise<Reservation> => {
  const { data } = await apiClient.get(`/reservations/${id}`);
  return data;
};

// 新規予約作成
export const createReservation = async (reservationData: CreateReservationData): Promise<Reservation> => {
  const { data } = await apiClient.post('/reservations', reservationData);
  return data;
};

// 予約更新
export const updateReservation = async (id: string, reservationData: UpdateReservationData): Promise<Reservation> => {
  const { data } = await apiClient.put(`/reservations/${id}`, reservationData);
  return data;
};

// 予約削除
export const deleteReservation = async (id: string): Promise<void> => {
  await apiClient.delete(`/reservations/${id}`);
};
```

## テスト例

```typescript
// src/components/common/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default styling', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600');
  });
  
  it('applies variant styles correctly', () => {
    render(<Button variant="outline">Outline Button</Button>);
    
    const button = screen.getByRole('button', { name: /outline button/i });
    expect(button).toHaveClass('border-primary-600');
    expect(button).not.toHaveClass('bg-primary-600');
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });
});
