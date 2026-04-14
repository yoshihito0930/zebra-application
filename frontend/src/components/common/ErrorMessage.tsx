import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  CloseButton,
  VStack,
} from '@chakra-ui/react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onClose?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

export default function ErrorMessage({
  title,
  message,
  onClose,
  variant = 'error',
}: ErrorMessageProps) {
  const statusMap = {
    error: 'error' as const,
    warning: 'warning' as const,
    info: 'info' as const,
  };

  return (
    <Alert
      status={statusMap[variant]}
      variant="subtle"
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="center"
      textAlign="left"
      borderRadius="md"
      px={4}
      py={3}
      position="relative"
    >
      <VStack align="flex-start" spacing={1} w="full">
        <Box display="flex" alignItems="center">
          <AlertIcon as={AlertCircle} />
          {title && <AlertTitle mr={2}>{title}</AlertTitle>}
          {onClose && (
            <CloseButton
              position="absolute"
              right={2}
              top={2}
              onClick={onClose}
            />
          )}
        </Box>
        <AlertDescription ml={6}>{message}</AlertDescription>
      </VStack>
    </Alert>
  );
}
