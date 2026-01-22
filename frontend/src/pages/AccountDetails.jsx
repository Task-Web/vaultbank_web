import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  HStack,
  VStack,
  Button,
  Badge,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Collapse,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Input,
  Flex,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { ArrowBackIcon, DownloadIcon, ViewIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrency, formatCurrencyWithCode, formatDate, formatTime, maskAccountNumber, getAccountTypeIcon } from '../utils/formatters';

const AccountDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useStateContext();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const account = state?.data?.accounts?.find((acc) => acc.id === id);

  // Get unique categories for filter dropdown
  const categories = React.useMemo(() => {
    if (!account?.transactions) return [];
    const cats = new Set(account.transactions.map(tx => tx.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [account]);

  // CSV Export function
  const exportToCSV = () => {
    if (!filteredTransactions.length) {
      alert('No transactions to export');
      return;
    }

    // Create CSV headers
    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Type', 'Amount', 'Running Balance'];

    // Create CSV rows
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.date),
      `"${tx.description}"`,
      `"${tx.merchant || ''}"`,
      `"${tx.category || 'General'}"`,
      tx.type,
      Math.abs(tx.amount).toFixed(2),
      tx.running_balance?.toFixed(2) || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${account.nickname.replace(/\s+/g, '_')}_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (account?.transactions) {
      let filtered = [...account.transactions];

      // Filter by transaction type
      if (filter !== 'all') {
        filtered = filtered.filter((tx) => {
          if (filter === 'credits') return tx.type === 'credit';
          if (filter === 'debits') return tx.type === 'debit';
          if (filter === 'pending') return tx.type === 'pending';
          return true;
        });
      }

      // Filter by category
      if (categoryFilter !== 'all') {
        filtered = filtered.filter((tx) => tx.category === categoryFilter);
      }

      // Filter by date range
      if (dateFrom) {
        filtered = filtered.filter((tx) => new Date(tx.date) >= new Date(dateFrom));
      }
      if (dateTo) {
        filtered = filtered.filter((tx) => new Date(tx.date) <= new Date(dateTo));
      }

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((tx) =>
          tx.description.toLowerCase().includes(term) ||
          tx.category?.toLowerCase().includes(term) ||
          tx.merchant?.toLowerCase().includes(term) ||
          Math.abs(tx.amount).toFixed(2).includes(term) ||
          Math.abs(tx.amount).toString().includes(term)
        );
      }

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      setFilteredTransactions(filtered);
    }
  }, [account, filter, searchTerm, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    setVisibleCount(10);
    setExpandedTransactionId(null);
  }, [filter, searchTerm, categoryFilter, dateFrom, dateTo, account]);

  if (!account) {
    return (
      <Container maxW="container.xl" py={8} mt="64px">
        <VStack spacing={4}>
          <Heading size="lg">Account Not Found</Heading>
          <Text>The account you're looking for doesn't exist.</Text>
          <Button as={Link} to="/accounts" colorScheme="vaultbank">
            Back to Accounts
          </Button>
        </VStack>
      </Container>
    );
  }

  const accountTypeIcon = getAccountTypeIcon(account.type);

  return (
    <Container maxW="container.xl" py={8} mt="64px">
      {/* Breadcrumb Navigation */}
      <HStack spacing={2} mb={4} fontSize="sm" color="gray.600">
        <Link to="/">
          <Text as="span" color="vaultbank.600" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Home
          </Text>
        </Link>
        <Text color="gray.400">/</Text>
        <Link to="/accounts">
          <Text as="span" color="vaultbank.600" _hover={{ textDecoration: 'underline' }} cursor="pointer">
            Accounts
          </Text>
        </Link>
        <Text color="gray.400">/</Text>
        <Text color="gray.800" fontWeight="medium">
          {account.nickname}
        </Text>
      </HStack>

      {/* Header */}
      <HStack spacing={4} mb={6} align="flex-start">
        <Box flex={1}>
          <HStack spacing={3}>
            <Text fontSize="3xl">{accountTypeIcon}</Text>
            <Heading size="lg">
              {account.nickname} {account.card_frozen && <Badge colorScheme="red">Frozen</Badge>}
            </Heading>
          </HStack>
          <Text color="gray.600" mt={1}>
            {account.type.charAt(0).toUpperCase() + account.type.slice(1)} Account • {maskAccountNumber(account.account_number)}
          </Text>
        </Box>
      </HStack>

      {/* Account Overview Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Available Balance</Text>
              <Text fontSize="2xl" fontWeight="bold" color="vaultbank.600">
                {formatCurrency(account.available_balance)}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Current Balance</Text>
              <Text fontSize="2xl" fontWeight="bold">
                {formatCurrency(account.current_balance)}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Account Number</Text>
              <Text fontSize="2xl" fontWeight="bold">
                {maskAccountNumber(account.account_number)}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Quick Actions */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={8}>
        <Button colorScheme="vaultbank" size="md">
          Transfer Money
        </Button>
        <Button variant="outline" size="md">
          Pay Bills
        </Button>
        <Button variant="outline" size="md">
          View Statements
        </Button>
        <Button variant="outline" size="md">
          {account.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
        </Button>
      </SimpleGrid>

      {/* Tabs */}
      <Card>
        <CardBody>
          <Tabs>
            <TabList>
              <Tab>Transactions</Tab>
              <Tab>Account Details</Tab>
              <Tab>Statements</Tab>
            </TabList>

            <TabPanels>
              {/* Transactions Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {/* Filters */}
                  <Flex gap={4} wrap="wrap" align="center">
                    <Select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      maxW="180px"
                      size="sm"
                    >
                      <option value="all">All Transactions</option>
                      <option value="credits">Credits Only</option>
                      <option value="debits">Debits Only</option>
                      <option value="pending">Pending</option>
                    </Select>

                    <Select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      maxW="180px"
                      size="sm"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>

                    <Input
                      placeholder="From date (YYYY-MM-DD)"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      maxW="180px"
                      size="sm"
                    />

                    <Input
                      placeholder="To date (YYYY-MM-DD)"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      maxW="180px"
                      size="sm"
                    />

                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      maxW="300px"
                      size="sm"
                    />

                    <Button
                      leftIcon={<DownloadIcon />}
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                    >
                      Export CSV
                    </Button>
                  </Flex>

                  <Divider />

                  {/* Transactions Table */}
                  <Box overflowX="auto">
                    <Table size="md" variant="simple">
                      <Thead bg="gray.100">
                        <Tr>
                          <Th color="gray.700" fontWeight="semibold">Date</Th>
                          <Th color="gray.700" fontWeight="semibold">Description</Th>
                          <Th color="gray.700" fontWeight="semibold">Category</Th>
                          <Th isNumeric color="gray.700" fontWeight="semibold">Amount</Th>
                          <Th isNumeric color="gray.700" fontWeight="semibold">Balance</Th>
                          <Th />
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredTransactions.length === 0 ? (
                          <Tr>
                            <Td colSpan={6} textAlign="center" py={8}>
                              <Text color="gray.500">No transactions found</Text>
                            </Td>
                          </Tr>
                        ) : (
                          filteredTransactions.slice(0, visibleCount).map((tx, index) => {
                            const isExpanded = expandedTransactionId === tx.id;
                            const postDate = tx.post_date || tx.date;
                            const transactionTime = tx.transaction_time || formatTime(tx.date);
                            const merchantName = tx.merchant_name || tx.merchant || tx.description;
                            const areaDistrict = tx.area_district || 'N/A';
                            const countryRegion = tx.country_region || 'N/A';
                            const transactionAmount = tx.transaction_amount ?? Math.abs(tx.amount);
                            const billingAmount = tx.billing_amount ?? Math.abs(tx.amount);
                            const transactionCurrency = tx.transaction_currency || account.currency || 'USD';
                            const billingCurrency = tx.billing_currency || transactionCurrency;
                            const displayCardNumber = tx.card_number || maskAccountNumber(account.account_number);

                            return (
                              <React.Fragment key={tx.id}>
                                <Tr
                                  _hover={{ bg: 'vaultbank.50' }}
                                  bg={index % 2 === 0 ? 'white' : 'gray.50'}
                                >
                                  <Td>{formatDate(tx.date)}</Td>
                                  <Td>
                                    <VStack align="start" spacing={0}>
                                      <Text fontWeight="medium">{tx.description}</Text>
                                      {tx.merchant && (
                                        <Text fontSize="xs" color="gray.500">{tx.merchant}</Text>
                                      )}
                                    </VStack>
                                  </Td>
                                  <Td>
                                    <Badge
                                      colorScheme={tx.type === 'credit' ? 'green' : tx.type === 'pending' ? 'yellow' : 'gray'}
                                      variant="subtle"
                                    >
                                      {tx.category || 'General'}
                                    </Badge>
                                  </Td>
                                  <Td isNumeric>
                                    <Text
                                      fontWeight="semibold"
                                      color={tx.type === 'credit' ? 'green.600' : 'red.600'}
                                    >
                                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                    </Text>
                                  </Td>
                                  <Td isNumeric>
                                    <Text fontWeight="medium">{formatCurrency(tx.running_balance)}</Text>
                                  </Td>
                                  <Td textAlign="right">
                                    <IconButton
                                      aria-label={isExpanded ? 'Collapse transaction details' : 'Expand transaction details'}
                                      icon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedTransactionId(isExpanded ? null : tx.id)}
                                    />
                                  </Td>
                                </Tr>
                                <Tr>
                                  <Td colSpan={6} p={0} borderBottom="none">
                                    <Collapse in={isExpanded} animateOpacity>
                                      <Box px={6} py={4} bg="gray.50">
                                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Post date</Text>
                                            <Text fontWeight="medium">{formatDate(postDate)}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Transaction time</Text>
                                            <Text fontWeight="medium">{transactionTime}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Merchant name</Text>
                                            <Text fontWeight="medium">{merchantName}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Area / district</Text>
                                            <Text fontWeight="medium">{areaDistrict}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Country / region</Text>
                                            <Text fontWeight="medium">{countryRegion}</Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Transaction amount</Text>
                                            <Text fontWeight="medium">
                                              {formatCurrencyWithCode(transactionAmount, transactionCurrency)}
                                            </Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Billing amount</Text>
                                            <Text fontWeight="medium">
                                              {formatCurrencyWithCode(billingAmount, billingCurrency)}
                                            </Text>
                                          </Box>
                                          <Box>
                                            <Text fontSize="sm" color="gray.500">Card number</Text>
                                            <Text fontWeight="medium">{displayCardNumber}</Text>
                                          </Box>
                                        </SimpleGrid>
                                      </Box>
                                    </Collapse>
                                  </Td>
                                </Tr>
                              </React.Fragment>
                            );
                          })
                        )}
                      </Tbody>
                    </Table>
                  </Box>
                  {filteredTransactions.length > visibleCount && (
                    <Flex justify="center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCount((count) => count + 10)}
                      >
                        Load more
                      </Button>
                    </Flex>
                  )}
                </VStack>
              </TabPanel>

              {/* Account Details Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Account Type</Text>
                      <Text fontWeight="medium">{account.type.charAt(0).toUpperCase() + account.type.slice(1)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Account Number</Text>
                      <Text fontWeight="medium">{maskAccountNumber(account.account_number)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Routing Number</Text>
                      <Text fontWeight="medium">{account.routing_number}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Opened Date</Text>
                      <Text fontWeight="medium">{formatDate(account.opened_date)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Account Status</Text>
                      <Badge colorScheme={account.status === 'active' ? 'green' : 'red'}>
                        {account.status}
                      </Badge>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600">Card Status</Text>
                      <Badge colorScheme={account.card_frozen ? 'red' : 'green'}>
                        {account.card_frozen ? 'Frozen' : 'Active'}
                      </Badge>
                    </Box>
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* Statements Tab */}
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  {account.statements && account.statements.length > 0 ? (
                    account.statements.map((statement, index) => (
                      <Card key={index} variant="outline">
                        <CardBody>
                          <HStack justify="space-between">
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="medium">{statement.period}</Text>
                              <Text fontSize="xs" color="gray.500">
                                Generated {formatDate(statement.generated_date)}
                              </Text>
                            </VStack>
                            <Button
                              size="sm"
                              leftIcon={<ViewIcon />}
                              variant="outline"
                              as="a"
                              href={statement.url}
                              target="_blank"
                            >
                              View PDF
                            </Button>
                          </HStack>
                        </CardBody>
                      </Card>
                    ))
                  ) : (
                    <Box textAlign="center" py={8}>
                      <Text color="gray.500">No statements available yet</Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </CardBody>
      </Card>
    </Container>
  );
};

export default AccountDetails;
