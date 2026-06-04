import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../theme';
import EmbeddedCalendar from '../components/calendar/EmbeddedCalendar';
import type { WidgetConfig } from './types';

// React Query クライアント（SPA の main.tsx と同設定）。
// ウィジェットごとに自前で保持し、ホストには一切依存しない。
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分
    },
  },
});

/**
 * 指定URLへトップウィンドウ遷移する。
 * クロスオリジンで iframe 内に埋め込まれた場合に window.top.location が
 * SecurityError を投げるため、その場合は自ウィンドウの遷移にフォールバックする。
 */
function navigateTop(url: string) {
  try {
    if (window.top) {
      window.top.location.href = url;
      return;
    }
  } catch {
    // クロスオリジン: フォールバック
  }
  window.location.href = url;
}

export interface WidgetRootProps {
  config: WidgetConfig;
}

/**
 * 埋め込みウィジェットの自己完結プロバイダシェル。
 * 自前の Chakra テーマと React Query クライアントで包み、
 * EmbeddedCalendar をゲストモードで描画する。
 */
export default function WidgetRoot({ config }: WidgetRootProps) {
  const { studioId, signupUrl, loginUrl } = config;

  return (
    // resetCSS={false}: ホストページに CSS リセット（preflight）を当てない。
    // disableGlobalStyle: Chakra が body へ font-family/color/background を注入して
    //   ホストの見た目を壊すのを防ぐ。ウィジェット内の各コンポーネントは emotion の
    //   クラス単位でスタイルが当たるため、global を無効化しても描画は変わらない。
    <ChakraProvider theme={theme} resetCSS={false} disableGlobalStyle>
      <QueryClientProvider client={queryClient}>
        <EmbeddedCalendar
          studioId={studioId}
          isAuthenticated={false}
          showChrome={false}
          onNavigateSignup={signupUrl ? () => navigateTop(signupUrl) : undefined}
          onNavigateMyReservations={loginUrl ? () => navigateTop(loginUrl) : undefined}
        />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
