import { Flex, Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  message = '読み込み中...',
  size = 'lg',
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <VStack spacing={4}>
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="brand.300"
        size={size}
      />
      {message && (
        <Text fontSize="sm" color="gray.600">
          {message}
        </Text>
      )}
    </VStack>
  );

  if (fullScreen) {
    return (
      <Flex
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="rgba(255, 255, 255, 0.9)"
        zIndex={9999}
        align="center"
        justify="center"
      >
        {content}
      </Flex>
    );
  }

  return (
    <Flex w="full" py={8} align="center" justify="center">
      {content}
    </Flex>
  );
}
