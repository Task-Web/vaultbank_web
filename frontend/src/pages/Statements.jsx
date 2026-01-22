import React, { useState, useContext } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  Badge,
  Select,
  HStack,
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  Icon,
  Link,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiDownload,
  FiFile,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiCheck,
} from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';

const Statements = () => {
  const { state, loading, error } = useStateContext();
  const toast = useToast();
  const [selectedYear, setSelectedYear] = useState('2025');

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          <Text color="gray.600">Loading statements...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Alert status="error">
          <AlertIcon />
          Error loading statements: {error}
        </Alert>
      </Box>
    );
  }

  if (!state || !state.state || !state.data) {
    return (
      <Box p={8}>
        <Alert status="info">
          <AlertIcon />
          No data available. Please initialize your account.
        </Alert>
      </Box>
    );
  }

  const { accounts = [], credit_cards = [], user_profile = {} } = state.data;

  // Gather all statements from accounts
  const accountStatements = accounts.flatMap(account => {
    if (!account.statements) return [];
    return account.statements.map(stmt => ({
      ...stmt,
      account_id: account.id,
      account_nickname: account.nickname,
      account_type: account.type,
      account_number: account.account_number,
      statement_type: 'account',
    }));
  });

  // Gather all statements from credit cards
  const creditCardStatements = credit_cards.flatMap(card => {
    if (!card.statements) return [];
    return card.statements.map(stmt => ({
      ...stmt,
      account_id: card.id,
      account_nickname: `Credit Card ending in ${card.card_number}`,
      account_type: 'Credit Card',
      account_number: card.card_number,
      statement_type: 'credit_card',
    }));
  });

  // All statements combined
  const allStatements = [...accountStatements, ...creditCardStatements];

  // Filter by selected year
  const filteredStatements = allStatements.filter(stmt =>
    stmt.period && stmt.period.includes(selectedYear)
  );

  // Tax documents (simulated)
  const taxDocuments = [
    {
      id: 'tax_1',
      type: '1099-INT',
      year: '2024',
      description: 'Interest Income',
      url: '/api/documents/1099-int-2024.pdf',
      available_date: '2025-01-31',
    },
    {
      id: 'tax_2',
      type: '1099-DIV',
      year: '2024',
      description: 'Dividend Income',
      url: '/api/documents/1099-div-2024.pdf',
      available_date: '2025-01-31',
    },
    {
      id: 'tax_3',
      type: '1099-INT',
      year: '2023',
      description: 'Interest Income',
      url: '/api/documents/1099-int-2023.pdf',
      available_date: '2024-01-31',
    },
  ];

  const handleDownload = (url, description) => {
    toast({
      title: 'Download started',
      description: `Downloading: ${description}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    // In a real app, this would trigger an actual download
    console.log(`Downloading: ${url}`);
  };

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="1200px" py={8} px={6}>
        {/* Header */}
        <Box mb={8}>
          <Heading size="lg" color="gray.800" mb={2}>
            Statements & Documents
          </Heading>
          <Text color="gray.600">
            View and download your account statements, credit card statements, and tax documents
          </Text>
        </Box>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>
              <Icon as={FiFile} mr={2} />
              Account Statements
            </Tab>
            <Tab>
              <Icon as={FiFileText} mr={2} />
              Tax Documents
            </Tab>
            <Tab>
              <Icon as={FiCalendar} mr={2} />
              Delivery Preferences
            </Tab>
          </TabList>

          <TabPanels>
            {/* Account Statements Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Year Filter */}
                <Flex justify="space-between" align="center">
                  <HStack>
                    <Text fontWeight="medium">Year:</Text>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      width="150px"
                    >
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                    </Select>
                  </HStack>
                  <Text color="gray.600">
                    {filteredStatements.length} statements found
                  </Text>
                </Flex>

                {/* Statements Table */}
                {filteredStatements.length === 0 ? (
                  <Card>
                    <CardBody>
                      <Text color="gray.500" textAlign="center" py={8}>
                        No statements available for {selectedYear}
                      </Text>
                    </CardBody>
                  </Card>
                ) : (
                  <Card overflow="hidden">
                    <Table variant="simple">
                      <Thead bg="gray.50">
                        <Tr>
                          <Th>Account</Th>
                          <Th>Period</Th>
                          <Th>Type</Th>
                          <Th>Date Generated</Th>
                          <Th textAlign="right">Action</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredStatements
                          .sort((a, b) => {
                            // Sort by period descending
                            const dateA = new Date(a.period || '1970-01');
                            const dateB = new Date(b.period || '1970-01');
                            return dateB - dateA;
                          })
                          .map((stmt, index) => (
                            <Tr key={index}>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="medium">
                                    {stmt.account_nickname}
                                  </Text>
                                  <Text fontSize="sm" color="gray.500">
                                    {stmt.account_type} • ****{stmt.account_number?.slice(-4)}
                                  </Text>
                                </VStack>
                              </Td>
                              <Td>
                                <HStack>
                                  <Icon as={FiCalendar} color="gray.400" />
                                  <Text>{stmt.period}</Text>
                                </HStack>
                              </Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    stmt.statement_type === 'credit_card'
                                      ? 'purple'
                                      : 'blue'
                                  }
                                >
                                  {stmt.statement_type === 'credit_card'
                                    ? 'Credit Card'
                                    : 'Account'}
                                </Badge>
                              </Td>
                              <Td>
                                {stmt.generated_date ? (
                                  <Text fontSize="sm">
                                    {new Date(stmt.generated_date).toLocaleDateString()}
                                  </Text>
                                ) : (
                                  <Text fontSize="sm" color="gray.400">
                                    N/A
                                  </Text>
                                )}
                              </Td>
                              <Td textAlign="right">
                                <Button
                                  size="sm"
                                  leftIcon={<FiDownload />}
                                  colorScheme="blue"
                                  onClick={() =>
                                    handleDownload(
                                      stmt.url,
                                      `${stmt.period} - ${stmt.account_nickname}`
                                    )
                                  }
                                >
                                  View PDF
                                </Button>
                              </Td>
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Tax Documents Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={2}>
                    Tax Documents
                  </Heading>
                  <Text color="gray.600">
                    Download your tax documents including 1099-INT, 1099-DIV, and other
                    year-end statements.
                  </Text>
                </Box>

                <Card overflow="hidden">
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Document Type</Th>
                        <Th>Tax Year</Th>
                        <Th>Description</Th>
                        <Th>Available Date</Th>
                        <Th textAlign="right">Action</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {taxDocuments.map(doc => (
                        <Tr key={doc.id}>
                          <Td>
                            <HStack>
                              <Icon as={FiDollarSign} color="green.500" />
                              <Text fontWeight="medium">{doc.type}</Text>
                            </HStack>
                          </Td>
                          <Td>
                            <Badge colorScheme="green">{doc.year}</Badge>
                          </Td>
                          <Td>{doc.description}</Td>
                          <Td>
                            {new Date(doc.available_date).toLocaleDateString()}
                          </Td>
                          <Td textAlign="right">
                            <Button
                              size="sm"
                              leftIcon={<FiDownload />}
                              colorScheme="green"
                              onClick={() =>
                                handleDownload(doc.url, `${doc.type} - ${doc.year}`)
                              }
                            >
                              Download
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Card>

                <Alert status="info">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="medium">Tax Documents</Text>
                    <Text fontSize="sm">
                      Tax documents are typically available by January 31st for the previous
                      tax year. You will be notified when new documents are available.
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Delivery Preferences Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={2}>
                    Statement Delivery Preferences
                  </Heading>
                  <Text color="gray.600">
                    Choose how you want to receive your account statements.
                  </Text>
                </Box>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  {/* Paperless Option */}
                  <Card
                    cursor="pointer"
                    bg={user_profile?.communication_preferences?.paperless ? 'blue.50' : 'white'}
                    borderColor={
                      user_profile?.communication_preferences?.paperless
                        ? 'blue.500'
                        : 'gray.200'
                    }
                    borderWidth="2px"
                    _hover={{ shadow: 'md' }}
                  >
                    <CardBody>
                      <VStack spacing={4} align="start">
                        <Icon as={FiFile} boxSize={10} color="blue.500" />
                        <Box>
                          <Heading size="sm" mb={2}>
                            Paperless
                          </Heading>
                          <Text fontSize="sm" color="gray.600">
                            Receive statements electronically only. View and download
                            anytime through online banking.
                          </Text>
                        </Box>
                        {user_profile?.communication_preferences?.paperless && (
                          <Badge colorScheme="green">
                            <Icon as={FiCheck} mr={1} />
                            Current Selection
                          </Badge>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>

                  {/* Paper Option */}
                  <Card
                    cursor="pointer"
                    bg={
                      !user_profile?.communication_preferences?.paperless
                        ? 'blue.50'
                        : 'white'
                    }
                    borderColor={
                      !user_profile?.communication_preferences?.paperless
                        ? 'blue.500'
                        : 'gray.200'
                    }
                    borderWidth="2px"
                    _hover={{ shadow: 'md' }}
                  >
                    <CardBody>
                      <VStack spacing={4} align="start">
                        <Icon as={FiFileText} boxSize={10} color="gray.500" />
                        <Box>
                          <Heading size="sm" mb={2}>
                            Paper Statements
                          </Heading>
                          <Text fontSize="sm" color="gray.600">
                            Receive paper statements by mail. Electronic copies will also
                            be available online.
                          </Text>
                        </Box>
                        {!user_profile?.communication_preferences?.paperless && (
                          <Badge colorScheme="green">
                            <Icon as={FiCheck} mr={1} />
                            Current Selection
                          </Badge>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>

                <Alert status="info">
                  <AlertIcon />
                  <Box flex="1">
                    <Text fontWeight="medium">Update Your Preferences</Text>
                    <Text fontSize="sm">
                      To change your statement delivery preferences, visit the{' '}
                      <Link href="/settings" color="blue.500" fontWeight="medium">
                        Profile & Settings
                      </Link>{' '}
                      page.
                    </Text>
                  </Box>
                </Alert>

                {/* Notification Settings */}
                <Box>
                  <Heading size="sm" mb={4}>
                    Email Notifications
                  </Heading>
                  <Card>
                    <CardBody>
                      <VStack spacing={4} align="start">
                        <HStack justify="space-between" width="100%">
                          <Text>
                            Notify me when new statements are available
                          </Text>
                          <Badge
                            colorScheme={
                              user_profile?.communication_preferences
                                ?.email_notifications
                                ? 'green'
                                : 'gray'
                            }
                          >
                            {user_profile?.communication_preferences
                              ?.email_notifications
                              ? 'Enabled'
                              : 'Disabled'}
                          </Badge>
                        </HStack>
                        <HStack justify="space-between" width="100%">
                          <Text>Notify me when tax documents are available</Text>
                          <Badge
                            colorScheme={
                              user_profile?.communication_preferences
                                ?.email_notifications
                                ? 'green'
                                : 'gray'
                            }
                          >
                            {user_profile?.communication_preferences
                              ?.email_notifications
                              ? 'Enabled'
                              : 'Disabled'}
                          </Badge>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default Statements;
