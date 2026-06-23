import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Grid,
  HStack,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** 日付トリガー/時刻トリガー共通のボタン見た目（デザイン: 高さ50px・角丸12px） */
const fieldButtonProps = (isOpen: boolean, isInvalid?: boolean) => ({
  width: '100%',
  height: '50px',
  px: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderRadius: '12px',
  borderWidth: '1.5px',
  borderColor: isInvalid ? 'red.400' : isOpen ? 'brand.400' : 'gray.200',
  bg: 'white',
  fontSize: '15px',
  fontWeight: 600,
  color: 'gray.800',
  boxShadow: isOpen ? '0 0 0 3px var(--chakra-colors-brand-100)' : 'none',
  transition: 'border .12s, box-shadow .12s',
  _hover: { borderColor: isInvalid ? 'red.400' : 'brand.300' },
});

const popoverContentSx = {
  border: '1px solid var(--chakra-colors-gray-200)',
  borderRadius: '14px',
  boxShadow: '0 12px 34px rgba(31,48,43,.16)',
  _focus: { boxShadow: '0 12px 34px rgba(31,48,43,.16)' },
};

// ---------------------------------------------------------------------------
// DatePickerField
// ---------------------------------------------------------------------------

interface DatePickerFieldProps {
  /** YYYY-MM-DD 形式の文字列（未選択時は空文字） */
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
}

