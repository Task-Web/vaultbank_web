import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Text,
  VStack,
  HStack,
  Divider,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  SimpleGrid,
  Card,
  CardBody,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import { ArrowBackIcon, ArrowForwardIcon, CheckIcon, DeleteIcon, EditIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useStateContext } from '../contexts/StateContext';
import { formatTime } from '../utils/formatters';

const BillPay = () => {
  const { state, updateState } = useStateContext();
  const navigate = useNavigate();
  const toast = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Pay Bills form state
  const [paymentForm, setPaymentForm] = useState({
    payeeId: '',
    fromAccountId: '',
    amount: '',
    paymentDate: '',
    frequency: 'once',
    memo: '',
  });

  // Payee management state
  const [payeeForm, setPayeeForm] = useState({
    name: '',
    accountNumber: '',
    address: '',
    nickname: '',
  });
  const [editingPayee, setEditingPayee] = useState(null);
  const [showPayeeModal, setShowPayeeModal] = useState(false);

  // Payment review state
  const [showPaymentReview, setShowPaymentReview] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Get data from state with defaults
  // State structure: { state: { data: { accounts, bill_pay, data: { bill_pay, ... } } } }
  const stateData = state?.data || {};
  // Bill pay data is nested at data.data.bill_pay
  const nestedData = stateData?.data || {};
  const billPay = nestedData?.bill_pay || stateData?.bill_pay || {
    payees: [],
    scheduled_payments: [],
    payment_history: [],
  };

  // Ensure arrays are always defined
  const payees = billPay.payees || [];
  const scheduledPayments = billPay.scheduled_payments || [];
  const paymentHistory = billPay.payment_history || [];
  const accounts = stateData?.accounts || [];

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isFutureDate = (dateString) => {
    if (!dateString) return false;
    const selected = new Date(dateString);
    const today = new Date();
    selected.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return selected > today;
  };

  const isScheduledStatus = (status) => (
    status === 'active' || status === 'pending' || status === 'scheduled'
  );

  const getScheduledPaymentDate = (payment) => payment?.next_date || payment?.date;

  // Calculate delivery date estimate
  const calculateDeliveryDate = (paymentDate) => {
    const date = new Date(paymentDate);
    date.setDate(date.getDate() + 3); // Standard 3 business day delivery
    return formatDate(date);
  };

  // Handle payment form input
  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle payee form input
  const handlePayeeInputChange = (e) => {
    const { name, value } = e.target;
    setPayeeForm((prev) => ({ ...prev, [name]: value }));
  };

  // Open payee modal for new payee
  const openAddPayeeModal = () => {
    setPayeeForm({
      name: '',
      accountNumber: '',
      address: '',
      nickname: '',
    });
    setEditingPayee(null);
    setShowPayeeModal(true);
  };

  // Open payee modal for editing
  const openEditPayeeModal = (payee) => {
    setPayeeForm({
      name: payee.name,
      accountNumber: payee.account_number,
      address: payee.address,
      nickname: payee.nickname || '',
    });
    setEditingPayee(payee);
    setShowPayeeModal(true);
  };

  // Save payee
  const savePayee = async () => {
    const payeeData = {
      id: editingPayee ? editingPayee.id : `payee_${Date.now()}`,
      name: payeeForm.name,
      account_number: payeeForm.accountNumber,
      address: payeeForm.address,
      nickname: payeeForm.nickname || undefined,
    };

    let updatedPayees;
    if (editingPayee) {
      updatedPayees = payees.map((p) =>
        p.id === editingPayee.id ? payeeData : p
      );
    } else {
      updatedPayees = [...payees, payeeData];
    }

    await updateState({
      data: {
        bill_pay: {
          ...billPay,
          payees: updatedPayees,
        },
      },
      note: editingPayee ? 'Update payee' : 'Add new payee',
    });

    setShowPayeeModal(false);
    toast({
      title: editingPayee ? 'Payee updated' : 'Payee added',
      description: `${payeeData.name} has been ${editingPayee ? 'updated' : 'added'}.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Delete payee
  const deletePayee = async (payeeId) => {
    const updatedPayees = payees.filter((p) => p.id !== payeeId);
    await updateState({
      data: {
        bill_pay: {
          ...billPay,
          payees: updatedPayees,
        },
      },
      note: 'Delete payee',
    });
    toast({
      title: 'Payee deleted',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Review payment
  const reviewPayment = () => {
    if (!paymentForm.payeeId || !paymentForm.fromAccountId || !paymentForm.amount) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid positive amount.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const fromAccount = accounts.find((a) => a.id === paymentForm.fromAccountId);
    if (fromAccount && amount > fromAccount.available_balance) {
      toast({
        title: 'Insufficient funds',
        description: 'Your account does not have enough funds for this payment.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const payee = payees.find((p) => p.id === paymentForm.payeeId);
    setPendingPayment({
      payee,
      fromAccount,
      amount,
      paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
      frequency: paymentForm.frequency,
      memo: paymentForm.memo,
    });
    setShowPaymentReview(true);
  };

  // Confirm payment
  const confirmPayment = async () => {
    setProcessingPayment(true);

    const paymentId = `PAY${Date.now()}`;
    const paymentDate = pendingPayment.paymentDate;
    const isScheduled = pendingPayment.frequency !== 'once' || isFutureDate(paymentDate);

    // Create payment record
    const paymentRecord = {
      id: paymentId,
      payee_id: pendingPayment.payee.id,
      payee_name: pendingPayment.payee.name,
      amount: pendingPayment.amount,
      from_account_id: pendingPayment.fromAccount.id,
      from_account_name: pendingPayment.fromAccount.nickname,
      date: paymentDate,
      frequency: pendingPayment.frequency,
      memo: pendingPayment.memo,
      status: isScheduled ? 'active' : 'completed',
      created_at: new Date().toISOString(),
      ...(isScheduled ? { next_date: paymentDate } : {}),
    };

    // Update account balance for one-time payments
    let updatedAccounts = [...accounts];
    if (!isScheduled) {
      const paymentTimestamp = new Date().toISOString();
      updatedAccounts = accounts.map((acc) => {
        if (acc.id === pendingPayment.fromAccount.id) {
          const newBalance = acc.current_balance - pendingPayment.amount;
          return {
            ...acc,
            current_balance: newBalance,
            available_balance: newBalance,
            transactions: [
              {
                id: `txn_${Date.now()}`,
                date: paymentTimestamp,
                post_date: paymentTimestamp,
                transaction_time: formatTime(paymentTimestamp),
                description: `Payment to ${pendingPayment.payee.name}`,
                amount: -pendingPayment.amount,
                transaction_amount: pendingPayment.amount,
                billing_amount: pendingPayment.amount,
                transaction_currency: acc.currency || 'USD',
                billing_currency: acc.currency || 'USD',
                running_balance: newBalance,
                category: 'Bill Payment',
                type: 'debit',
                merchant: pendingPayment.payee.name,
                merchant_name: pendingPayment.payee.name,
                area_district: 'Online',
                country_region: 'United States',
                card_number: acc.account_number,
              },
              ...acc.transactions,
            ],
          };
        }
        return acc;
      });
    }

    // Update state
    const updatedBillPay = {
      ...billPay,
      payment_history: [
        paymentRecord,
        ...paymentHistory,
      ],
      scheduled_payments: isScheduled
        ? [
            paymentRecord,
            ...scheduledPayments,
          ]
        : scheduledPayments,
    };

    await updateState({
      data: {
        accounts: updatedAccounts,
        bill_pay: updatedBillPay,
      },
      note: `Process bill payment to ${pendingPayment.payee.name}`,
    });

    setProcessingPayment(false);
    setShowPaymentReview(false);

    // Reset form
    setPaymentForm({
      payeeId: '',
      fromAccountId: '',
      amount: '',
      paymentDate: '',
      frequency: 'once',
      memo: '',
    });

    toast({
      title: 'Payment successful',
      description: `Your payment of ${formatCurrency(pendingPayment.amount)} to ${pendingPayment.payee.name} has been ${isScheduled ? 'scheduled' : 'processed'}.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  // Cancel scheduled payment
  const cancelScheduledPayment = async (paymentId) => {
    // Remove the payment from scheduled payments
    const updatedPayments = scheduledPayments.filter((p) => p.id !== paymentId);

    await updateState({
      data: {
        bill_pay: {
          ...billPay,
          scheduled_payments: updatedPayments,
        },
      },
      note: 'Cancel scheduled payment',
    });

    toast({
      title: 'Payment cancelled',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Get frequency badge color
  const getFrequencyBadgeColor = (frequency) => {
    switch (frequency) {
      case 'once':
        return 'blue';
      case 'weekly':
        return 'purple';
      case 'monthly':
        return 'green';
      case 'yearly':
        return 'orange';
      default:
        return 'gray';
    }
  };

  return (
    <Container maxW="1200px" py={8}>
      {/* Header */}
      <Box mb={6}>
        <Heading size="lg" color="gray.800">
          Bill Pay
        </Heading>
        <Text color="gray.600" mt={1}>
          Pay your bills easily and securely
        </Text>
      </Box>

      {/* Tabs */}
      <Tabs onChange={(index) => setActiveTab(index)}>
        <TabList>
          <Tab>Pay Bills</Tab>
          <Tab>Payees</Tab>
          <Tab>History</Tab>
          <Tab>Scheduled</Tab>
        </TabList>

        <TabPanels>
          {/* Pay Bills Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Payment Form */}
              <Card>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <Heading size="md" color="gray.700">
                      Make a Payment
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>From Account</FormLabel>
                      <Select
                        name="fromAccountId"
                        value={paymentForm.fromAccountId}
                        onChange={handlePaymentInputChange}
                        placeholder="Select account"
                      >
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.nickname} - ****{account.account_number.slice(-4)} (
                            {formatCurrency(account.available_balance)})
                          </option>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Payee</FormLabel>
                      <Select
                        name="payeeId"
                        value={paymentForm.payeeId}
                        onChange={handlePaymentInputChange}
                        placeholder="Select payee"
                      >
                        {payees.map((payee) => (
                          <option key={payee.id} value={payee.id}>
                            {payee.nickname || payee.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>

                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Amount</FormLabel>
                      <Input
                        name="amount"
                        type="number"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={handlePaymentInputChange}
                        placeholder="0.00"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Payment Date</FormLabel>
                      <Input
                        name="paymentDate"
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={handlePaymentInputChange}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        name="frequency"
                        value={paymentForm.frequency}
                        onChange={handlePaymentInputChange}
                      >
                        <option value="once">One-time</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </Select>
                    </FormControl>
                  </SimpleGrid>

                  <FormControl>
                    <FormLabel>Memo (Optional)</FormLabel>
                    <Input
                      name="memo"
                      value={paymentForm.memo}
                      onChange={handlePaymentInputChange}
                      placeholder="Add a note for this payment"
                    />
                  </FormControl>

                  {paymentForm.fromAccountId && paymentForm.paymentDate && (
                    <Alert status="info" borderRadius="md">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="medium">Estimated Delivery</Text>
                        <Text fontSize="sm">
                          {calculateDeliveryDate(paymentForm.paymentDate)}
                        </Text>
                      </Box>
                    </Alert>
                  )}

                  <Flex>
                    <Spacer />
                    <Button
                      colorScheme="blue"
                      size="lg"
                      onClick={reviewPayment}
                      rightIcon={<ArrowForwardIcon />}
                    >
                      Review Payment
                    </Button>
                  </Flex>
                </VStack>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Payees Tab */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Flex justify="flex-end">
                <Button
                  colorScheme="blue"
                  onClick={openAddPayeeModal}
                  leftIcon={<ExternalLinkIcon />}
                >
                  Add New Payee
                </Button>
              </Flex>

              {payees.length === 0 ? (
                <Card>
                  <CardBody textAlign="center" py={12}>
                    <Text color="gray.500" mb={4}>
                      No payees added yet. Add your first payee to get started.
                    </Text>
                  </CardBody>
                </Card>
              ) : (
                <Card>
                  <CardBody>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Name</Th>
                          <Th>Account Number</Th>
                          <Th>Address</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {payees.map((payee) => (
                          <Tr key={payee.id}>
                            <Td>
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="medium">{payee.name}</Text>
                                {payee.nickname && (
                                  <Text fontSize="sm" color="gray.500">
                                    {payee.nickname}
                                  </Text>
                                )}
                              </VStack>
                            </Td>
                            <Td>{payee.account_number}</Td>
                            <Td>{payee.address}</Td>
                            <Td>
                              <HStack spacing={2}>
                                <IconButton
                                  icon={<EditIcon />}
                                  size="sm"
                                  onClick={() => openEditPayeeModal(payee)}
                                  aria-label="Edit payee"
                                />
                                <IconButton
                                  icon={<DeleteIcon />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => deletePayee(payee.id)}
                                  aria-label="Delete payee"
                                />
                              </HStack>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </CardBody>
                </Card>
              )}
            </VStack>
          </TabPanel>

          {/* History Tab */}
          <TabPanel>
            {paymentHistory.length === 0 ? (
              <Card>
                <CardBody textAlign="center" py={12}>
                  <Text color="gray.500">
                    No payment history yet. Your payment history will appear here.
                  </Text>
                </CardBody>
              </Card>
            ) : (
              <Card>
                <CardBody>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Payee</Th>
                        <Th>Account</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paymentHistory.map((payment) => (
                        <Tr key={payment.id}>
                          <Td>{formatDate(payment.date)}</Td>
                          <Td>{payment.payee_name}</Td>
                          <Td>{payment.from_account_name}</Td>
                          <Td>{formatCurrency(payment.amount)}</Td>
                          <Td>
                            <Badge colorScheme={payment.status === 'completed' ? 'green' : 'yellow'}>
                              {payment.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          {/* Scheduled Tab */}
          <TabPanel>
            {scheduledPayments.length === 0 ? (
              <Card>
                <CardBody textAlign="center" py={12}>
                  <Text color="gray.500" mb={4}>
                    No scheduled payments. Set up recurring payments to see them here.
                  </Text>
                  <Button
                    colorScheme="blue"
                    onClick={() => setActiveTab(0)}
                  >
                    Schedule a Payment
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={4} align="stretch">
                {scheduledPayments
                  .filter((p) => isScheduledStatus(p.status))
                  .map((payment) => (
                    <Card key={payment.id}>
                      <CardBody>
                        <Flex align="center" justify="space-between">
                          <HStack spacing={4}>
                            <Box
                              p={3}
                              borderRadius="md"
                              bg="blue.50"
                              color="blue.600"
                            >
                              <ExternalLinkIcon boxSize={6} />
                            </Box>
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="medium">{payment.payee_name}</Text>
                              <HStack spacing={2}>
                                <Text fontSize="sm" color="gray.600">
                                  {formatCurrency(payment.amount)}
                                </Text>
                                <Badge colorScheme={getFrequencyBadgeColor(payment.frequency)}>
                                  {payment.frequency}
                                </Badge>
                                <Text fontSize="sm" color="gray.500">
                                  • Next: {formatDate(getScheduledPaymentDate(payment))}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => cancelScheduledPayment(payment.id)}
                          >
                            Cancel
                          </Button>
                        </Flex>
                      </CardBody>
                    </Card>
                  ))}
              </VStack>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Payee Modal */}
      <Modal
        isOpen={showPayeeModal}
        onClose={() => setShowPayeeModal(false)}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingPayee ? 'Edit Payee' : 'Add New Payee'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Payee Name</FormLabel>
                <Input
                  name="name"
                  value={payeeForm.name}
                  onChange={handlePayeeInputChange}
                  placeholder="e.g., Electric Company"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Account Number</FormLabel>
                <Input
                  name="accountNumber"
                  value={payeeForm.accountNumber}
                  onChange={handlePayeeInputChange}
                  placeholder="e.g., 123456789"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Address</FormLabel>
                <Input
                  name="address"
                  value={payeeForm.address}
                  onChange={handlePayeeInputChange}
                  placeholder="e.g., 123 Main St, City, State 12345"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Nickname (Optional)</FormLabel>
                <Input
                  name="nickname"
                  value={payeeForm.nickname}
                  onChange={handlePayeeInputChange}
                  placeholder="e.g., Electric Bill"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setShowPayeeModal(false)}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={savePayee}
              isDisabled={!payeeForm.name || !payeeForm.accountNumber || !payeeForm.address}
            >
              {editingPayee ? 'Update Payee' : 'Add Payee'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payment Review Modal */}
      <Modal
        isOpen={showPaymentReview}
        onClose={() => setShowPaymentReview(false)}
        size="lg"
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                Please review your payment details before confirming
              </Alert>

              <SimpleGrid columns={2} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    From
                  </Text>
                  <Text fontWeight="medium">
                    {pendingPayment?.fromAccount?.nickname}
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    ****{pendingPayment?.fromAccount?.account_number?.slice(-4)}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">
                    To
                  </Text>
                  <Text fontWeight="medium">
                    {pendingPayment?.payee?.name}
                  </Text>
                  {pendingPayment?.payee?.nickname && (
                    <Text fontSize="sm" color="gray.500">
                      {pendingPayment.payee.nickname}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Amount
                  </Text>
                  <Text fontWeight="medium" fontSize="xl" color="blue.600">
                    {pendingPayment && formatCurrency(pendingPayment.amount)}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Payment Date
                  </Text>
                  <Text fontWeight="medium">
                    {pendingPayment && formatDate(pendingPayment.paymentDate)}
                  </Text>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Frequency
                  </Text>
                  <Badge colorScheme={pendingPayment && getFrequencyBadgeColor(pendingPayment.frequency)}>
                    {pendingPayment?.frequency}
                  </Badge>
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Estimated Delivery
                  </Text>
                  <Text fontWeight="medium">
                    {pendingPayment && calculateDeliveryDate(pendingPayment.paymentDate)}
                  </Text>
                </Box>
              </SimpleGrid>

              {pendingPayment?.memo && (
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Memo
                  </Text>
                  <Text>{pendingPayment.memo}</Text>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setShowPaymentReview(false)}
              isDisabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={confirmPayment}
              isLoading={processingPayment}
              loadingText="Processing"
            >
              Confirm Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default BillPay;
