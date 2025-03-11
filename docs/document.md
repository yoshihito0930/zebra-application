# データモデリング エンティティ
## User（ユーザー）テーブル
カラム名	データ型	説明
id	UUID (PK)	ユーザーID（主キー）
name	VARCHAR(100)	名前
email	VARCHAR(255)	メールアドレス（ユニーク）
password_hash	VARCHAR(255)	ハッシュ化したパスワード
phone_number	VARCHAR(20)	電話番号
company_name	VARCHAR(255)	会社名
address	VARCHAR(255)	住所
role	ENUM('user', 'admin')	権限（一般ユーザー or 管理者）

