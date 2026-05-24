import { IconButton } from '@chakra-ui/react';
import { Plus } from 'lucide-react';

interface AdminMobileFabProps {
  onClick: () => void;
  label?: string;
}

export default function AdminMobileFab({ onClick, label = '予約を追加' }: AdminMobileFabProps) {
  return (
    <IconButton
      aria-label={label}
      icon={<Plus size={24} />}
      onClick={onClick}
      position="fixed"
      right={4}
      bottom={`calc(env(safe-area-inset-bottom) + 80px)`}
      zIndex={18}
      w="56px"
      h="56px"
      minW="56px"
      borderRadius="full"
      colorScheme="brand"
      shadow="lg"
      display={{ base: 'inline-flex', md: 'none' }}
    />
  );
}
