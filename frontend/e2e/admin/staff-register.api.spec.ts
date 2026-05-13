import { test } from '../fixtures/auth';

// ADMIN-501..503 はバックエンドの POST /staff, GET /staff が未実装のため全件 SKIP。
// `backend/cmd/` に staff-create / staff-list Lambda が存在せず、
// `terraform/modules/api-gateway/main.tf` にも /staff リソースが定義されていない。
// Bug 10 として e2e-test-plan.md §4.7 に記録。

test.describe('4.6 スタッフ登録 (UC-201)', () => {
  test.skip('ADMIN-501: 管理者がスタッフユーザーを登録できる', async () => {
    // POST /staff endpoint 未実装 (Bug 10)
  });

  test.skip('ADMIN-502: スタッフ一覧を取得できる', async () => {
    // GET /staff endpoint 未実装 (Bug 10)
  });

  test.skip('ADMIN-503: 他スタジオのスタッフを登録しようとする', async () => {
    // POST /staff endpoint 未実装 (Bug 10)
  });
});
