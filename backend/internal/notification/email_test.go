package notification

import "testing"

func TestFormatShootingTypes(t *testing.T) {
	tests := []struct {
		name  string
		types []string
		want  string
	}{
		{
			name:  "空配列は未指定",
			types: []string{},
			want:  "未指定",
		},
		{
			name:  "nilは未指定",
			types: nil,
			want:  "未指定",
		},
		{
			name:  "単一の既知の値を日本語化",
			types: []string{"stills"},
			want:  "スチール撮影",
		},
		{
			name:  "複数の既知の値を日本語化して結合",
			types: []string{"stills", "video"},
			want:  "スチール撮影、ムービー撮影",
		},
		{
			name:  "楽器演奏の制限ありラベル",
			types: []string{"music_with_restrictions"},
			want:  "楽器の演奏を伴う撮影(制限あり)",
		},
		{
			name:  "未知の値はそのまま出力",
			types: []string{"unknown_type"},
			want:  "unknown_type",
		},
		{
			name:  "既知と未知の混在",
			types: []string{"stills", "unknown_type"},
			want:  "スチール撮影、unknown_type",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := formatShootingTypes(tt.types); got != tt.want {
				t.Errorf("formatShootingTypes(%v) = %q, want %q", tt.types, got, tt.want)
			}
		})
	}
}

func TestFormatYesNo(t *testing.T) {
	if got := formatYesNo(true); got != "あり" {
		t.Errorf("formatYesNo(true) = %q, want %q", got, "あり")
	}
	if got := formatYesNo(false); got != "なし" {
		t.Errorf("formatYesNo(false) = %q, want %q", got, "なし")
	}
}
