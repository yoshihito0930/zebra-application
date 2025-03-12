# データモデリング エンティティ
### User（ユーザー）テーブル
| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | ユーザーID（主キー） |
| name | VARCHAR(100) | 名前 |
| email | VARCHAR(255) | メールアドレス（ユニーク） |
| password_hash | VARCHAR(255) | ハッシュ化したパスワード |
| phone_number | VARCHAR(20) | 電話番号 |
| company_name | VARCHAR(255) | 会社名 |
| address | VARCHAR(255) | 住所 |
| role | ENUM('user', 'admin') | 権限（一般ユーザー or 管理者） |

### Calendar（カレンダー）テーブル
| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | カレンダーID（主キー） |
| date | DATE | 予約可能日 |
| start_time | TIME | その日の利用開始時間 |
| end_time | TIME | その日の利用終了時間 |
| is_available | BOOLEAN | その時間帯が予約可能かどうか |

### Reservation（予約）テーブル
| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| id | UUID (PK) | 予約ID（主キー） |
| user_id | UUID (FK → User.id) | 予約したユーザー（外部キー） |
| start_time | TIMESTAMP | 予約開始日時 |
| end_time | TIMESTAMP | 予約終了日時 |
| status | ENUM('pending', 'confirmed', 'canceled') | 予約の状態（申請中、確定、キャンセル済み） |
| reservation_type | ENUM('tentative', 'confirmed', 'second_hold', 'location_scout') | 予約の種類（仮予約、本予約、第二キープ、ロケハン） |
| needs_protection | BOOLEAN | 養生の有無 |
| number_of_people | INT | 撮影人数 |
| plan_type | ENUM('A', 'B') | 利用プラン |
| equipment_insurance | BOOLEAN | 機材保険の有無 |
| options | JSONB | オプション（例: 6人以上のワークショップ、ラメなどの小道具） |
| shooting_type | ENUM('stills', 'video', 'music') | 撮影内容（スチール、ムービー、楽器演奏など） |
| shooting_details | TEXT | 撮影の詳細説明 |
| photographer_name | VARCHAR(100) | カメラマン氏名（Userテーブルとは独立した、予約ごとの情報） |