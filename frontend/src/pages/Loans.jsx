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
} from '@chakra-ui/react';
import { FiDollarSign, FiFileText, FiTrendingUp, FiCalendar, FiCheckCircle } from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';

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

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const generatePaymentSchedule = (principal, annualRate, months, startDate) => {
  const schedule = [];
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
                        (Math.pow(1 + monthlyRate, months) - 1);

  let balance = principal;

  for (let i = 1; i <= Math.min(months, 60); i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + i);

    schedule.push({
      date: paymentDate.toISOString(),
      amount: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      remaining_balance: Math.max(0, balance),
      status: i <= 12 ? 'paid' : (i === 13 ? 'pending' : 'scheduled'),
    });
  }

  return schedule;
};

const Loans = () => {
  const { state, updateState, loading } = useStateContext();
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [applicationType, setApplicationType] = useState('auto');
  const [extraPaymentAmount, setExtraPaymentAmount] = useState('');
  const [selectedPaymentAccountId, setSelectedPaymentAccountId] = useState('');
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.50', 'gray.900');
  const headerBg = useColorModeValue('gray.50', 'gray.900');
  const accounts = state?.data?.accounts || [];

  // Application form state
  const [applicationForm, setApplicationForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    loanAmount: '',
    term: '60',
    purpose: '',
    vehicleInfo: { make: '', model: '', year: '', vin: '' },
    propertyInfo: { address: '', type: '', value: '' },
  });

  useEffect(() => {
    if (loading) {
      return;
    }
    const storedLoans = Array.isArray(state?.data?.loans) ? state.data.loans : [];
    setLoans(storedLoans);
    setSelectedLoan((currentLoan) => {
      const currentLoanId = currentLoan?.id;
      return storedLoans.find((loan) => loan.id === currentLoanId) || storedLoans[0] || null;
    });
  }, [state, loading]);

  const handleFreezeCard = (loanId) => {
    toast({
      title: 'Feature not available',
      description: 'Card freeze is only available for credit cards and debit cards.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleMakePayment = (loanId) => {
    setIsPaymentModalOpen(true);
    const defaultAccount = accounts.find(acc => acc.type === 'checking') || accounts[0];
    setSelectedPaymentAccountId(defaultAccount?.id || '');
  };

  const handleExtraPayment = async () => {
    const paymentAmount = parseFloat(extraPaymentAmount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedPaymentAccountId) {
      toast({
        title: 'No account selected',
        description: 'Please select an account to make the payment from.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const sourceAccount = accounts.find(acc => acc.id === selectedPaymentAccountId);
    if (!sourceAccount) {
      toast({
        title: 'Account not found',
        description: 'Selected account not found.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (sourceAccount.available_balance < paymentAmount) {
      toast({
        title: 'Insufficient funds',
        description: `Selected account only has ${formatCurrency(sourceAccount.available_balance)}`,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (selectedLoan && paymentAmount > selectedLoan.current_balance) {
      toast({
        title: 'Amount too high',
        description: 'Payment cannot exceed the remaining loan balance.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const paymentTimestamp = new Date().toISOString();

    // Update loan balance
    const updatedLoans = loans.map(loan => {
      if (loan.id === selectedLoan.id) {
        const newBalance = loan.current_balance - paymentAmount;
        const paymentRecord = {
          date: paymentTimestamp,
          amount: paymentAmount,
          status: 'completed',
          type: 'extra',
          source_account_id: sourceAccount.id,
          source_account_name: sourceAccount.nickname || sourceAccount.type,
        };
        return {
          ...loan,
          current_balance: Math.max(0, newBalance),
          payment_history: [paymentRecord, ...(loan.payment_history || [])],
        };
      }
      return loan;
    });

    const updatedAccounts = accounts.map(account => {
      if (account.id !== sourceAccount.id) {
        return account;
      }
      const newBalance = account.current_balance - paymentAmount;
      const currency = account.currency || 'USD';
      return {
        ...account,
        current_balance: newBalance,
        available_balance: account.available_balance - paymentAmount,
        transactions: [
          {
            id: `txn_${Date.now()}`,
            date: paymentTimestamp,
            post_date: paymentTimestamp,
            transaction_time: formatTime(paymentTimestamp),
            description: `Loan extra payment - ${selectedLoan.type} ${selectedLoan.loan_number}`,
            amount: -paymentAmount,
            transaction_amount: paymentAmount,
            billing_amount: paymentAmount,
            transaction_currency: currency,
            billing_currency: currency,
            running_balance: newBalance,
            category: 'Loan Payment',
            type: 'debit',
            merchant_name: 'Loan Payment',
            area_district: 'Online',
            country_region: 'United States',
            card_number: account.account_number,
          },
          ...(account.transactions || []),
        ],
      };
    });

    setLoans(updatedLoans);
    setSelectedLoan(updatedLoans.find(l => l.id === selectedLoan.id));

    await updateState({ loans: updatedLoans, accounts: updatedAccounts });

    toast({
      title: 'Payment successful',
      description: `Extra payment of ${formatCurrency(paymentAmount)} applied to ${selectedLoan.type} loan.`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });

    setIsPaymentModalOpen(false);
    setExtraPaymentAmount('');
  };

  const handleLoanApplication = async () => {
    // Generate new loan ID
    const newLoanId = `loan_${applicationType}_${Date.now()}`;

    const newLoan = {
      id: newLoanId,
      type: applicationType,
      loan_number: `${applicationType.toUpperCase().substring(0, 2)}-${Math.random().toString().substr(2, 4)}-${Math.random().toString().substr(2, 4)}`,
      original_amount: parseFloat(applicationForm.loanAmount) || 0,
      current_balance: parseFloat(applicationForm.loanAmount) || 0,
      interest_rate: applicationType === 'auto' ? 4.5 : (applicationType === 'mortgage' ? 6.25 : 7.5),
      monthly_payment: 0, // Will be calculated
      due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
      start_date: new Date().toISOString(),
      maturity_date: new Date(new Date().setFullYear(new Date().getFullYear() + parseInt(applicationForm.term) / 12)).toISOString(),
      payment_schedule: [],
      payment_history: [],
      status: 'in_application',
    };

    // Calculate monthly payment
    const monthlyRate = newLoan.interest_rate / 100 / 12;
    const termMonths = parseInt(applicationForm.term);
    newLoan.monthly_payment = (newLoan.original_amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                              (Math.pow(1 + monthlyRate, termMonths) - 1);

    // Generate payment schedule
    newLoan.payment_schedule = generatePaymentSchedule(
      newLoan.original_amount,
      newLoan.interest_rate,
      termMonths,
      new Date()
    );

    const updatedLoans = [...loans, newLoan];
    setLoans(updatedLoans);
    setSelectedLoan(newLoan);

    await updateState({ loans: updatedLoans });

    toast({
      title: 'Application submitted',
      description: `Your ${applicationType} loan application has been submitted. Reference: ${newLoan.loan_number}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });

    setIsApplicationModalOpen(false);
    setApplicationForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      loanAmount: '',
      term: '60',
      purpose: '',
      vehicleInfo: { make: '', model: '', year: '', vin: '' },
      propertyInfo: { address: '', type: '', value: '' },
    });
  };

  const calculatePayoff = () => {
    if (!selectedLoan) return 0;
    const monthlyRate = selectedLoan.interest_rate / 100 / 12;
    const remainingPayments = selectedLoan.payment_schedule.filter(p => p.status === 'scheduled' || p.status === 'pending').length;
    return selectedLoan.current_balance * (1 + monthlyRate * remainingPayments);
  };

  if (loading) {
    return (
      <Box p={8}>
        <Text>Loading loans...</Text>
      </Box>
    );
  }

  return (
    <Box bg="bg" minH="100vh">
      {/* Header */}
      <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} py={6} px={8}>
        <Heading size="lg" color="blue.900">
          Loans
        </Heading>
        <Text color="gray.600" mt={2}>Manage your loans and applications</Text>
      </Box>

      <Box p={8} maxW="1400px" mx="auto">
        {loans.length === 0 && (
          <Text mb={4} color="gray.600">
            No loans found. Apply for a loan to get started.
          </Text>
        )}

        {/* Loan Selector */}
        <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={6}>
          {loans.map((loan) => (
            <Card
              key={loan.id}
              bg={selectedLoan?.id === loan.id ? 'blue.50' : bgColor}
              border="2px"
              borderColor={selectedLoan?.id === loan.id ? 'blue.500' : borderColor}
              cursor="pointer"
              onClick={() => setSelectedLoan(loan)}
              _hover={{ shadow: 'md' }}
            >
              <CardBody>
                <Flex justify="space-between" align="center">
                  <Box>
                    <HStack mb={2}>
                      <FiFileText color="#00539F" />
                      <Text fontWeight="bold" textTransform="capitalize">
                        {loan.type} Loan
                      </Text>
                      <Badge
                        colorScheme={loan.status === 'active' ? 'green' : 'yellow'}
                      >
                        {loan.status}
                      </Badge>
                    </HStack>
                    <Text fontSize="sm" color="gray.600">
                      {loan.loan_number}
                    </Text>
                  </Box>
                  <Box textAlign="right">
                    <Text fontSize="2xl" fontWeight="bold" color="blue.900">
                      {formatCurrency(loan.current_balance)}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      Current Balance
                    </Text>
                  </Box>
                </Flex>
              </CardBody>
            </Card>
          ))}
          <Card
            bg={bgColor}
            border="2px"
            borderColor="blue.300"
            borderStyle="dashed"
            cursor="pointer"
            onClick={() => setIsApplicationModalOpen(true)}
            _hover={{ shadow: 'md', bg: 'blue.50' }}
          >
            <CardBody display="flex" alignItems="center" justifyContent="center" minH="120px">
              <VStack>
                <FiTrendingUp size={32} color="#00539F" />
                <Text fontWeight="bold" color="blue.900">Apply for a Loan</Text>
                <Text fontSize="sm" color="gray.600">Auto, Mortgage, or Personal</Text>
              </VStack>
            </CardBody>
          </Card>
        </Grid>

        {/* Loan Details */}
        {selectedLoan && (
        <Tabs>
          <TabList mb={4}>
            <Tab>Overview</Tab>
            <Tab>Payment Schedule</Tab>
            <Tab>Payment History</Tab>
            <Tab>Details</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel>
              <Card bg={bgColor} border="1px" borderColor={borderColor} mb={4}>
                <CardBody>
                  <SimpleGrid columns={4} spacing={6}>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Current Balance</Text>
                      <Text fontSize="3xl" fontWeight="bold" color="blue.900">
                        {formatCurrency(selectedLoan.current_balance)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Interest Rate</Text>
                      <Text fontSize="3xl" fontWeight="bold" color="blue.900">
                        {selectedLoan.interest_rate}%
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Monthly Payment</Text>
                      <Text fontSize="3xl" fontWeight="bold" color="blue.900">
                        {formatCurrency(selectedLoan.monthly_payment)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Due Date</Text>
                      <Text fontSize="3xl" fontWeight="bold" color="blue.900">
                        {formatDate(selectedLoan.due_date).split(' ')[0]}
                      </Text>
                    </Box>
                  </SimpleGrid>
                  <Divider my={6} />
                  <SimpleGrid columns={3} spacing={6}>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Original Amount</Text>
                      <Text fontSize="xl" fontWeight="bold" color="blue.900">
                        {formatCurrency(selectedLoan.original_amount)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Payoff Date</Text>
                      <Text fontSize="xl" fontWeight="bold" color="blue.900">
                        {formatDate(selectedLoan.maturity_date)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>Loan Number</Text>
                      <Text fontSize="xl" fontWeight="bold" color="blue.900">
                        {selectedLoan.loan_number}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </CardBody>
              </Card>

              {/* Action Buttons */}
              <HStack spacing={4} mb={6}>
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={() => handleMakePayment(selectedLoan.id)}
                  leftIcon={<FiDollarSign />}
                >
                  Make Extra Payment
                </Button>
                <Button
                  size="lg"
                  onClick={() => toast({
                    title: 'Payoff Calculation',
                    description: `Estimated payoff amount: ${formatCurrency(calculatePayoff())}`,
                    status: 'info',
                    duration: 5000,
                    isClosable: true,
                  })}
                >
                  Calculate Payoff
                </Button>
              </HStack>
            </TabPanel>

            {/* Payment Schedule Tab */}
            <TabPanel>
              <Card bg={bgColor} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Heading size="md" mb={4}>Payment Schedule</Heading>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Amount</Th>
                        <Th>Principal</Th>
                        <Th>Interest</Th>
                        <Th>Remaining Balance</Th>
                        <Th>Status</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {selectedLoan.payment_schedule?.slice(0, 24).map((payment, index) => (
                        <Tr key={index}>
                          <Td>{formatDate(payment.date)}</Td>
                          <Td>{formatCurrency(payment.amount)}</Td>
                          <Td>{formatCurrency(payment.principal)}</Td>
                          <Td>{formatCurrency(payment.interest)}</Td>
                          <Td>{formatCurrency(payment.remaining_balance)}</Td>
                          <Td>
                            <Badge
                              colorScheme={
                                payment.status === 'paid' ? 'green' :
                                payment.status === 'pending' ? 'yellow' : 'gray'
                              }
                            >
                              {payment.status}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Payment History Tab */}
            <TabPanel>
              <Card bg={bgColor} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Heading size="md" mb={4}>Payment History</Heading>
                  {selectedLoan.payment_history?.length > 0 ? (
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Amount</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedLoan.payment_history.map((payment, index) => (
                          <Tr key={index}>
                            <Td>{formatDate(payment.date)}</Td>
                            <Td>{formatCurrency(payment.amount)}</Td>
                            <Td>
                              <Badge colorScheme="green">{payment.status}</Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text color="gray.500">No payment history available.</Text>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            {/* Details Tab */}
            <TabPanel>
              <Card bg={bgColor} border="1px" borderColor={borderColor}>
                <CardBody>
                  <Heading size="md" mb={4}>Loan Details</Heading>
                  <VStack align="start" spacing={4}>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Loan Type:</Text>
                      <Text textTransform="capitalize">{selectedLoan.type}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Loan Number:</Text>
                      <Text>{selectedLoan.loan_number}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Original Amount:</Text>
                      <Text>{formatCurrency(selectedLoan.original_amount)}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Current Balance:</Text>
                      <Text>{formatCurrency(selectedLoan.current_balance)}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Interest Rate:</Text>
                      <Text>{selectedLoan.interest_rate}% APR</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Monthly Payment:</Text>
                      <Text>{formatCurrency(selectedLoan.monthly_payment)}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Start Date:</Text>
                      <Text>{formatDate(selectedLoan.start_date)}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Maturity Date:</Text>
                      <Text>{formatDate(selectedLoan.maturity_date)}</Text>
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold" minW="200px">Status:</Text>
                      <Badge colorScheme={selectedLoan.status === 'active' ? 'green' : 'yellow'}>
                        {selectedLoan.status}
                      </Badge>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
        )}
      </Box>

      {/* Loan Application Modal */}
      <Modal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Apply for a Loan</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="bold" mb={2}>Loan Type</Text>
                <RadioGroup value={applicationType} onChange={setApplicationType}>
                  <HStack>
                    <Radio value="auto">Auto Loan</Radio>
                    <Radio value="mortgage">Mortgage</Radio>
                    <Radio value="personal">Personal Loan</Radio>
                  </HStack>
                </RadioGroup>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>Personal Information</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <Input
                    placeholder="First Name"
                    value={applicationForm.firstName}
                    onChange={(e) => setApplicationForm({...applicationForm, firstName: e.target.value})}
                  />
                  <Input
                    placeholder="Last Name"
                    value={applicationForm.lastName}
                    onChange={(e) => setApplicationForm({...applicationForm, lastName: e.target.value})}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={applicationForm.email}
                    onChange={(e) => setApplicationForm({...applicationForm, email: e.target.value})}
                  />
                  <Input
                    placeholder="Phone"
                    value={applicationForm.phone}
                    onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                  />
                </SimpleGrid>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={2}>Loan Details</Text>
                <SimpleGrid columns={2} spacing={3}>
                  <NumberInput>
                    <NumberInputField
                      placeholder="Loan Amount"
                      value={applicationForm.loanAmount}
                      onChange={(e) => setApplicationForm({...applicationForm, loanAmount: e.target.value})}
                    />
                  </NumberInput>
                  <Select
                    value={applicationForm.term}
                    onChange={(e) => setApplicationForm({...applicationForm, term: e.target.value})}
                  >
                    <option value="36">36 months (3 years)</option>
                    <option value="60">60 months (5 years)</option>
                    <option value="120">120 months (10 years)</option>
                    <option value="360">360 months (30 years)</option>
                  </Select>
                </SimpleGrid>
                <Input
                  mt={3}
                  placeholder="Purpose (e.g., Home purchase, Debt consolidation)"
                  value={applicationForm.purpose}
                  onChange={(e) => setApplicationForm({...applicationForm, purpose: e.target.value})}
                />
              </Box>

              {applicationType === 'auto' && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2}>Vehicle Information</Text>
                    <SimpleGrid columns={2} spacing={3}>
                      <Input
                        placeholder="Vehicle Make"
                        value={applicationForm.vehicleInfo.make}
                        onChange={(e) => setApplicationForm({...applicationForm, vehicleInfo: {...applicationForm.vehicleInfo, make: e.target.value}})}
                      />
                      <Input
                        placeholder="Vehicle Model"
                        value={applicationForm.vehicleInfo.model}
                        onChange={(e) => setApplicationForm({...applicationForm, vehicleInfo: {...applicationForm.vehicleInfo, model: e.target.value}})}
                      />
                      <Input
                        placeholder="Year"
                        value={applicationForm.vehicleInfo.year}
                        onChange={(e) => setApplicationForm({...applicationForm, vehicleInfo: {...applicationForm.vehicleInfo, year: e.target.value}})}
                      />
                      <Input
                        placeholder="VIN"
                        value={applicationForm.vehicleInfo.vin}
                        onChange={(e) => setApplicationForm({...applicationForm, vehicleInfo: {...applicationForm.vehicleInfo, vin: e.target.value}})}
                      />
                    </SimpleGrid>
                  </Box>
                </>
              )}

              {applicationType === 'mortgage' && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2}>Property Information</Text>
                    <SimpleGrid columns={2} spacing={3}>
                      <Input
                        placeholder="Property Address"
                        value={applicationForm.propertyInfo.address}
                        onChange={(e) => setApplicationForm({...applicationForm, propertyInfo: {...applicationForm.propertyInfo, address: e.target.value}})}
                      />
                      <Select
                        value={applicationForm.propertyInfo.type}
                        onChange={(e) => setApplicationForm({...applicationForm, propertyInfo: {...applicationForm.propertyInfo, type: e.target.value}})}
                      >
                        <option value="">Property Type</option>
                        <option value="single">Single Family</option>
                        <option value="condo">Condominium</option>
                        <option value="townhouse">Townhouse</option>
                      </Select>
                      <Input
                        placeholder="Property Value"
                        value={applicationForm.propertyInfo.value}
                        onChange={(e) => setApplicationForm({...applicationForm, propertyInfo: {...applicationForm.propertyInfo, value: e.target.value}})}
                      />
                    </SimpleGrid>
                  </Box>
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsApplicationModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleLoanApplication}>
              Submit Application
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Extra Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Make Extra Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
          <Box>
            <Text fontWeight="bold" mb={2}>Current Balance</Text>
            <Text fontSize="2xl" color="blue.900">
              {formatCurrency(selectedLoan?.current_balance || 0)}
            </Text>
          </Box>
          <Box>
            <Text fontWeight="bold" mb={2}>Pay From Account</Text>
            <Select
              placeholder="Select account"
              value={selectedPaymentAccountId}
              onChange={(e) => setSelectedPaymentAccountId(e.target.value)}
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.nickname} ({formatCurrency(account.available_balance)})
                </option>
              ))}
            </Select>
          </Box>
          <Box>
            <Text fontWeight="bold" mb={2}>Extra Payment Amount</Text>
            <NumberInput>
              <NumberInputField
                placeholder="Enter amount"
                    value={extraPaymentAmount}
                    onChange={(e) => setExtraPaymentAmount(e.target.value)}
                  />
                </NumberInput>
              </Box>
              <Text fontSize="sm" color="gray.600">
                This extra payment will be applied directly to your principal balance,
                reducing the total interest paid over the life of the loan.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleExtraPayment}>
              Confirm Payment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Loans;
