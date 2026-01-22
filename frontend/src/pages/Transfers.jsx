import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Card,
  CardBody,
  SimpleGrid,
  Divider,
  useToast,
  Badge,
  RadioGroup,
  Radio,
  Alert,
  AlertIcon,
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
  IconButton,
  Flex,
} from '@chakra-ui/react';
import { ChevronRightIcon, ArrowForwardIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrency, formatDate, formatTime, maskAccountNumber } from '../utils/formatters';

const Transfers = () => {
  const navigate = useNavigate();
  const { state, refreshState, updateState } = useStateContext();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('transfer'); // 'transfer' or 'history'
  const [transferType, setTransferType] = useState('internal'); // 'internal' or 'external'
  const [step, setStep] = useState(1); // 1: Form, 2: Review, 3: Success
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [memo, setMemo] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // External transfer fields
  const [externalAccountName, setExternalAccountName] = useState('');
  const [externalAccountNumber, setExternalAccountNumber] = useState('');
  const [externalRoutingNumber, setExternalRoutingNumber] = useState('');
  const [externalAccountType, setExternalAccountType] = useState('checking');

  // Edit mode for scheduled transfers
  const [editingTransferId, setEditingTransferId] = useState(null);

  const accounts = state?.data?.accounts || [];
  const creditCards = state?.data?.credit_cards || [];
  const transferHistory = state?.data?.transfers?.history || [];
  const scheduledTransfers = state?.data?.transfers?.scheduled || [];

  // Filter accounts for transfers (checking and savings)
  const eligibleAccounts = accounts.filter(acc =>
    acc.status === 'active' && acc.type !== 'cd'
  );

  // Get selected account details
  const fromAccount = eligibleAccounts.find(acc => acc.id === fromAccountId);
  const toAccount = eligibleAccounts.find(acc => acc.id === toAccountId);

  // Set default from account on load
  useEffect(() => {
    if (eligibleAccounts.length > 0 && !fromAccountId) {
      setFromAccountId(eligibleAccounts[0].id);
    }
  }, [eligibleAccounts, fromAccountId]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!fromAccountId) {
      newErrors.fromAccount = 'Please select a source account';
    }

    if (transferType === 'internal') {
      if (!toAccountId) {
        newErrors.toAccount = 'Please select a destination account';
      }
      if (fromAccountId === toAccountId) {
        newErrors.toAccount = 'Source and destination accounts must be different';
      }
    } else if (transferType === 'external') {
      if (!externalAccountName) {
        newErrors.externalAccountName = 'Please enter the account holder name';
      }
      if (!externalAccountNumber || externalAccountNumber.length < 4) {
        newErrors.externalAccountNumber = 'Please enter a valid account number';
      }
      if (!externalRoutingNumber || externalRoutingNumber.length !== 9) {
        newErrors.externalRoutingNumber = 'Please enter a valid 9-digit routing number';
      }
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (fromAccount && parseFloat(amount) > fromAccount.available_balance) {
      newErrors.amount = 'Insufficient funds in source account';
    }

    if (frequency !== 'once' && !scheduledDate) {
      newErrors.scheduledDate = 'Please select a date for the transfer';
    }

    if (scheduledDate) {
      const date = new Date(scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) {
        newErrors.scheduledDate = 'Transfer date must be today or in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - move to review
  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      setStep(2);
    }
  };

  // Execute transfer
  const executeTransfer = async () => {
    setIsProcessing(true);

    try {
      // Generate reference number
      const ref = 'TXF' + Date.now().toString().slice(-8);
      setReferenceNumber(ref);

      const transferDate = scheduledDate ? new Date(scheduledDate).toISOString() : new Date().toISOString();
      const transferAmount = parseFloat(amount);

      // Create transfer record
      const transfer = {
        id: 'transfer_' + Date.now(),
        from_account_id: fromAccountId,
        amount: transferAmount,
        date: transferDate,
        status: (frequency !== 'once' || scheduledDate) ? 'pending' : 'completed',
        type: transferType,
        frequency: frequency,
        memo: memo,
        reference_number: ref,
      };

      if (transferType === 'internal') {
        transfer.to_account_id = toAccountId;
      } else {
        transfer.external_account = {
          name: externalAccountName,
          account_number: externalAccountNumber.slice(-4), // Only store last 4
          routing_number: externalRoutingNumber,
          account_type: externalAccountType,
        };
      }

      // For immediate transfers (non-recurring, no scheduled date), update balances
      if (frequency === 'once' && !scheduledDate) {
        const transactionTimestamp = new Date().toISOString();
        const updatedAccounts = accounts.map(account => {
          if (account.id === fromAccountId) {
            const toName = transferType === 'internal'
              ? toAccount?.nickname
              : externalAccountName;
            return {
              ...account,
              current_balance: account.current_balance - transferAmount,
              available_balance: account.available_balance - transferAmount,
              transactions: [
                {
                  id: 'tx_' + Date.now(),
                  date: transactionTimestamp,
                  post_date: transactionTimestamp,
                  transaction_time: formatTime(transactionTimestamp),
                  description: `Transfer to ${toName || 'Account'}`,
                  amount: -transferAmount,
                  transaction_amount: transferAmount,
                  billing_amount: transferAmount,
                  transaction_currency: account.currency || 'USD',
                  billing_currency: account.currency || 'USD',
                  running_balance: account.current_balance - transferAmount,
                  category: 'Transfer',
                  type: 'debit',
                  merchant: toName,
                  merchant_name: toName || 'Transfer',
                  area_district: 'Online',
                  country_region: 'United States',
                  card_number: account.account_number,
                },
                ...(account.transactions || []),
              ],
            };
          }
          // For internal transfers, credit the destination account
          if (transferType === 'internal' && account.id === toAccountId) {
            return {
              ...account,
              current_balance: account.current_balance + transferAmount,
              available_balance: account.available_balance + transferAmount,
              transactions: [
                {
                  id: 'tx_' + Date.now() + 1,
                  date: transactionTimestamp,
                  post_date: transactionTimestamp,
                  transaction_time: formatTime(transactionTimestamp),
                  description: `Transfer from ${fromAccount?.nickname || 'Account'}`,
                  amount: transferAmount,
                  transaction_amount: transferAmount,
                  billing_amount: transferAmount,
                  transaction_currency: account.currency || 'USD',
                  billing_currency: account.currency || 'USD',
                  running_balance: account.current_balance + transferAmount,
                  category: 'Transfer',
                  type: 'credit',
                  merchant: fromAccount?.nickname,
                  merchant_name: fromAccount?.nickname || 'Transfer',
                  area_district: 'Online',
                  country_region: 'United States',
                  card_number: account.account_number,
                },
                ...(account.transactions || []),
              ],
            };
          }
          return account;
        });

        // Update state with account changes and history
        await updateState({
          data: {
            accounts: updatedAccounts,
            transfers: {
              history: [...transferHistory, transfer],
            },
          },
          note: `Transfer from ${fromAccount?.nickname}`,
        });
      } else {
        // For scheduled or recurring transfers, add to scheduled list
        await updateState({
          data: {
            transfers: {
              history: transferHistory,
              scheduled: [...scheduledTransfers, transfer],
            },
          },
          note: `Scheduled ${frequency} transfer`,
        });
      }

      // Show success message
      const isScheduled = frequency !== 'once' || scheduledDate;
      toast({
        title: isScheduled ? 'Transfer Scheduled' : 'Transfer Successful',
        description: `Your transfer of ${formatCurrency(transferAmount)} has been ${isScheduled ? 'scheduled' : 'completed'}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setStep(3);
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'An error occurred while processing your transfer.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStep(1);
    setAmount('');
    setScheduledDate('');
    setFrequency('once');
    setMemo('');
    setToAccountId('');
    setExternalAccountName('');
    setExternalAccountNumber('');
    setExternalRoutingNumber('');
    setExternalAccountType('checking');
    setErrors({});
    setReferenceNumber('');
    setEditingTransferId(null);
  };

  // Cancel scheduled transfer
  const cancelScheduledTransfer = async (transferId) => {
    try {
      const updatedScheduled = scheduledTransfers.filter(t => t.id !== transferId);
      await updateState({
        data: {
          transfers: {
            history: transferHistory,
            scheduled: updatedScheduled,
          },
        },
        note: 'Cancelled scheduled transfer',
      });

      toast({
        title: 'Transfer Cancelled',
        description: 'Your scheduled transfer has been cancelled.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'An error occurred while cancelling the transfer.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Helper function to get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge colorScheme="green">Completed</Badge>;
      case 'pending':
        return <Badge colorScheme="yellow">Pending</Badge>;
      case 'failed':
        return <Badge colorScheme="red">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Container maxW="container.xl" py={8} mt="64px">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Transfer Money
          </Heading>
          <Text color="gray.600">
            Move money between your accounts or to external accounts
          </Text>
        </Box>

        {/* Tabs */}
        <Tabs onChange={(index) => setActiveTab(index === 0 ? 'transfer' : 'history')}>
          <TabList>
            <Tab>Make Transfer</Tab>
            <Tab>Transfer History</Tab>
            {scheduledTransfers.length > 0 && <Tab>Scheduled Transfers</Tab>}
          </TabList>

          <TabPanels>
            {/* Make Transfer Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">

        {step === 1 && (
          <>
            {/* Transfer Type Selection */}
            <Card>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Transfer Type</Heading>
                  <RadioGroup value={transferType} onChange={(value) => {
                    setTransferType(value);
                    setErrors({});
                  }}>
                    <VStack spacing={3} align="start">
                      <Radio value="internal">
                        <Box>
                          <Text fontWeight="medium">Between My Accounts</Text>
                          <Text fontSize="sm" color="gray.600">
                            Transfer between your checking and savings accounts
                          </Text>
                        </Box>
                      </Radio>
                      <Radio value="external">
                        <Box>
                          <Text fontWeight="medium">External Transfer</Text>
                          <Text fontSize="sm" color="gray.600">
                            Send money to another bank account
                          </Text>
                        </Box>
                      </Radio>
                    </VStack>
                  </RadioGroup>
                </VStack>
              </CardBody>
            </Card>

            {/* Transfer Form */}
            <Card>
              <CardBody>
                <form onSubmit={handleSubmit}>
                  <VStack spacing={6} align="stretch">
                    {/* From Account */}
                    <FormControl isInvalid={errors.fromAccount}>
                      <FormLabel>From Account</FormLabel>
                      <Select
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        placeholder="Select account"
                      >
                        {eligibleAccounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.nickname} - {maskAccountNumber(account.account_number)} ({formatCurrency(account.available_balance)})
                          </option>
                        ))}
                      </Select>
                      <FormErrorMessage>{errors.fromAccount}</FormErrorMessage>
                    </FormControl>

                    {/* To Account (Internal) or External Account Fields */}
                    {transferType === 'internal' ? (
                      <FormControl isInvalid={errors.toAccount}>
                        <FormLabel>To Account</FormLabel>
                        <Select
                          value={toAccountId}
                          onChange={(e) => setToAccountId(e.target.value)}
                          placeholder="Select destination account"
                        >
                          {eligibleAccounts
                            .filter(acc => acc.id !== fromAccountId)
                            .map(account => (
                              <option key={account.id} value={account.id}>
                                {account.nickname} - {maskAccountNumber(account.account_number)}
                              </option>
                            ))}
                        </Select>
                        <FormErrorMessage>{errors.toAccount}</FormErrorMessage>
                      </FormControl>
                    ) : (
                      <>
                        <FormControl isInvalid={errors.externalAccountName}>
                          <FormLabel>Account Holder Name</FormLabel>
                          <Input
                            value={externalAccountName}
                            onChange={(e) => setExternalAccountName(e.target.value)}
                            placeholder="Enter account holder name"
                          />
                          <FormErrorMessage>{errors.externalAccountName}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.externalAccountNumber}>
                          <FormLabel>Account Number</FormLabel>
                          <Input
                            value={externalAccountNumber}
                            onChange={(e) => setExternalAccountNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter account number"
                            type="text"
                          />
                          <FormErrorMessage>{errors.externalAccountNumber}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={errors.externalRoutingNumber}>
                          <FormLabel>Routing Number</FormLabel>
                          <Input
                            value={externalRoutingNumber}
                            onChange={(e) => setExternalRoutingNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter 9-digit routing number"
                            maxLength={9}
                          />
                          <FormErrorMessage>{errors.externalRoutingNumber}</FormErrorMessage>
                        </FormControl>

                        <FormControl>
                          <FormLabel>Account Type</FormLabel>
                          <Select
                            value={externalAccountType}
                            onChange={(e) => setExternalAccountType(e.target.value)}
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </Select>
                        </FormControl>
                      </>
                    )}

                    {/* Amount */}
                    <FormControl isInvalid={errors.amount}>
                      <FormLabel>Amount</FormLabel>
                      <NumberInput
                        value={amount}
                        onChange={(value) => setAmount(value)}
                        min={0.01}
                        precision={2}
                      >
                        <NumberInputField placeholder="0.00" />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      {fromAccount && (
                        <Text fontSize="sm" color="gray.600" mt={2}>
                          Available: {formatCurrency(fromAccount.available_balance)}
                        </Text>
                      )}
                      <FormErrorMessage>{errors.amount}</FormErrorMessage>
                    </FormControl>

                    {/* Frequency Selection */}
                    <FormControl>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                      >
                        <option value="once">One-time Transfer</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </Select>
                    </FormControl>

                    {/* Scheduled Date (for recurring or future-dated transfers) */}
                    {frequency !== 'once' && (
                      <Alert status="info">
                        <AlertIcon />
                        <Text>This will be a recurring transfer. Please select when the first transfer should occur.</Text>
                      </Alert>
                    )}

                    <FormControl isInvalid={errors.scheduledDate}>
                      <FormLabel>{frequency !== 'once' ? 'First Transfer Date' : 'Transfer Date (Optional)'}</FormLabel>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                      {frequency === 'once' && !scheduledDate && (
                        <Text fontSize="sm" color="gray.600" mt={2}>
                          Leave blank for immediate transfer
                        </Text>
                      )}
                      <FormErrorMessage>{errors.scheduledDate}</FormErrorMessage>
                    </FormControl>

                    {/* Memo */}
                    <FormControl>
                      <FormLabel>Memo (Optional)</FormLabel>
                      <Textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="Add a note for this transfer"
                        rows={3}
                      />
                    </FormControl>

                    <Divider />

                    {/* Action Buttons */}
                    <HStack spacing={4} justify="flex-end">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/')}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        colorScheme="vaultbank"
                        rightIcon={<ArrowForwardIcon />}
                      >
                        Review Transfer
                      </Button>
                    </HStack>
                  </VStack>
                </form>
              </CardBody>
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            {/* Review Transfer */}
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Heading size="md" mb={2}>Review Transfer Details</Heading>
                    <Text color="gray.600">Please review your transfer before submitting</Text>
                  </Box>

                  <Divider />

                  {/* Transfer Summary */}
                  <SimpleGrid columns={2} spacing={6}>
                    <Box>
                      <Text fontSize="sm" color="gray.600">From Account</Text>
                      <Text fontWeight="medium" fontSize="lg">
                        {fromAccount?.nickname}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {maskAccountNumber(fromAccount?.account_number)}
                      </Text>
                    </Box>

                    <Box>
                      <Text fontSize="sm" color="gray.600">
                        {transferType === 'internal' ? 'To Account' : 'To (External)'}
                      </Text>
                      <Text fontWeight="medium" fontSize="lg">
                        {transferType === 'internal'
                          ? toAccount?.nickname
                          : externalAccountName}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        {transferType === 'internal'
                          ? maskAccountNumber(toAccount?.account_number)
                          : `****${externalAccountNumber.slice(-4)} (${externalAccountType})`}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Box bg="vaultbank.50" p={6} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" color="gray.600" mb={1}>Transfer Amount</Text>
                    <Text fontSize="4xl" fontWeight="bold" color="vaultbank.600">
                      {formatCurrency(parseFloat(amount))}
                    </Text>
                  </Box>

                  <VStack spacing={3} align="stretch" divider={<Divider />}>
                    {memo && (
                      <HStack justify="space-between">
                        <Text color="gray.600">Memo</Text>
                        <Text fontWeight="medium">{memo}</Text>
                      </HStack>
                    )}

                    <HStack justify="space-between">
                      <Text color="gray.600">Frequency</Text>
                      <Badge colorScheme={frequency === 'once' ? 'gray' : 'purple'}>
                        {frequency === 'once' ? 'One-time' :
                         frequency === 'weekly' ? 'Weekly' :
                         frequency === 'biweekly' ? 'Every 2 Weeks' :
                         frequency === 'monthly' ? 'Monthly' : 'Yearly'}
                      </Badge>
                    </HStack>

                    {scheduledDate && (
                      <HStack justify="space-between">
                        <Text color="gray.600">{frequency !== 'once' ? 'First Transfer Date' : 'Transfer Date'}</Text>
                        <Text fontWeight="medium">{formatDate(scheduledDate)}</Text>
                      </HStack>
                    )}

                    <HStack justify="space-between">
                      <Text color="gray.600">Type</Text>
                      <Badge colorScheme={transferType === 'internal' ? 'blue' : 'orange'}>
                        {transferType === 'internal' ? 'Internal Transfer' : 'External Transfer'}
                      </Badge>
                    </HStack>

                    <HStack justify="space-between">
                      <Text color="gray.600">Availability</Text>
                      <Text fontWeight="medium">
                        {frequency !== 'once' ? 'Recurring transfer' :
                         scheduledDate ? 'Scheduled for future date' : 'Immediate'}
                      </Text>
                    </HStack>
                  </VStack>

                  {transferType === 'external' && (
                    <Alert status="info">
                      <AlertIcon />
                      <Text>External transfers typically take 1-3 business days to complete.</Text>
                    </Alert>
                  )}

                  {amount && parseFloat(amount) > fromAccount?.available_balance && (
                    <Alert status="warning">
                      <AlertIcon />
                      <Text>Warning: This transfer exceeds your available balance and may result in overdraft fees.</Text>
                    </Alert>
                  )}

                  <Divider />

                  {/* Action Buttons */}
                  <HStack spacing={4} justify="flex-end">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      isDisabled={isProcessing}
                    >
                      Back
                    </Button>
                    <Button
                      colorScheme="vaultbank"
                      onClick={executeTransfer}
                      isLoading={isProcessing}
                      loadingText="Processing..."
                    >
                      Confirm Transfer
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </>
        )}

        {step === 3 && (
          <>
            {/* Success */}
            <Card>
              <CardBody>
                <VStack spacing={6} align="center" textAlign="center" py={8}>
                  <Box
                    w="16"
                    h="16"
                    borderRadius="full"
                    bg="green.100"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text fontSize="3xl" color="green.600">✓</Text>
                  </Box>

                  <Box>
                    <Heading size="lg" mb={2}>
                      {(frequency !== 'once' || scheduledDate) ? 'Transfer Scheduled' : 'Transfer Successful'}
                    </Heading>
                    <Text color="gray.600">
                      {frequency !== 'once'
                        ? `Your ${frequency} recurring transfer has been scheduled`
                        : scheduledDate
                        ? `Your transfer has been scheduled for ${formatDate(scheduledDate)}`
                        : 'Your transfer has been completed successfully'
                      }
                    </Text>
                  </Box>

                  <Box bg="gray.50" p={6} borderRadius="md" width="100%" maxW="md">
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <Text color="gray.600">Reference Number</Text>
                        <Text fontWeight="bold" fontFamily="mono">
                          {referenceNumber}
                        </Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="gray.600">Amount</Text>
                        <Text fontWeight="bold">{formatCurrency(parseFloat(amount))}</Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="gray.600">From</Text>
                        <Text fontWeight="medium">{fromAccount?.nickname}</Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text color="gray.600">To</Text>
                        <Text fontWeight="medium">
                          {transferType === 'internal'
                            ? toAccount?.nickname
                            : externalAccountName}
                        </Text>
                      </HStack>

                      {frequency !== 'once' && (
                        <HStack justify="space-between">
                          <Text color="gray.600">Frequency</Text>
                          <Text fontWeight="medium" textTransform="capitalize">{frequency}</Text>
                        </HStack>
                      )}
                    </VStack>
                  </Box>

                  <HStack spacing={4}>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/')}
                    >
                      Back to Dashboard
                    </Button>
                    <Button
                      colorScheme="vaultbank"
                      onClick={resetForm}
                    >
                      Make Another Transfer
                    </Button>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </>
        )}
              </VStack>
            </TabPanel>

            {/* Transfer History Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Transfer History</Heading>

                {transferHistory.length === 0 ? (
                  <Card>
                    <CardBody textAlign="center" py={8}>
                      <Text color="gray.600">No transfer history yet. Make your first transfer to see it here.</Text>
                    </CardBody>
                  </Card>
                ) : (
                  <Card overflowX="auto">
                    <CardBody>
                      <Table>
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>From</Th>
                            <Th>To</Th>
                            <Th>Amount</Th>
                            <Th>Type</Th>
                            <Th>Status</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {transferHistory.slice().reverse().map((transfer) => {
                            const fromAccount = accounts.find(a => a.id === transfer.from_account_id);
                            const toAccount = transfer.to_account_id
                              ? accounts.find(a => a.id === transfer.to_account_id)
                              : null;

                            return (
                              <Tr key={transfer.id}>
                                <Td>{formatDate(transfer.date)}</Td>
                                <Td>
                                  {fromAccount?.nickname || 'Unknown'}
                                  <Text fontSize="xs" color="gray.500">
                                    {maskAccountNumber(fromAccount?.account_number)}
                                  </Text>
                                </Td>
                                <Td>
                                  {transfer.type === 'internal'
                                    ? (toAccount?.nickname || 'Unknown')
                                    : transfer.external_account?.name || 'External Account'}
                                  <Text fontSize="xs" color="gray.500">
                                    {transfer.type === 'internal'
                                      ? maskAccountNumber(toAccount?.account_number)
                                      : `****${transfer.external_account?.account_number || ''}`}
                                  </Text>
                                </Td>
                                <Td fontWeight="medium">{formatCurrency(transfer.amount)}</Td>
                                <Td>
                                  <Badge colorScheme={transfer.type === 'internal' ? 'blue' : 'orange'}>
                                    {transfer.type === 'internal' ? 'Internal' : 'External'}
                                  </Badge>
                                </Td>
                                <Td>{getStatusBadge(transfer.status)}</Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* Scheduled Transfers Tab */}
            {scheduledTransfers.length > 0 && (
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  <Heading size="md">Scheduled Transfers</Heading>

                  {scheduledTransfers.length === 0 ? (
                    <Card>
                      <CardBody textAlign="center" py={8}>
                        <Text color="gray.600">No scheduled transfers. Set up a recurring transfer to see it here.</Text>
                      </CardBody>
                    </Card>
                  ) : (
                    <SimpleGrid columns={1} spacing={4}>
                      {scheduledTransfers.map((transfer) => {
                        const fromAccount = accounts.find(a => a.id === transfer.from_account_id);
                        const toAccount = transfer.to_account_id
                          ? accounts.find(a => a.id === transfer.to_account_id)
                          : null;

                        return (
                          <Card key={transfer.id}>
                            <CardBody>
                              <Flex justify="space-between" align="center">
                                <Box flex="1">
                                  <HStack spacing={4} mb={2}>
                                    <Text fontWeight="bold" fontSize="lg">
                                      {formatCurrency(transfer.amount)}
                                    </Text>
                                    <Badge colorScheme="purple" textTransform="capitalize">
                                      {transfer.frequency}
                                    </Badge>
                                    <Badge colorScheme="yellow">Pending</Badge>
                                  </HStack>

                                  <VStack spacing={1} align="start">
                                    <Text fontSize="sm">
                                      <Text as="span" color="gray.600">From:</Text> {fromAccount?.nickname || 'Unknown'} ({maskAccountNumber(fromAccount?.account_number)})
                                    </Text>
                                                                    <Text fontSize="sm">
                                      <Text as="span" color="gray.600">To:</Text>{' '}
                                      {transfer.type === 'internal'
                                        ? (toAccount?.nickname || 'Unknown')
                                        : transfer.external_account?.name || 'External Account'}
                                    </Text>
                                    <Text fontSize="sm">
                                      <Text as="span" color="gray.600">Start Date:</Text> {formatDate(transfer.date)}
                                    </Text>
                                    {transfer.memo && (
                                      <Text fontSize="sm" color="gray.600">
                                        "{transfer.memo}"
                                      </Text>
                                    )}
                                  </VStack>
                                </Box>

                                <HStack>
                                  <IconButton
                                    icon={<DeleteIcon />}
                                    colorScheme="red"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => cancelScheduledTransfer(transfer.id)}
                                    aria-label="Cancel transfer"
                                  />
                                </HStack>
                              </Flex>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </SimpleGrid>
                  )}
                </VStack>
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
};

export default Transfers;
