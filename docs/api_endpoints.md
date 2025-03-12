# APIエンドポイント
## HTTPメソッドの決定と役割の定義
- GET: リソースの取得
- POST: 新規作成
- PUT: リソースの更新（変更依頼の反映など）
- DELETE: リソースの削除（予約のキャンセル依頼に対応）

## 各リソースに対して必要な操作（CRUD）を定義
- ユーザー向け操作：  
	予約カレンダーの確認、予約の申し込み、変更依頼、削除依頼
- 管理者向け操作：  
	予約の承認（仮予約、本予約、変更、削除）、予約カレンダーの編集、

## URI
### calendar :
- GET /calendar  
	説明：カレンダー情報を取得
	クエリパラメータ：date
### reservation : 
- GET /reservations  
	説明：ユーザーの予約一覧を取得  
	クエリパラメータ：status, reservation_type(tentative、confirmed、second_hold、location_scout)  
- POST /reservations  
	説明：新規予約の申し込み  
	リクエストボディにて、予約タイプ(tentative、confirmed、second_hold、location_scout)を指定。  
- PUT /reservations/{id}  
	説明：予約変更依頼  
- DELETE /reservations/{id}  
	説明：予約削除依頼  
- GET /admin/reservations  
	説明：全予約の一覧（フィルタリング可能にする）  
	クエリパラメータ：month, date, reservation_type(tentative、confirmed、second_hold、location_scout), sort, page, limit  
- GET /admin/reservations/{id}  
	説明：特定の予約情報を取得  
- PUT /admin/reservations/{id}/approve  
	説明：予約承認（予約内容をカレンダーに反映）  
### user : 
- GET /admin/users/{id}  
	説明：特定ユーザの情報を取得  
- POST /users  
	説明：新規ユーザ登録  
- POST /auth/login  
	説明：ログイン（認証情報をリクエストボディで送信）  

※/admin*には適切な認証認可が必要。