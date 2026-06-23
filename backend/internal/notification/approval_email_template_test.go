package notification

import (
	"strings"
	"testing"
	"time"

	"github.com/yoshihito0930/zebra-application/internal/domain/entity"
)

// completeReservation は欠損のない予約を返すヘルパー
func completeReservation() *entity.Reservation {
	return &entity.Reservation{
		ReservationID:   "res-123",
		ReservationType: entity.ReservationTypeRegular,
		Status:          entity.ReservationStatusConfirmed,
		PlanName:        "スタンダードプラン",
		Date:            time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC),
		StartTime:       "10:00",
		EndTime:         "18:00",
		ShootingType:    []string{"stills"},
		NumberOfPeople:  3,
	}
}

func TestBuildApprovalEmailBody_Complete(t *testing.T) {
	r := completeReservation()
	subject, body, missing := BuildApprovalEmailBody(r, "山田太郎")

	if len(missing) != 0 {
		t.Errorf("欠損変数は無いはずだが missing=%v", missing)
	}
	if subject != approvalEmailSubject {
		t.Errorf("件名が想定外: %q", subject)
	}
	// 主要な値が本文に展開されていること
	for _, want := range []string{"山田太郎", "res-123", "2026年07月01日", "10:00 - 18:00", "スタンダードプラン", "スチール撮影", "3名"} {
		if !strings.Contains(body, want) {
			t.Errorf("本文に %q が含まれていない\n本文:\n%s", want, body)
		}
	}
	// 未展開プレースホルダのマーカーが残っていないこと
	if strings.Contains(body, "%!") {
		t.Errorf("本文に未展開マーカーが残っている:\n%s", body)
	}
}

func TestBuildApprovalEmailBody_MissingVariables(t *testing.T) {
	tests := []struct {
		name     string
		mutate   func(*entity.Reservation)
		wantMiss string
	}{
		{"宛名欠損", func(r *entity.Reservation) {}, "宛名"}, // recipientName を空で渡す
		{"利用日欠損", func(r *entity.Reservation) { r.Date = time.Time{} }, "利用日"},
		{"利用時間欠損", func(r *entity.Reservation) { r.StartTime = "" }, "利用時間"},
		{"プラン名欠損", func(r *entity.Reservation) { r.PlanName = "" }, "プラン名"},
		{"撮影タイプ欠損", func(r *entity.Reservation) { r.ShootingType = nil }, "撮影タイプ"},
		{"撮影人数欠損", func(r *entity.Reservation) { r.NumberOfPeople = 0 }, "撮影人数"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := completeReservation()
			tt.mutate(r)
			name := "山田太郎"
			if tt.name == "宛名欠損" {
				name = "   " // 空白のみ → 欠損扱い
			}
			_, _, missing := BuildApprovalEmailBody(r, name)
			found := false
			for _, m := range missing {
				if m == tt.wantMiss {
					found = true
				}
			}
			if !found {
				t.Errorf("欠損 %q が検出されなかった。missing=%v", tt.wantMiss, missing)
			}
		})
	}
}
