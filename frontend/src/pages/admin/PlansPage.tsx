import {
  Box,
  Container,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useSearchParams } from 'react-router-dom';
import OptionsTab from '../../components/admin/plans/OptionsTab';
import PlansTab from '../../components/admin/plans/PlansTab';

const STUDIO_ID = 'studio_001'; // TODO: 後で動的に取得

type TabKey = 'plans' | 'options';

const isValidTab = (v: string | null): v is TabKey =>
  v === 'plans' || v === 'options';

export default function PlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const currentTab: TabKey = isValidTab(rawTab) ? rawTab : 'plans';
  const tabIndex = currentTab === 'plans' ? 0 : 1;

  const handleTabChange = (index: number) => {
    const next: TabKey = index === 0 ? 'plans' : 'options';
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set('tab', next);
        return params;
      },
      { replace: true }
    );
  };

  return (
    <Container
      maxW={{ base: 'full', md: 'container.xl' }}
      py={{ base: 4, md: 6 }}
      px={{ base: 3, md: 6 }}
    >
      <VStack spacing={4} align="stretch">
        <Box>
          <Heading size={{ base: 'md', md: 'lg' }}>プラン・オプション管理</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            料金プランと追加オプションを管理します。
          </Text>
        </Box>

        <Tabs
          variant="line"
          colorScheme="brand"
          index={tabIndex}
          onChange={handleTabChange}
          isLazy
        >
          <TabList>
            <Tab>プラン</Tab>
            <Tab>オプション</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={4}>
              <PlansTab studioId={STUDIO_ID} />
            </TabPanel>
            <TabPanel px={0} pt={4}>
              <OptionsTab studioId={STUDIO_ID} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}