/** Date を YYYY-MM-DD 文字列へ（ローカルタイムゾーン基準） */
function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DatePickerField({ value, onChange, isInvalid }: DatePickerFieldProps) {
  const { isOpen, onToggle, onClose } = useDisclosure();

  const selected = useMemo(() => (value ? parseISO(value) : null), [value]);

  // 表示中の月（年・0始まり月）。value 変更時はレンダー中に表示月を同期する
  // （effect 内 setState を避けるため、prev-value パターンを使用）。
  const [view, setView] = useState(() => {
    const base = selected ?? new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (selected) {
      setView({ y: selected.getFullYear(), m: selected.getMonth() });
    }
  }

  const weeks = useMemo(() => {
    const { y, m } = view;
    const firstDow = new Date(y, m, 1).getDay();
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(y, m, i - firstDow + 1));
    }
    const out: Date[][] = [];
    for (let i = 0; i < 6; i++) out.push(cells.slice(i * 7, i * 7 + 7));
    return out;
  }, [view]);

  const today = useMemo(() => new Date(), []);

  const prevMonth = () =>
    setView(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const nextMonth = () =>
    setView(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  const pick = (date: Date) => {
    onChange(toDateString(date));
    onClose();
  };

  const goToday = () => {
    pick(today);
  };

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const triggerLabel = selected
    ? format(selected, 'yyyy/MM/dd（E）', { locale: ja })
    : '日付を選択';

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start" closeOnBlur>
      <PopoverTrigger>
        <Box as="button" type="button" onClick={onToggle} {...fieldButtonProps(isOpen, isInvalid)}>
          <HStack spacing="9px">
            <Box as={CalendarIcon} size={17} color="brand.600" />
            <Text as="span" color={selected ? 'gray.800' : 'gray.400'}>
              {triggerLabel}
            </Text>
          </HStack>
          <Box as={ChevronDown} size={16} color="gray.400" />
        </Box>
      </PopoverTrigger>
      <PopoverContent width="360px" maxW="100%" sx={popoverContentSx}>
        <PopoverBody p="14px">
          {/* 月送りヘッダー */}
          <HStack justify="space-between" mb="10px">
            <Button
              aria-label="前の月"
              onClick={prevMonth}
              variant="outline"
              size="sm"
              w="32px"
              h="32px"
              minW="32px"
              p={0}
              borderRadius="9px"
              borderColor="gray.200"
            >
              <Box as={ChevronLeft} size={16} color="gray.600" />
            </Button>
            <Text fontSize="15px" fontWeight={700} color="gray.800">
              {`${view.y}年${view.m + 1}月`}
            </Text>
            <Button
              aria-label="次の月"
              onClick={nextMonth}
              variant="outline"
              size="sm"
              w="32px"
              h="32px"
              minW="32px"
              p={0}
              borderRadius="9px"
              borderColor="gray.200"
            >
              <Box as={ChevronRight} size={16} color="gray.600" />
            </Button>
          </HStack>

          {/* 曜日見出し */}
          <Grid templateColumns="repeat(7, 1fr)" gap="2px" mb="4px">
            {WEEKDAY_LABELS.map((label, i) => (
              <Text
                key={label}
                textAlign="center"
                fontSize="11px"
                fontWeight={700}
                color={i === 0 ? 'accent.500' : i === 6 ? 'blue.500' : 'gray.500'}
              >
                {label}
              </Text>
            ))}
          </Grid>

          {/* 日付セル */}
          {weeks.map((week, wi) => (
            <Grid key={wi} templateColumns="repeat(7, 1fr)" gap="2px">
              {week.map((date, di) => {
                const inMonth = date.getMonth() === view.m;
                const isSelected = !!selected && sameDay(date, selected);
                const isToday = sameDay(date, today);
                const dow = di;

                let color = 'gray.800';
                if (!inMonth) color = 'gray.300';
                else if (dow === 0) color = 'accent.500';
                else if (dow === 6) color = 'blue.500';

                return (
                  <Box
                    as="button"
                    type="button"
                    key={di}
                    onClick={() => pick(date)}
                    h="40px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderRadius="10px"
                    fontSize="14px"
                    fontWeight={isSelected ? 700 : 500}
                    userSelect="none"
                    cursor="pointer"
                    borderWidth="1.5px"
                    borderColor={isToday && !isSelected ? 'brand.200' : 'transparent'}
                    bg={isSelected ? 'brand.600' : 'transparent'}
                    color={isSelected ? 'white' : color}
                    transition="background .12s, border .12s"
                    _hover={{ bg: isSelected ? 'brand.600' : 'brand.50' }}
                  >
                    {date.getDate()}
                  </Box>
                );
              })}
            </Grid>
          ))}

          {/* 今日 */}
          <HStack justify="flex-end" mt="8px">
            <Button
              variant="ghost"
              size="sm"
              color="brand.600"
              fontWeight={700}
              onClick={goToday}
            >
              今日
            </Button>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// TimePickerField
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, '0');

interface TimePickerFieldProps {
  hour: number | null;
  minute: number | null;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
  hourOptions: number[];
  minuteOptions: number[];
  /** その時(hour)が選択不可かどうか */
  isHourDisabled?: (hour: number) => boolean;
  /** その分(minute)が選択不可かどうか */
  isMinuteDisabled?: (minute: number) => boolean;
  /** 翌日扱いの時に「翌 」プレフィックスを返す（無ければ空文字） */
  overnightPrefix?: (hour: number) => string;
  placeholder?: string;
  isInvalid?: boolean;
}

interface TimeRowProps {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

function TimeRow({ label, selected, disabled, onClick }: TimeRowProps) {
  return (
    <Box
      as="button"
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      w="100%"
      px="12px"
      py="10px"
      borderRadius="9px"
      fontSize="15px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      color={disabled ? 'gray.300' : selected ? 'brand.700' : 'gray.800'}
      bg={selected ? 'brand.50' : 'transparent'}
      fontWeight={selected ? 700 : 500}
      sx={{ fontVariantNumeric: 'tabular-nums' }}
      _hover={disabled ? {} : { bg: selected ? 'brand.50' : 'gray.50' }}
    >
      <Text as="span">{label}</Text>
      {selected && <Box as={Check} size={15} color="brand.600" />}
    </Box>
  );
}

export function TimePickerField({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  hourOptions,
  minuteOptions,
  isHourDisabled,
  isMinuteDisabled,
  overnightPrefix,
  placeholder = '時刻を選択',
  isInvalid,
}: TimePickerFieldProps) {
  const { isOpen, onToggle, onClose } = useDisclosure();

  const hasValue = hour !== null && minute !== null;
  const triggerLabel = hasValue ? `${pad2(hour as number)}:${pad2(minute as number)}` : placeholder;

  return (
    <Popover isOpen={isOpen} onClose={onClose} placement="bottom-start" closeOnBlur>
      <PopoverTrigger>
        <Box as="button" type="button" onClick={onToggle} {...fieldButtonProps(isOpen, isInvalid)}>
          <HStack spacing="9px">
            <Box as={Clock} size={17} color="brand.600" />
            <Text
              as="span"
              color={hasValue ? 'gray.800' : 'gray.400'}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {triggerLabel}
            </Text>
          </HStack>
          <Box as={ChevronDown} size={16} color="gray.400" />
        </Box>
      </PopoverTrigger>
      <PopoverContent width="320px" maxW="100%" sx={popoverContentSx}>
        <PopoverBody p="10px">
          <HStack align="stretch" spacing="8px">
            {/* 時 */}
            <Box flex={1}>
              <Text fontSize="11px" fontWeight={700} color="gray.500" px="6px" pt="2px" pb="6px">
                時
              </Text>
              <Box h="200px" overflowY="auto" pr="2px">
                {hourOptions.map((h) => {
                  const disabled = isHourDisabled?.(h) ?? false;
                  const prefix = overnightPrefix?.(h) ?? '';
                  const label = `${prefix}${pad2(h)}${disabled ? ' (予約不可)' : ''}`;
                  return (
                    <TimeRow
                      key={h}
                      label={label}
                      selected={hour === h}
                      disabled={disabled}
                      onClick={() => onHourChange(h)}
                    />
                  );
                })}
              </Box>
            </Box>
            {/* 分 */}
            <Box w="104px">
              <Text fontSize="11px" fontWeight={700} color="gray.500" px="6px" pt="2px" pb="6px">
                分
              </Text>
              {minuteOptions.map((m) => {
                const disabled = isMinuteDisabled?.(m) ?? false;
                const label = `${pad2(m)}${disabled ? ' (不可)' : ''}`;
                return (
                  <TimeRow
                    key={m}
                    label={label}
                    selected={minute === m}
                    disabled={disabled}
                    onClick={() => onMinuteChange(m)}
                  />
                );
              })}
            </Box>
          </HStack>
          <HStack justify="flex-end" borderTopWidth="1px" borderColor="gray.100" mt="8px" pt="8px">
            <Button
              size="sm"
              bg="brand.50"
              color="brand.700"
              fontWeight={700}
              borderRadius="9px"
              _hover={{ bg: 'brand.100' }}
              onClick={onClose}
            >
              完了
            </Button>
          </HStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
