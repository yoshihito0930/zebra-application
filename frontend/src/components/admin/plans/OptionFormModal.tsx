import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputRightAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  optionSchema,
  type OptionFormData,
} from '../../../utils/validationSchemas';
import { useCreateOption, useUpdateOption } from '../../../hooks/usePlans';
import { getErrorMessage } from '../../../services/api';
import type { Option, UpdateOptionRequest } from '../../../types';

interface OptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioId: string;
  mode: 'create' | 'edit';
  option?: Option;
  nextDisplayOrder?: number;
}

const buildDefaults = (
  mode: 'create' | 'edit',
  option: Option | undefined,
  nextDisplayOrder: number
): OptionFormData => {
  if (mode === 'edit' && option) {
    return {
      option_name: option.option_name,
      price: option.price,
      tax_rate: option.tax_rate,
      display_order: option.display_order,
    };
  }
  return {
    option_name: '',
    price: 0,
    tax_rate: 0.1,
    display_order: nextDisplayOrder,
  };
};

export default function OptionFormModal({
  isOpen,
  onClose,
  studioId,
  mode,
  option,
  nextDisplayOrder = 1,
}: OptionFormModalProps) {
  const toast = useToast();
  const createMutation = useCreateOption();
  const updateMutation = useUpdateOption();
  const advanced = useDisclosure();

  const isEdit = mode === 'edit';
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<OptionFormData>({
    resolver: zodResolver(optionSchema),
    defaultValues: buildDefaults(mode, option, nextDisplayOrder),
  });

  useEffect(() => {
    if (isOpen) {
      reset(buildDefaults(mode, option, nextDisplayOrder));
      advanced.onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, option, nextDisplayOrder]);

  const onSubmit = handleSubmit((data) => {
    if (isEdit && option) {
      const payload: UpdateOptionRequest = {};
      if (dirtyFields.option_name) payload.option_name = data.option_name;
      if (dirtyFields.price) payload.price = data.price;
      if (dirtyFields.tax_rate) payload.tax_rate = data.tax_rate;
      if (dirtyFields.display_order) payload.display_order = data.display_order;

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      updateMutation.mutate(
        { optionId: option.option_id, data: payload },
        {
          onSuccess: () => {
            toast({
              title: 'オプションを保存しました',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            onClose();
          },
          onError: (error) => {
            toast({
              title: 'オプションの保存に失敗しました',
              description: getErrorMessage(error),
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          },
        }
      );
      return;
    }

    createMutation.mutate(
      {
        studio_id: studioId,
        option_name: data.option_name,
        price: data.price,
        tax_rate: data.tax_rate,
        display_order: data.display_order,
      },
      {
        onSuccess: () => {
          toast({
            title: 'オプションを追加しました',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          onClose();
        },
        onError: (error) => {
          toast({
            title: 'オプションの追加に失敗しました',
            description: getErrorMessage(error),
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      }
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'lg' }}
      closeOnOverlayClick={!isPending}
      scrollBehavior="inside"
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isEdit ? 'オプションを編集' : '新規オプション'}</ModalHeader>
        <ModalCloseButton isDisabled={isPending} />
        <form onSubmit={onSubmit}>
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.option_name} isRequired>
                <FormLabel>オプション名</FormLabel>
                <Input
                  placeholder="例: 6人以上のワークショップでご利用"
                  maxLength={100}
                  {...register('option_name')}
                />
                <FormErrorMessage>{errors.option_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.price} isRequired>
                <FormLabel>料金（税抜）</FormLabel>
                <Controller
                  name="price"
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <InputGroup>
                      <NumberInput
                        min={0}
                        max={10_000_000}
                        step={500}
                        value={Number.isNaN(value) ? 0 : value}
                        onChange={(_, num) =>
                          onChange(Number.isNaN(num) ? 0 : num)
                        }
                        w="100%"
                      >
                        <NumberInputField ref={ref} onBlur={onBlur} />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <InputRightAddon>円</InputRightAddon>
                    </InputGroup>
                  )}
                />
                <FormErrorMessage>{errors.price?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.display_order} isRequired>
                <FormLabel>表示順</FormLabel>
                <Controller
                  name="display_order"
                  control={control}
                  render={({ field: { value, onChange, onBlur, ref } }) => (
                    <NumberInput
                      min={0}
                      max={999}
                      value={Number.isNaN(value) ? 0 : value}
                      onChange={(_, num) =>
                        onChange(Number.isNaN(num) ? 0 : num)
                      }
                      w="160px"
                    >
                      <NumberInputField ref={ref} onBlur={onBlur} />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormHelperText>
                  小さい数値ほど予約フォームの先頭に表示されます
                </FormHelperText>
                <FormErrorMessage>
                  {errors.display_order?.message}
                </FormErrorMessage>
              </FormControl>

              <Box>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={
                    advanced.isOpen ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )
                  }
                  onClick={advanced.onToggle}
                  px={0}
                >
                  詳細設定
                </Button>
                <Collapse in={advanced.isOpen} animateOpacity>
                  <Box pt={3}>
                    <FormControl isInvalid={!!errors.tax_rate} isRequired>
                      <FormLabel>税率</FormLabel>
                      <Controller
                        name="tax_rate"
                        control={control}
                        render={({
                          field: { value, onChange, onBlur, ref },
                        }) => (
                          <NumberInput
                            min={0}
                            max={1}
                            step={0.01}
                            precision={2}
                            value={Number.isNaN(value) ? 0 : value}
                            onChange={(_, num) =>
                              onChange(Number.isNaN(num) ? 0 : num)
                            }
                            w="160px"
                          >
                            <NumberInputField ref={ref} onBlur={onBlur} />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        )}
                      />
                      <FormHelperText>例: 0.10 = 10%（消費税）</FormHelperText>
                      <FormErrorMessage>
                        {errors.tax_rate?.message}
                      </FormErrorMessage>
                    </FormControl>
                  </Box>
                </Collapse>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={onClose}
              isDisabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" colorScheme="brand" isLoading={isPending}>
              {isEdit ? '保存する' : '追加する'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
