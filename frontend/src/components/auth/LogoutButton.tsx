import { Button, useToast, IconButton, Tooltip } from '@chakra-ui/react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface LogoutButtonProps {
  variant?: 'button' | 'iconButton';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ログアウトボタンコンポーネント
 */
export default function LogoutButton({ variant = 'button', size = 'md' }: LogoutButtonProps) {
  const { logout, isLoading } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'ログアウトしました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'ログアウトに失敗しました',
        description: error instanceof Error ? error.message : '予期しないエラーが発生しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (variant === 'iconButton') {
    return (
      <Tooltip label="ログアウト" placement="bottom">
        <IconButton
          aria-label="ログアウト"
          icon={<LogOut size={20} />}
          onClick={handleLogout}
          isLoading={isLoading}
          size={size}
          variant="ghost"
          colorScheme="gray"
        />
      </Tooltip>
    );
  }

  return (
    <Button
      leftIcon={<LogOut size={18} />}
      onClick={handleLogout}
      isLoading={isLoading}
      loadingText="ログアウト中..."
      size={size}
      variant="ghost"
      colorScheme="gray"
    >
      ログアウト
    </Button>
  );
}
