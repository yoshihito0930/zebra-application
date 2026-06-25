import { createContext, useContext } from 'react';
import type { RefObject } from 'react';

/**
 * 埋め込みウィジェットの Portal コンテナを配る context。
 *
 * ウィジェットは Shadow DOM 内にマウントされるが、Chakra の Modal / Toast は
 * 既定で `document.body`（= shadow の外＝ホスト light DOM）へ Portal する。
 * それだとホストの CSS 隔離が効かないため、shadow root 内の要素を指す
 * `RefObject` を配り、各 Modal の `portalProps={{ containerRef }}` /
 * ChakraProvider の `toastOptions.portalProps.containerRef` に渡す。
 *
 * 既定値は `undefined`。SPA はこの Provider で包まれないため undefined を受け取り、
 * Chakra 既定の `document.body` Portal にフォールバックする（挙動不変）。
 */
export type WidgetPortalContextValue = RefObject<HTMLElement | null> | undefined;

const WidgetPortalContext = createContext<WidgetPortalContextValue>(undefined);

export const WidgetPortalProvider = WidgetPortalContext.Provider;

/** Portal 用の containerRef を返す。ウィジェット外（SPA）では undefined。 */
export function useWidgetPortalRef(): WidgetPortalContextValue {
  return useContext(WidgetPortalContext);
}
