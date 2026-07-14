import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  Textarea,
  Text,
  Heading,
  VStack,
  HStack,
  Flex,
  Badge,
  Divider,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Icon,
} from '@chakra-ui/react';
import { useStateContext } from '../contexts/StateContext';
import { Link as RouterLink } from 'react-router-dom';
import { formatTime } from '../utils/formatters';

const MobileDeposit = () => {
  const { state, loading, updateState, refreshState } = useStateContext();
  const toast = useToast();

  const [depositForm, setDepositForm] = useState({
    accountId: '',
    amount: '',
    frontImage: null,
    backImage: null,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState(null);

  const accounts = state?.data?.accounts || [];
  const deposits = state?.data?.mobile_deposits || [];

  // Filter for depositable accounts (checking and savings)
  const depositableAccounts = accounts.filter(
    (acc) => acc.status === 'active' && (acc.type === 'checking' || acc.type === 'savings')
  );

  const handleInputChange = (field, value) => {
    setDepositForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleFileChange = (field, file) => {
    setDepositForm((prev) => ({
      ...prev,
      [field]: file,
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!depositForm.accountId) {
      newErrors.accountId = 'Please select an account';
    }

    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!depositForm.frontImage) {
      newErrors.frontImage = 'Please upload the front of the check';
    }

    if (!depositForm.backImage) {
      newErrors.backImage = 'Please upload the back of the check';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReviewDeposit = () => {
    if (!validateForm()) {
      return;
    }

    const account = depositableAccounts.find((acc) => acc.id === depositForm.accountId);

    setReviewData({
      account: account.nickname || account.type,
      accountNumber: account.account_number,
      amount: parseFloat(depositForm.amount),
      frontImageName: depositForm.frontImage.name,
      backImageName: depositForm.backImage.name,
    });

    setShowReview(true);
  };

  const handleConfirmDeposit = async () => {
    setIsSubmitting(true);

    try {
      const referenceNumber = `MD${Date.now()}`;
      const now = new Date().toISOString();

      // Create new deposit record
      const newDeposit = {
        id: `deposit_${Date.now()}`,
        account_id: depositForm.accountId,
        amount: parseFloat(depositForm.amount),
        front_image: depositForm.frontImage.name,
        back_image: depositForm.backImage.name,
        date: now,
        status: 'completed',
        reference_number: referenceNumber,
      };

      // Update account balance
      const updatedAccounts = accounts.map((acc) => {
        if (acc.id === depositForm.accountId) {
          return {
            ...acc,
            current_balance: acc.current_balance + parseFloat(depositForm.amount),
            available_balance: acc.available_balance + parseFloat(depositForm.amount),
          };
        }
        return acc;
      });

      // Add transaction record
      const accountWithTransaction = updatedAccounts.map((acc) => {
        if (acc.id === depositForm.accountId) {
          const newTransaction = {
            id: `txn_${Date.now()}`,
            date: now,
            post_date: now,
            transaction_time: formatTime(now),
            description: 'Mobile Deposit',
            amount: parseFloat(depositForm.amount),
            transaction_amount: parseFloat(depositForm.amount),
            billing_amount: parseFloat(depositForm.amount),
            transaction_currency: acc.currency || 'USD',
            billing_currency: acc.currency || 'USD',
            running_balance: acc.current_balance,
            category: 'Deposit',
            type: 'credit',
            merchant_name: 'Mobile Deposit',
            area_district: 'Online',
            country_region: 'United States',
            card_number: acc.account_number,
          };
          return {
            ...acc,
            transactions: [newTransaction, ...(acc.transactions || [])],
          };
        }
        return acc;
      });

      // Update state
      await updateState(
        {
          accounts: accountWithTransaction,
          mobile_deposits: [...deposits, newDeposit],
        },
        'Mobile deposit processed'
      );

      // Show success toast
      toast({
        title: 'Deposit Successful!',
        description: `Reference: ${referenceNumber}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      setDepositForm({
        accountId: '',
        amount: '',
        frontImage: null,
        backImage: null,
      });
      setShowReview(false);
      setReviewData(null);

      // Refresh state to get updated data
      await refreshState();
    } catch (error) {
      toast({
        title: 'Deposit Failed',
        description: error.message || 'Unable to process deposit',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReview = () => {
    setShowReview(false);
    setReviewData(null);
  };

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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'yellow', label: 'Pending' },
      completed: { color: 'green', label: 'Completed' },
      failed: { color: 'red', label: 'Failed' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge colorScheme={config.color} variant="solid">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Box p={8}>
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      <Flex direction="column" gap={6}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Mobile Deposit
          </Heading>
          <Text color="gray.600">
            Deposit checks anytime, anywhere with mobile check deposit
          </Text>
        </Box>

        <Tabs variant="enclosed" colorScheme="blue">
          <TabList>
            <Tab>Mobile Deposit</Tab>
            <Tab>Deposit History</Tab>
          </TabList>

          <TabPanels>
            {/* Mobile Deposit Tab */}
            <TabPanel>
              <VStack align="stretch" spacing={6}>
                {/* Info Alert */}
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <Box flex="1">
                    <Text fontSize="sm">
                      <strong>How to deposit:</strong> Take clear photos of the front and back of your
                      check, endorse it with "For Mobile Deposit Only", and submit. Funds will be
                      available immediately.
                    </Text>
                  </Box>
                </Alert>

                {/* Deposit Form */}
                <Card>
                  <CardBody>
                    <VStack spacing={5} align="stretch">
                      {/* Account Selection */}
                      <FormControl isInvalid={errors.accountId}>
                        <FormLabel fontWeight="600">Select Account</FormLabel>
                        <Select
                          placeholder="Select account to deposit into"
                          value={depositForm.accountId}
                          onChange={(e) => handleInputChange('accountId', e.target.value)}
                          size="lg"
                        >
                          {depositableAccounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.nickname || account.type} - ****{account.account_number} (Available:{' '}
                              {formatCurrency(account.available_balance)})
                            </option>
                          ))}
                        </Select>
                        <FormErrorMessage>{errors.accountId}</FormErrorMessage>
                      </FormControl>

                      {/* Amount */}
                      <FormControl isInvalid={errors.amount}>
                        <FormLabel fontWeight="600">Check Amount</FormLabel>
                        <HStack>
                          <Text fontSize="lg" fontWeight="bold">
                            $
                          </Text>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={depositForm.amount}
                            onChange={(e) => handleInputChange('amount', e.target.value)}
                            size="lg"
                            fontSize="lg"
                          />
                        </HStack>
                        <FormErrorMessage>{errors.amount}</FormErrorMessage>
                      </FormControl>

                      {/* Front of Check */}
                      <FormControl isInvalid={errors.frontImage}>
                        <FormLabel fontWeight="600">Front of Check</FormLabel>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('frontImage', e.target.files[0])}
                          size="lg"
                        />
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          Upload a clear photo of the front of your check
                        </Text>
                        <FormErrorMessage>{errors.frontImage}</FormErrorMessage>
                        {depositForm.frontImage && (
                          <Text fontSize="sm" color="green.600" mt={1}>
                            Selected: {depositForm.frontImage.name}
                          </Text>
                        )}
                      </FormControl>

                      {/* Back of Check */}
                      <FormControl isInvalid={errors.backImage}>
                        <FormLabel fontWeight="600">Back of Check</FormLabel>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange('backImage', e.target.files[0])}
                          size="lg"
                        />
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          Upload a clear photo of the back of your check (with endorsement)
                        </Text>
                        <FormErrorMessage>{errors.backImage}</FormErrorMessage>
                        {depositForm.backImage && (
                          <Text fontSize="sm" color="green.600" mt={1}>
                            Selected: {depositForm.backImage.name}
                          </Text>
                        )}
                      </FormControl>

                      <Divider />

                      {/* Action Buttons */}
                      <HStack justify="flex-end" spacing={3}>
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() =>
                            setDepositForm({
                              accountId: '',
                              amount: '',
                              frontImage: null,
                              backImage: null,
                            })
                          }
                        >
                          Clear Form
                        </Button>
                        <Button
                          colorScheme="blue"
                          size="lg"
                          onClick={handleReviewDeposit}
                          isDisabled={
                            !depositForm.accountId ||
                            !depositForm.amount ||
                            !depositForm.frontImage ||
                            !depositForm.backImage
                          }
                        >
                          Review Deposit
                        </Button>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>

            {/* Deposit History Tab */}
            <TabPanel>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Heading size="md" mb={2}>
                    Deposit History
                  </Heading>
                  <Text color="gray.600">
                    View your past mobile check deposits
                  </Text>
                </Box>

                {deposits.length === 0 ? (
                  <Card>
                    <CardBody textAlign="center" py={8}>
                      <Text color="gray.500" mb={4}>
                        No mobile deposits yet
                      </Text>
                      <Text fontSize="sm" color="gray.400">
                        Your deposit history will appear here once you make your first deposit
                      </Text>
                    </CardBody>
                  </Card>
                ) : (
                  <SimpleGrid columns={1} spacing={4}>
                    {deposits.map((deposit) => {
                      const account = accounts.find((acc) => acc.id === deposit.account_id);
                      return (
                        <Card key={deposit.id}>
                          <CardBody>
                            <Flex justify="space-between" align="center">
                              <VStack align="start" spacing={2}>
                                <HStack>
                                  <Text fontWeight="bold" fontSize="lg">
                                    {formatCurrency(deposit.amount)}
                                  </Text>
                                  {getStatusBadge(deposit.status)}
                                </HStack>
                                <Text color="gray.600">
                                  {account?.nickname || account?.type || 'Unknown Account'} - ****
                                  {account?.account_number || '----'}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                  {formatDate(deposit.date)}
                                </Text>
                                <Text fontSize="sm" color="gray.500">
                                  Reference: {deposit.reference_number}
                                </Text>
                              </VStack>
                            </Flex>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </SimpleGrid>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>

      {/* Review Confirmation Modal */}
      {showReview && reviewData && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1400}
          onClick={handleCancelReview}
        >
          <Box
            bg="white"
            borderRadius="lg"
            p={8}
            maxW="500px"
            w="90%"
            onClick={(e) => e.stopPropagation()}
          >
            <VStack spacing={6} align="stretch">
              <Box>
                <Heading size="lg" mb={2}>
                  Review Deposit
                </Heading>
                <Text color="gray.600">
                  Please review your deposit details before confirming
                </Text>
              </Box>

              <Divider />

              <VStack spacing={4} align="stretch">
                <Flex justify="space-between">
                  <Text color="gray.600">Account:</Text>
                  <Text fontWeight="600">
                    {reviewData.account} - ****{reviewData.accountNumber}
                  </Text>
                </Flex>

                <Flex justify="space-between">
                  <Text color="gray.600">Amount:</Text>
                  <Text fontWeight="600" fontSize="xl" color="vaultbank.600">
                    {formatCurrency(reviewData.amount)}
                  </Text>
                </Flex>

                <Flex justify="space-between">
                  <Text color="gray.600">Front Image:</Text>
                  <Text fontWeight="600">{reviewData.frontImageName}</Text>
                </Flex>

                <Flex justify="space-between">
                  <Text color="gray.600">Back Image:</Text>
                  <Text fontWeight="600">{reviewData.backImageName}</Text>
                </Flex>
              </VStack>

              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Text fontSize="sm">
                  By confirming, you certify that the check is endorsed with "For Mobile Deposit Only"
                  and that you have proper authorization to deposit these funds.
                </Text>
              </Alert>

              <HStack spacing={3} justify="flex-end">
                <Button variant="outline" onClick={handleCancelReview} isDisabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleConfirmDeposit}
                  isLoading={isSubmitting}
                >
                  Confirm Deposit
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default MobileDeposit;
