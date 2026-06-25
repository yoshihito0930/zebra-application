import { useMemo, useRef } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../theme';
import EmbeddedCalendar from '../components/calendar/EmbeddedCalendar';
import { WidgetPortalProvider } from './WidgetPortalContext';
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
  /** Emotion/Chakra のスタイル注入先（shadow root 内の要素）。 */
  styleHost: HTMLElement;
  /** Modal/Toast の Portal 描画先（shadow root 内の要素）。 */
  portalContainer: HTMLElement;
}

/**
 * 埋め込みウィジェットの自己完結プロバイダシェル。
 * Shadow DOM 内にマウントされ、ホストページの CSS から完全に隔離される。
 * 自前の Chakra テーマと React Query クライアントで包み、
 * EmbeddedCalendar をゲストモードで描画する。
 */
export default function WidgetRoot({ config, styleHost, portalContainer }: WidgetRootProps) {
  const { studioId, signupUrl, loginUrl } = config;

  // Emotion のスタイルを shadow root 内（styleHost）へ注入する。
  // 既定では document.head に注入され shadow 内には届かないため必須。
  const cache = useMemo(
    () => createCache({ key: 'zebra', container: styleHost }),
    [styleHost],
  );

  // shadow root 内の Portal コンテナを指す安定した RefObject。
  // 要素そのものを {current} に持たせれば React.RefObject を満たす。
  const portalRef = useRef<HTMLElement | null>(portalContainer);
  portalRef.current = portalContainer;

  return (
    <CacheProvider value={cache}>
      {/*
        Shadow DOM で隔離済みのため resetCSS を再有効化する。CSSReset は cache の
        container 経由で shadow root 内に注入され、:host とその subtree のみに当たる
        （ホストページには届かない）。これでチェックボックス/ラジオの枠線・
        svg{display:block}・ホスト由来の footer/header 汚染がすべて native に解消する。
        toastOptions.portalProps.containerRef で全トーストも shadow 内へ向ける。
      */}
      <ChakraProvider
        theme={theme}
        resetCSS
        toastOptions={{ portalProps: { containerRef: portalRef } }}
      >
        <WidgetPortalProvider value={portalRef}>
          <QueryClientProvider client={queryClient}>
            <EmbeddedCalendar
              studioId={studioId}
              isAuthenticated={false}
              showChrome={false}
              onNavigateSignup={signupUrl ? () => navigateTop(signupUrl) : undefined}
              onNavigateMyReservations={loginUrl ? () => navigateTop(loginUrl) : undefined}
            />
          </QueryClientProvider>
        </WidgetPortalProvider>
      </ChakraProvider>
    </CacheProvider>
  );
}
