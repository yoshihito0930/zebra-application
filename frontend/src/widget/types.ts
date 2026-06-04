/**
 * 埋め込みウィジェットの設定。
 * ホスト側の data-* 属性から readConfig() で生成される。
 */
export interface WidgetConfig {
  /** 対象スタジオID（必須） */
  studioId: string;
  /** バックエンドAPIのベースURL（必須） */
  apiBaseUrl: string;
  /** 「ログイン/マイ予約」リンクの遷移先（任意・未指定ならリンク非表示） */
  loginUrl?: string;
  /** 「会員登録」リンクの遷移先（任意・未指定ならリンク非表示） */
  signupUrl?: string;
}

/**
 * マウント対象要素の data-* 属性から WidgetConfig を読み取る。
 * 必須属性（studio-id / api-base-url）が欠落している場合は warn して null を返し、
 * 呼び出し側でマウントをスキップさせる。
 */
export function readConfig(el: HTMLElement): WidgetConfig | null {
  const studioId = el.dataset.studioId?.trim();
  const apiBaseUrl = el.dataset.apiBaseUrl?.trim();
  const loginUrl = el.dataset.loginUrl?.trim() || undefined;
  const signupUrl = el.dataset.signupUrl?.trim() || undefined;

  if (!studioId) {
    console.error(
      '[ZebraReservationWidget] data-studio-id が指定されていません。マウントをスキップします。',
      el,
    );
    return null;
  }
  if (!apiBaseUrl) {
    console.error(
      '[ZebraReservationWidget] data-api-base-url が指定されていません。マウントをスキップします。',
      el,
    );
    return null;
  }

  return { studioId, apiBaseUrl, loginUrl, signupUrl };
}
