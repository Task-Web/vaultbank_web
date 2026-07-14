import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Grid,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  Badge,
  Divider,
  HStack,
  VStack,
  useColorModeValue,
  IconButton,
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
  Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  useToast,
  SimpleGrid,
  Stack,
  Radio,
  RadioGroup,
  Collapse,
} from '@chakra-ui/react';
import { FiCreditCard, FiDollarSign, FiLock, FiUnlock, FiDownload, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrencyWithCode, formatTime } from '../utils/formatters';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const CreditCardSummary = ({ card, onMakePayment, onToggleFreeze }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const creditUsedPercent = (card.current_balance / card.credit_limit) * 100;

  return (
    <Card
      bg={bgColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
    >
      <CardBody p={6}>
        <Flex justify="space-between" align="start" mb={4}>
          <Box>
            <Text fontSize="sm" color="gray.600" fontWeight="medium" mb={1}>
              VaultBank Sapphire Preferred
            </Text>
            <Text fontSize="lg" fontWeight="semibold" color="gray.900">
              ****{card.card_number}
            </Text>
          </Box>
          <HStack spacing={2}>
            {card.card_frozen && (
              <Badge colorScheme="red">Frozen</Badge>
            )}
            <Badge colorScheme="blue">
              Expires {card.expiration_date}
            </Badge>
          </HStack>
        </Flex>

        <VStack align="stretch" spacing={4} mb={6}>
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Current Balance
            </Text>
            <Text fontSize="3xl" fontWeight="bold" color="gray.900">
              {formatCurrency(card.current_balance)}
            </Text>
          </Box>

          <Box>
            <Flex justify="space-between" mb={2}>
              <Text fontSize="sm" color="gray.600">Credit Available</Text>
              <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                {formatCurrency(card.available_credit)}
              </Text>
            </Flex>
            <Box w="100%" bg="gray.200" borderRadius="full" h="2" overflow="hidden">
              <Box
                bg={creditUsedPercent > 80 ? 'red.500' : creditUsedPercent > 50 ? 'yellow.500' : 'green.500'}
                h="100%"
                w={`${creditUsedPercent}%`}
                transition="all 0.3s"
              />
            </Box>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {creditUsedPercent.toFixed(1)}% of {formatCurrency(card.credit_limit)} used
            </Text>
          </Box>

          <Divider />

          <SimpleGrid columns={2} spacing={4}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Payment Due
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                {formatDate(card.payment_due_date)}
              </Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Minimum Payment
              </Text>
              <Text fontSize="sm" fontWeight="semibold" color="gray.900">
                {formatCurrency(card.minimum_payment)}
              </Text>
            </Box>
          </SimpleGrid>
        </VStack>

        <HStack spacing={3}>
          <Button
            leftIcon={<FiDollarSign />}
            colorScheme="blue"
            size="sm"
            flex={1}
            onClick={() => onMakePayment(card)}
          >
            Make Payment
          </Button>
          <Button
            leftIcon={card.card_frozen ? <FiUnlock /> : <FiLock />}
            variant={card.card_frozen ? "solid" : "outline"}
            colorScheme={card.card_frozen ? "green" : "red"}
            size="sm"
            onClick={() => onToggleFreeze(card)}
          >
            {card.card_frozen ? 'Unfreeze' : 'Freeze'}
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

const TransactionsTable = ({
  transactions,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  categoryFilter,
  setCategoryFilter,
  expandedTransactionId,
  setExpandedTransactionId,
  cardNumber,
}) => {
  const [visibleCount, setVisibleCount] = useState(10);
  // Get unique categories from transactions
  const categories = ['all', ...new Set(transactions.map(tx => tx.category))];

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = !filter || filter === 'all' || tx.type === filter;

    // Date filter
    let matchesDate = true;
    if (dateFilter && dateFilter !== 'all') {
      const days = parseInt(dateFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      matchesDate = new Date(tx.date) >= cutoffDate;
    }

    // Category filter
    const matchesCategory = !categoryFilter || categoryFilter === 'all' || tx.category === categoryFilter;

    return matchesSearch && matchesFilter && matchesDate && matchesCategory;
  });

  useEffect(() => {
    setVisibleCount(10);
    setExpandedTransactionId(null);
  }, [filter, searchQuery, dateFilter, categoryFilter, transactions, setExpandedTransactionId]);

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);

  return (
    <Box>
      <Flex gap={4} mb={4} flexWrap="wrap">
        <Input
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          maxW="300px"
        />
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          maxW="200px"
        >
          <option value="all">All Transactions</option>
          <option value="debit">Debits</option>
          <option value="credit">Credits</option>
        </Select>
        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          maxW="200px"
        >
          <option value="all">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="60">Last 60 Days</option>
          <option value="90">Last 90 Days</option>
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          maxW="200px"
        >
          <option value="all">All Categories</option>
          {categories.filter(c => c !== 'all').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </Select>
      </Flex>

      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Description</Th>
              <Th>Category</Th>
              <Th isNumeric>Amount</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {visibleTransactions.map(tx => {
              const isExpanded = expandedTransactionId === tx.id;
              const postDate = tx.post_date || tx.date;
              const transactionTime = tx.transaction_time || formatTime(tx.date);
              const merchantName = tx.merchant_name || tx.description;
              const areaDistrict = tx.area_district || 'N/A';
              const countryRegion = tx.country_region || 'N/A';
              const transactionAmount = tx.transaction_amount ?? tx.amount;
              const billingAmount = tx.billing_amount ?? tx.amount;
              const transactionCurrency = tx.transaction_currency || 'USD';
              const billingCurrency = tx.billing_currency || transactionCurrency;
              const displayCardNumber = tx.card_number || cardNumber || 'N/A';

              return (
                <React.Fragment key={tx.id}>
                  <Tr>
                    <Td>{formatDate(tx.date)}</Td>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">{tx.description}</Text>
                      </VStack>
                    </Td>
                    <Td>{tx.category}</Td>
                    <Td isNumeric>
                      <Text
                        fontWeight="semibold"
                        color={tx.type === 'credit' ? 'green.600' : 'red.600'}
                      >
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </Text>
                    </Td>
                    <Td textAlign="right">
                      <IconButton
                        aria-label={isExpanded ? 'Collapse transaction details' : 'Expand transaction details'}
                        icon={isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedTransactionId(isExpanded ? null : tx.id)}
                      />
                    </Td>
                  </Tr>
                  <Tr>
                    <Td colSpan={5} p={0} borderBottom="none">
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
            })}
          </Tbody>
        </Table>
      </Box>
      {filteredTransactions.length > visibleCount && (
        <Flex justify="center" mt={4}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((count) => count + 10)}
          >
            Load more
          </Button>
        </Flex>
      )}
    </Box>
  );
};

const StatementsList = ({ statements }) => {
  if (statements.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="gray.500" mb={2}>No statements available yet</Text>
        <Text fontSize="sm" color="gray.400">
          Statements will be available after your first billing cycle
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {statements.map(statement => (
        <Flex
          key={statement.id}
          p={4}
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          justify="space-between"
          align="center"
          _hover={{ bg: 'gray.50' }}
        >
          <Box>
            <Text fontWeight="medium">{statement.period}</Text>
            <Text fontSize="sm" color="gray.500">
              Generated {formatDate(statement.generated_date)}
            </Text>
          </Box>
          <Button
            leftIcon={<FiDownload />}
            size="sm"
            variant="outline"
          >
            Download PDF
          </Button>
        </Flex>
      ))}
    </VStack>
  );
};

const CreditCards = () => {
  const { state, updateState, loading } = useStateContext();
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const [creditCards, setCreditCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('custom');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [cardToFreeze, setCardToFreeze] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);

  // Initialize credit cards if not present
  useEffect(() => {
    if (loading) {
      return;
    }
    const storedCards = Array.isArray(state?.data?.credit_cards)
      ? state.data.credit_cards
      : [];
    setCreditCards(storedCards);
    setSelectedCard((currentCard) => {
      const currentCardId = currentCard?.id;
      return storedCards.find((card) => card.id === currentCardId) || storedCards[0] || null;
    });
  }, [state, loading]);

  const handleMakePayment = (card) => {
    setSelectedCard(card);
    setPaymentType('custom');
    setPaymentAmount('');
    // Set default account to first checking account
    const accounts = state.data?.accounts || [];
    const defaultAccount = accounts.find(acc => acc.type === 'checking') || accounts[0];
    setSelectedAccountId(defaultAccount?.id || '');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentTypeChange = (value) => {
    setPaymentType(value);
    if (value === 'minimum') {
      setPaymentAmount(selectedCard.minimum_payment.toString());
    } else if (value === 'full') {
      setPaymentAmount(selectedCard.current_balance.toString());
    } else {
      setPaymentAmount('');
    }
  };

  const confirmPayment = async () => {
    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!selectedAccountId) {
      toast({
        title: 'No Account Selected',
        description: 'Please select an account to make the payment from',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Check if source account has sufficient funds
    const accounts = state.data?.accounts || [];
    const sourceAccount = accounts.find(acc => acc.id === selectedAccountId);

    if (!sourceAccount) {
      toast({
        title: 'Account Not Found',
        description: 'Selected account not found',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (sourceAccount.available_balance < amount) {
      toast({
        title: 'Insufficient Funds',
        description: `Selected account only has ${formatCurrency(sourceAccount.available_balance)} available`,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (amount > selectedCard.current_balance) {
      toast({
        title: 'Amount Too High',
        description: 'Payment cannot exceed current balance',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Generate reference number
    const referenceNumber = `CCP${Date.now()}`;

    const paymentTimestamp = new Date().toISOString();

    // Update credit card balance
    const updatedCards = creditCards.map(card =>
      card.id === selectedCard.id
        ? {
            ...card,
            current_balance: card.current_balance - amount,
            available_credit: card.available_credit + amount,
            transactions: [
              {
                id: `cc_txn_${Math.random().toString(36).substr(2, 9)}`,
                date: paymentTimestamp,
                post_date: paymentTimestamp,
                transaction_time: formatTime(paymentTimestamp),
                description: 'Online Payment',
                merchant_name: 'Online Payment',
                area_district: 'Online',
                country_region: 'United States',
                amount: amount,
                transaction_amount: amount,
                billing_amount: amount,
                transaction_currency: 'USD',
                billing_currency: 'USD',
                card_number: selectedCard.card_number,
                category: 'Payment',
                type: 'credit',
              },
              ...card.transactions,
            ],
          }
        : card
    );

    // Update source account balance
    const updatedAccounts = accounts.map(account =>
      account.id === selectedAccountId
        ? {
            ...account,
            current_balance: account.current_balance - amount,
            available_balance: account.available_balance - amount,
            transactions: [
              {
                id: `txn_${Math.random().toString(36).substr(2, 9)}`,
                date: paymentTimestamp,
                post_date: paymentTimestamp,
                transaction_time: formatTime(paymentTimestamp),
                description: `Credit Card Payment - ${selectedCard.card_number}`,
                merchant_name: 'Credit Card Payment',
                area_district: 'Online',
                country_region: 'United States',
                amount: -amount,
                transaction_amount: amount,
                billing_amount: amount,
                transaction_currency: 'USD',
                billing_currency: 'USD',
                card_number: account.account_number,
                category: 'Payment',
                type: 'debit',
                running_balance: account.current_balance - amount,
              },
              ...account.transactions,
            ],
          }
        : account
    );

    try {
      await updateState(
        {
          credit_cards: updatedCards,
          accounts: updatedAccounts,
        },
        `Credit card payment of ${formatCurrency(amount)} from ${sourceAccount.nickname}`
      );
      setCreditCards(updatedCards);
      setSelectedCard(updatedCards.find(c => c.id === selectedCard.id));
      setIsPaymentModalOpen(false);

      toast({
        title: 'Payment Successful',
        description: `Payment of ${formatCurrency(amount)} has been processed from ${sourceAccount.nickname}. Reference: ${referenceNumber}`,
        status: 'success',
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleToggleFreeze = (card) => {
    setCardToFreeze(card);
    setIsFreezeModalOpen(true);
  };

  const confirmToggleFreeze = async () => {
    const updatedCards = creditCards.map(c =>
      c.id === cardToFreeze.id
        ? { ...c, card_frozen: !c.card_frozen }
        : c
    );

    try {
      await updateState({ credit_cards: updatedCards }, `${cardToFreeze.card_frozen ? 'Unfreeze' : 'Freeze'} card ${cardToFreeze.card_number}`);
      setCreditCards(updatedCards);
      if (selectedCard?.id === cardToFreeze.id) {
        setSelectedCard(updatedCards.find(c => c.id === cardToFreeze.id));
      }
      setIsFreezeModalOpen(false);

      toast({
        title: cardToFreeze.card_frozen ? 'Card Unfrozen' : 'Card Frozen',
        description: `Card ending in ${cardToFreeze.card_number} has been ${cardToFreeze.card_frozen ? 'unfrozen' : 'frozen'}`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Action Failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  if (loading || !state || !state.data) {
    return (
      <Box p={8} bg={bgColor} minH="100vh">
        <Text>Loading credit cards...</Text>
      </Box>
    );
  }

  if (creditCards.length === 0) {
    return (
      <Box p={8} bg={bgColor} minH="100vh">
        <Heading size="lg" mb={2}>Credit Cards</Heading>
        <Text color="gray.600">No credit cards found.</Text>
      </Box>
    );
  }

  return (
    
    <Box p={8} bg={bgColor} minH="100vh">
      <VStack align="stretch" spacing={8}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Credit Cards</Heading>
          <Text color="gray.600">Manage your credit card accounts</Text>
        </Box>

        {/* Credit Cards Grid */}
        <Box>
          <Heading size="md" mb={4}>Your Cards</Heading>
          <SimpleGrid columns={2} spacing={6}>
            {creditCards.map(card => (
              <CreditCardSummary
                key={card.id}
                card={card}
                onMakePayment={handleMakePayment}
                onToggleFreeze={handleToggleFreeze}
              />
            ))}
          </SimpleGrid>
        </Box>

        {/* Card Details Tabs */}
        {selectedCard && (
          <Card>
            <CardBody>
              <Tabs>
                <TabList>
                  <Tab>Transactions</Tab>
                  <Tab>Statements</Tab>
                  <Tab>Details</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    <TransactionsTable
                      transactions={selectedCard.transactions}
                      filter={transactionFilter}
                      setFilter={setTransactionFilter}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      dateFilter={dateFilter}
                      setDateFilter={setDateFilter}
                      categoryFilter={categoryFilter}
                      setCategoryFilter={setCategoryFilter}
                      expandedTransactionId={expandedTransactionId}
                      setExpandedTransactionId={setExpandedTransactionId}
                      cardNumber={`**** **** **** ${selectedCard.card_number}`}
                    />
                  </TabPanel>

                  <TabPanel>
                    <StatementsList statements={selectedCard.statements} />
                  </TabPanel>

                  <TabPanel>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Text fontWeight="medium" mb={1}>Card Number</Text>
                        <Text>****{selectedCard.card_number}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium" mb={1}>Cardholder Name</Text>
                        <Text>{selectedCard.cardholder_name}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium" mb={1}>Expiration Date</Text>
                        <Text>{selectedCard.expiration_date}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium" mb={1}>Credit Limit</Text>
                        <Text>{formatCurrency(selectedCard.credit_limit)}</Text>
                      </Box>
                      <Box>
                        <Text fontWeight="medium" mb={1}>Status</Text>
                        <HStack>
                          <Badge colorScheme={selectedCard.status === 'active' ? 'green' : 'red'}>
                            {selectedCard.status}
                          </Badge>
                          {selectedCard.card_frozen && (
                            <Badge colorScheme="orange">Frozen</Badge>
                          )}
                        </HStack>
                      </Box>
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardBody>
          </Card>
        )}
      </VStack>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Make a Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Card</Text>
                <Text fontWeight="medium">****{selectedCard?.card_number}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600" mb={1}>Current Balance</Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatCurrency(selectedCard?.current_balance || 0)}
                </Text>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="medium" mb={3}>Payment From</Text>
                <Select
                  placeholder="Select account"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  mb={4}
                >
                  {state.data?.accounts?.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.nickname} - {formatCurrency(account.current_balance)}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box>
                <Text fontWeight="medium" mb={3}>Payment Amount</Text>
                <RadioGroup value={paymentType} onChange={handlePaymentTypeChange}>
                  <Stack direction="column">
                    <Radio value="minimum">
                      Minimum Payment - {formatCurrency(selectedCard?.minimum_payment || 0)}
                    </Radio>
                    <Radio value="full">
                      Full Balance - {formatCurrency(selectedCard?.current_balance || 0)}
                    </Radio>
                    <Radio value="custom">
                      Custom Amount
                    </Radio>
                  </Stack>
                </RadioGroup>
              </Box>

              {paymentType === 'custom' && (
                <Box>
                  <Text fontWeight="medium" mb={2}>Enter Amount</Text>
                  <NumberInput>
                    <NumberInputField
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </NumberInput>
                </Box>
              )}

              {paymentAmount && (
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" color="gray.600">Payment Amount</Text>
                  <Text fontSize="xl" fontWeight="bold" color="blue.600">
                    {formatCurrency(parseFloat(paymentAmount) || 0)}
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={confirmPayment}
              isDisabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedAccountId}
            >
              Confirm Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Freeze Confirmation Modal */}
      <Modal isOpen={isFreezeModalOpen} onClose={() => setIsFreezeModalOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {cardToFreeze?.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to {cardToFreeze?.card_frozen ? 'unfreeze' : 'freeze'} your card ending in <strong>{cardToFreeze?.card_number}</strong>?
            </Text>
            {cardToFreeze?.card_frozen ? (
              <Text mt={2} color="gray.600">
                Unfreezing will allow new transactions to be processed.
              </Text>
            ) : (
              <Text mt={2} color="red.600">
                Freezing will temporarily block all new transactions on this card.
              </Text>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="outline" mr={3} onClick={() => setIsFreezeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme={cardToFreeze?.card_frozen ? "green" : "red"}
              onClick={confirmToggleFreeze}
            >
              {cardToFreeze?.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default CreditCards;
