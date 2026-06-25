import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WidgetRoot from './WidgetRoot';
import { readConfig } from './types';
import { setApiBaseUrl, setEmbeddedMode } from '../services/api';

// amazon-cognito-identity-js は埋め込みツリーには含まれないが、将来の
// transitive 混入に備え防御的に Buffer ポリフィルを導入しておく（コストほぼゼロ）。
import { Buffer } from 'buffer';
(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

const MOUNT_SELECTOR = '#zebra-reservation, [data-zebra-reservation]';
const MOUNTED_ATTR = 'data-zebra-mounted';

function mountInto(el: HTMLElement) {
  // 二重マウント防止（Astro の view transitions / 再実行対策）
  if (el.getAttribute(MOUNTED_ATTR) === 'true') {
    return;
  }

  const config = readConfig(el);
  if (!config) {
    return; // 必須属性が欠落: readConfig 内で warn 済み
  }

  // 描画前に axios のベースURLと埋め込みモードを確定させる。
  // React Query のフェッチはマウント後（effect 内）に走るため、ここで同期設定すれば順序は安全。
  setApiBaseUrl(config.apiBaseUrl);
  setEmbeddedMode(true);

  el.setAttribute(MOUNTED_ATTR, 'true');

  // Shadow DOM で隔離する。ホストページのグローバル CSS（footer{background}、
  // header{z-index}、* リセット等）がウィジェット内部へカスケード侵入するのを
  // 構造的に遮断する。mode:'open' は将来のデバッグ/検証で shadow を辿れるように。
  // attachShadow は二重呼び出しで例外を投げるため el.shadowRoot で再利用する。
  const shadow = el.shadowRoot ?? el.attachShadow({ mode: 'open' });

  // Emotion/Chakra はここに <style> を注入する（document.head ではなく shadow 内）。
  const styleHost = document.createElement('div');
  styleHost.setAttribute('data-zebra-styles', '');
  // React アプリ本体と、Modal/Toast の Portal がここに描画される。
  const appRoot = document.createElement('div');
  appRoot.setAttribute('data-zebra-app', '');
  shadow.append(styleHost, appRoot);

  createRoot(appRoot).render(
    <StrictMode>
      <WidgetRoot config={config} styleHost={styleHost} portalContainer={appRoot} />
    </StrictMode>,
  );
}

function mountAll() {
  const targets = document.querySelectorAll<HTMLElement>(MOUNT_SELECTOR);
  targets.forEach(mountInto);
}

// defer スクリプトは DOM パース後に実行されるが、念のため readyState を確認する。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountAll, { once: true });
} else {
  mountAll();
}
