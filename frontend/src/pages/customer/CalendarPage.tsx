import EmbeddedCalendar from '../../components/calendar/EmbeddedCalendar';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

/**
 * 公開予約カレンダーページ。
 * 会員/ゲストの区別を撤廃し、ログイン不要で誰でもカレンダー確認・予約ができる。
 * 描画本体は EmbeddedCalendar に集約。会員導線（マイ予約・会員登録）は渡さない。
 */
export default function CalendarPage() {
  return <EmbeddedCalendar studioId={STUDIO_ID} showChrome />;
}
