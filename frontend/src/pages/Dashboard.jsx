import React from 'react';
import {
  Box,
  Flex,
  Grid,
  Text,
  Heading,
  SimpleGrid,
  useColorModeValue,
  Button,
  Link,
  VStack,
  HStack,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { useStateContext } from '../contexts/StateContext';
import AccountCard from '../components/AccountCard';
import { Link as RouterLink } from 'react-router-dom';

const Dashboard = () => {
  const { state, loading } = useStateContext();
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  if (loading) {
    return (
      <Box p={8}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  const accounts = state?.data?.accounts || [];
  const creditCards = state?.data?.credit_cards || [];
  const userProfile = state?.data?.user_profile || {};
  const billPay = state?.data?.bill_pay || {};
  const transfers = state?.data?.transfers || {};

  const isScheduledStatus = (status) => (
    status === 'active' || status === 'pending' || status === 'scheduled'
  );

  const getScheduledDate = (item) => item?.next_date || item?.date;

  const getSortableDateValue = (value) => {
    if (!value) return Number.POSITIVE_INFINITY;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
  };

  // Calculate total balance across all accounts
  const totalBalance = accounts.reduce((sum, account) => sum + account.available_balance, 0);

  // Get upcoming bills (next 5 scheduled payments)
  const upcomingBills = (billPay.scheduled_payments || [])
    .filter(payment => isScheduledStatus(payment.status))
    .sort((a, b) => (
      getSortableDateValue(getScheduledDate(a)) - getSortableDateValue(getScheduledDate(b))
    ))
    .slice(0, 5);

  // Get upcoming scheduled transfers
  const upcomingTransfers = (transfers.scheduled || [])
    .filter(transfer => isScheduledStatus(transfer.status))
    .sort((a, b) => (
      getSortableDateValue(getScheduledDate(a)) - getSortableDateValue(getScheduledDate(b))
    ))
    .slice(0, 5);

  // Get recent transactions across all accounts
  const recentTransactions = accounts.flatMap(account =>
    (account.transactions || []).slice(0, 3).map(tx => ({
      ...tx,
      accountNickname: account.nickname,
      accountNumber: account.account_number,
    }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatScheduleDate = (value) => {
    if (!value) return 'TBD';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'TBD';
    return parsed.toLocaleDateString();
  };

  return (
    <Box bg={bgColor} minH="100vh" p={{ base: 4, md: 6, lg: 8 }}>
      <Box maxW="1400px" mx="auto">
        <Flex direction="column" gap={8}>
          {/* Header */}
          <Box>
            <Heading size="lg" mb={2}>
              Welcome back, {userProfile.first_name || 'Valued Customer'}!
            </Heading>
            <Text color="gray.600">
              Here's what's happening with your accounts
            </Text>
          </Box>

        {/* Total Balance Card */}
        <Box
          bg="vaultbank.500"
          color="white"
          borderRadius="lg"
          p={8}
          boxShadow="lg"
        >
          <Text fontSize="lg" mb={2} opacity={0.9}>
            Total Balance Across All Accounts
          </Text>
          <Text fontSize="4xl" fontWeight="bold">
            {formatCurrency(totalBalance)}
          </Text>
        </Box>

        {/* Accounts Grid */}
        <Box>
          <Heading size="md" mb={4}>
            Accounts
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {accounts.map(account => (
              <AccountCard key={account.id} account={account} />
            ))}
          </SimpleGrid>
        </Box>

        {/* Credit Cards */}
        {creditCards.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Credit Cards
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {creditCards.map(card => (
                <Box
                  key={card.id}
                  bg="white"
                  border="1px"
                  borderColor="gray.200"
                  borderRadius="lg"
                  p={6}
                >
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    Credit Card ending in {card.card_number}
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" mb={1}>
                    {formatCurrency(card.current_balance)}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Current Balance
                  </Text>
                  <Text fontSize="xs" color="gray.600" mt={3}>
                    Payment due: {new Date(card.payment_due_date).toLocaleDateString()}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Recent Transactions
            </Heading>
            <Box bg="white" border="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
              {recentTransactions.map((tx, index) => (
                <Box
                  key={tx.id}
                  px={6}
                  py={4}
                  borderBottom={index < recentTransactions.length - 1 ? '1px' : 'none'}
                  borderColor="gray.100"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Text fontWeight="medium" color="gray.900">
                      {tx.description}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {tx.accountNickname} • {new Date(tx.date).toLocaleDateString()}
                    </Text>
                  </Box>
                  <Text
                    fontWeight="semibold"
                    color={tx.type === 'credit' ? 'green.600' : 'gray.900'}
                  >
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Upcoming Bills */}
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Upcoming Bills</Heading>
            {upcomingBills.length > 0 && (
              <Button
                as={RouterLink}
                to="/bill-pay"
                variant="link"
                colorScheme="vaultbank"
                size="sm"
              >
                View All Bills →
              </Button>
            )}
          </Flex>
          <Box bg="white" border="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
            {upcomingBills.length === 0 ? (
              <Box px={6} py={8} textAlign="center">
                <Text color="gray.500">No upcoming bills scheduled</Text>
                <Button
                  as={RouterLink}
                  to="/bill-pay"
                  mt={4}
                  colorScheme="vaultbank"
                  size="sm"
                >
                  Schedule a Payment
                </Button>
              </Box>
            ) : (
              upcomingBills.map((bill, index) => {
                const payee = (billPay.payees || []).find(p => p.id === bill.payee_id);
                return (
                  <Box
                    key={bill.id}
                    px={6}
                    py={4}
                    borderBottom={index < upcomingBills.length - 1 ? '1px' : 'none'}
                    borderColor="gray.100"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box flex="1">
                      <HStack spacing={3} align="start">
                        <Box>
                          <Text fontWeight="medium" color="gray.900">
                            {payee?.name || 'Unknown Payee'}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Due {formatScheduleDate(getScheduledDate(bill))}
                          </Text>
                        </Box>
                        <Badge colorScheme={bill.frequency === 'once' ? 'gray' : 'blue'} variant="subtle">
                          {bill.frequency}
                        </Badge>
                      </HStack>
                    </Box>
                    <Text fontWeight="semibold" color="vaultbank.600" fontSize="lg">
                      {formatCurrency(bill.amount)}
                    </Text>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        {/* Scheduled Transfers */}
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md">Scheduled Transfers</Heading>
            {upcomingTransfers.length > 0 && (
              <Button
                as={RouterLink}
                to="/transfers"
                variant="link"
                colorScheme="vaultbank"
                size="sm"
              >
                View All Transfers →
              </Button>
            )}
          </Flex>
          <Box bg="white" border="1px" borderColor="gray.200" borderRadius="lg" overflow="hidden">
            {upcomingTransfers.length === 0 ? (
              <Box px={6} py={8} textAlign="center">
                <Text color="gray.500">No scheduled transfers</Text>
                <Button
                  as={RouterLink}
                  to="/transfers"
                  mt={4}
                  colorScheme="vaultbank"
                  size="sm"
                >
                  Schedule a Transfer
                </Button>
              </Box>
            ) : (
              upcomingTransfers.map((transfer, index) => {
                const fromAccount = accounts.find(a => a.id === transfer.from_account_id);
                const toAccount = accounts.find(a => a.id === transfer.to_account_id);
                return (
                  <Box
                    key={transfer.id}
                    px={6}
                    py={4}
                    borderBottom={index < upcomingTransfers.length - 1 ? '1px' : 'none'}
                    borderColor="gray.100"
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box flex="1">
                      <HStack spacing={3} align="start">
                        <Box>
                          <Text fontWeight="medium" color="gray.900">
                            {fromAccount?.nickname || 'From Account'} → {toAccount?.nickname || 'To Account'}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            Scheduled for {formatScheduleDate(getScheduledDate(transfer))}
                          </Text>
                        </Box>
                        <Badge colorScheme={transfer.frequency === 'once' ? 'gray' : 'blue'} variant="subtle">
                          {transfer.frequency}
                        </Badge>
                      </HStack>
                    </Box>
                    <Text fontWeight="semibold" color="vaultbank.600" fontSize="lg">
                      {formatCurrency(transfer.amount)}
                    </Text>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Flex>
      </Box>
    </Box>
  );
};

export default Dashboard;
