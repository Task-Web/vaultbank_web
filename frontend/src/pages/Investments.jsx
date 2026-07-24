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
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiRefreshCw, FiSearch, FiPlus, FiMinus } from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatPercent = (value) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const Investments = () => {
  const { state, applyVaultbankChange, loading } = useStateContext();
  const [investments, setInvestments] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('brokerage');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('');
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (loading) {
      return;
    }
    setInvestments(state?.data?.investments || null);
  }, [state, loading]);

  if (loading) {
    return (
      <Box p={8}>
        <Text>Loading investment accounts...</Text>
      </Box>
    );
  }

  if (!investments) {
    return (
      <Box p={8}>
        <Heading size="lg" mb={2}>Investment Accounts</Heading>
        <Text color="gray.600">No investment accounts found.</Text>
      </Box>
    );
  }

  const currentAccount = selectedAccount === 'brokerage'
    ? investments.brokerage
    : investments.retirement.find(r => r.account_type === selectedAccount);

  const holdings = currentAccount?.holdings || [];
  const trades = currentAccount?.trades || [];

  // Filter holdings by search
  const filteredHoldings = holdings.filter(h =>
    h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate portfolio stats
  const totalValue = currentAccount?.total_value || 0;
  const dayChange = currentAccount?.day_change || 0;
  const dayChangePercent = currentAccount?.day_change_percent || 0;
  const totalReturn = currentAccount?.total_return || 0;
  const totalReturnPercent = currentAccount?.total_return_percent || 0;

  // Handle trade execution
  const handleTrade = async () => {
    if (!selectedSymbol || !tradeQuantity) {
      toast({
        title: 'Validation Error',
        description: 'Please select a symbol and enter a quantity',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const quantity = parseInt(tradeQuantity);
    const holding = holdings.find(h => h.symbol === selectedSymbol);
    const price = holding?.current_price || 100;
    const total = quantity * price;

    const newTrade = {
      id: `trade_${Math.random().toString(36).substr(2, 9)}`,
      symbol: selectedSymbol,
      type: tradeType,
      quantity: quantity,
      price: price,
      total: total,
      date: new Date().toISOString(),
    };

    // Update holdings
    let updatedHoldings = [...holdings];
    if (tradeType === 'buy') {
      const existingIndex = updatedHoldings.findIndex(h => h.symbol === selectedSymbol);
      if (existingIndex >= 0) {
        const existing = updatedHoldings[existingIndex];
        const totalCost = existing.cost_basis + total;
        const totalQty = existing.quantity + quantity;
        updatedHoldings[existingIndex] = {
          ...existing,
          quantity: totalQty,
          average_cost: totalCost / totalQty,
          current_value: totalQty * existing.current_price,
          cost_basis: totalCost,
          gain_loss: (totalQty * existing.current_price) - totalCost,
          gain_loss_percent: ((totalQty * existing.current_price) - totalCost) / totalCost * 100,
        };
      } else {
        updatedHoldings.push({
          symbol: selectedSymbol,
          name: selectedSymbol,
          quantity: quantity,
          average_cost: price,
          current_price: price,
          current_value: total,
          cost_basis: total,
          gain_loss: 0,
          gain_loss_percent: 0,
        });
      }
    } else {
      // Sell
      const existingIndex = updatedHoldings.findIndex(h => h.symbol === selectedSymbol);
      if (existingIndex >= 0) {
        const existing = updatedHoldings[existingIndex];
        if (existing.quantity < quantity) {
          toast({
            title: 'Insufficient Shares',
            description: `You only have ${existing.quantity} shares of ${selectedSymbol}`,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
          return;
        }
        const newQuantity = existing.quantity - quantity;
        const newCostBasis = existing.cost_basis * (newQuantity / existing.quantity);
        if (newQuantity > 0) {
          updatedHoldings[existingIndex] = {
            ...existing,
            quantity: newQuantity,
            current_value: newQuantity * existing.current_price,
            cost_basis: newCostBasis,
            gain_loss: (newQuantity * existing.current_price) - newCostBasis,
          };
        } else {
          updatedHoldings.splice(existingIndex, 1);
        }
      }
    }

    // Update trades
    const updatedTrades = [newTrade, ...trades];

    // Calculate new total value
    const newTotalValue = (currentAccount.cash_balance || 0) +
      (tradeType === 'buy' ? -total : total) +
      updatedHoldings.reduce((sum, h) => sum + h.current_value, 0);

    // Update state
    let updatedInvestments = { ...investments };
    if (selectedAccount === 'brokerage') {
      updatedInvestments.brokerage = {
        ...investments.brokerage,
        holdings: updatedHoldings,
        trades: updatedTrades,
        total_value: newTotalValue,
        cash_balance: (investments.brokerage.cash_balance || 0) + (tradeType === 'buy' ? -total : total),
      };
    } else {
      const retIndex = investments.retirement.findIndex(r => r.account_type === selectedAccount);
      updatedInvestments.retirement[retIndex] = {
        ...investments.retirement[retIndex],
        holdings: updatedHoldings,
        trades: updatedTrades,
        total_value: newTotalValue,
        cash_balance: (investments.retirement[retIndex].cash_balance || 0) + (tradeType === 'buy' ? -total : total),
      };
    }

    setInvestments(updatedInvestments);
    await applyVaultbankChange({
      investments: updatedInvestments,
    }, `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares of ${selectedSymbol}`);

    setTradeModalOpen(false);
    setSelectedSymbol('');
    setTradeQuantity('');

    toast({
      title: 'Trade Executed',
      description: `Successfully ${tradeType === 'buy' ? 'purvaultbankd' : 'sold'} ${quantity} shares of ${selectedSymbol} for ${formatCurrency(total)}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <Box p={8} maxW="1400px" mx="auto">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="lg" mb={2}>Investment Accounts</Heading>
          <Text color="gray.600">Manage your investment portfolio</Text>
        </Box>
        <Button
          leftIcon={<FiRefreshCw />}
          colorScheme="vaultbank"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </Flex>

      {/* Account Selector */}
      <Card mb={6} bg={bgColor} borderColor={borderColor} borderWidth="1px">
        <CardBody>
          <HStack spacing={4}>
            <Text fontWeight="semibold">Account:</Text>
            <Select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              maxW="300px"
              bg="white"
            >
              <option value="brokerage">Brokerage Account</option>
              <option value="401k">401(k) Retirement</option>
              <option value="IRA">IRA Retirement</option>
            </Select>
          </HStack>
        </CardBody>
      </Card>

      {/* Portfolio Summary */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <StatCard
          label="Total Value"
          value={formatCurrency(totalValue)}
          helpText="Portfolio value"
        />
        <StatCard
          label="Day Change"
          value={formatCurrency(dayChange)}
          helpText={formatPercent(dayChangePercent)}
          positive={dayChange >= 0}
        />
        <StatCard
          label="Total Return"
          value={formatCurrency(totalReturn)}
          helpText={formatPercent(totalReturnPercent)}
          positive={totalReturn >= 0}
        />
        <StatCard
          label="Cash Balance"
          value={formatCurrency(currentAccount?.cash_balance || 0)}
          helpText="Available for trading"
        />
      </SimpleGrid>

      {/* Tabs */}
      <Tabs>
        <TabList borderBottom="2px solid" borderColor="gray.200">
          <Tab _selected={{ color: '#00539F', borderColor: '#00539F' }}>Holdings</Tab>
          <Tab _selected={{ color: '#00539F', borderColor: '#00539F' }}>Trade History</Tab>
          {selectedAccount === 'brokerage' && (
            <Tab _selected={{ color: '#00539F', borderColor: '#00539F' }}>Performance</Tab>
          )}
        </TabList>

        <TabPanels>
          {/* Holdings Tab */}
          <TabPanel>
            <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <Flex justify="space-between" align="center" mb={6}>
                  <Heading size="md">Holdings</Heading>
                  <HStack spacing={4}>
                    <Box position="relative">
                      <Input
                        placeholder="Search holdings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        maxW="250px"
                        bg="white"
                      />
                      <FiSearch
                        position="absolute"
                        right="3"
                        top="3"
                        color="gray.400"
                      />
                    </Box>
                    {selectedAccount === 'brokerage' && (
                      <Button
                        leftIcon={tradeType === 'buy' ? <FiPlus /> : <FiMinus />}
                        colorScheme={tradeType === 'buy' ? 'vaultbank' : 'red'}
                        onClick={() => setTradeModalOpen(true)}
                      >
                        {tradeType === 'buy' ? 'Buy' : 'Sell'}
                      </Button>
                    )}
                  </HStack>
                </Flex>

                {filteredHoldings.length === 0 ? (
                  <Box textAlign="center" py={12}>
                    <Text color="gray.500">No holdings found</Text>
                  </Box>
                ) : (
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Symbol</Th>
                        <Th>Name</Th>
                        <Th isNumeric>Quantity</Th>
                        <Th isNumeric>Avg Cost</Th>
                        <Th isNumeric>Current Price</Th>
                        <Th isNumeric>Current Value</Th>
                        <Th isNumeric>Gain/Loss</Th>
                        <Th isNumeric>Return %</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredHoldings.map((holding, index) => (
                        <Tr key={index}>
                          <Td fontWeight="semibold">{holding.symbol}</Td>
                          <Td>{holding.name}</Td>
                          <Td isNumeric>{holding.quantity}</Td>
                          <Td isNumeric>{formatCurrency(holding.average_cost)}</Td>
                          <Td isNumeric>{formatCurrency(holding.current_price)}</Td>
                          <Td isNumeric fontWeight="semibold">
                            {formatCurrency(holding.current_value)}
                          </Td>
                          <Td isNumeric>
                            <HStack justify="flex-end">
                              <Text
                                color={holding.gain_loss >= 0 ? 'green.600' : 'red.600'}
                                fontWeight="semibold"
                              >
                                {formatCurrency(holding.gain_loss)}
                              </Text>
                              {holding.gain_loss >= 0 ? (
                                <FiTrendingUp color="green" />
                              ) : (
                                <FiTrendingDown color="red" />
                              )}
                            </HStack>
                          </Td>
                          <Td isNumeric>
                            <Badge
                              colorScheme={holding.gain_loss_percent >= 0 ? 'green' : 'red'}
                              variant="subtle"
                            >
                              {formatPercent(holding.gain_loss_percent)}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Trade History Tab */}
          <TabPanel>
            <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
              <CardBody>
                <Heading size="md" mb={6}>Trade History</Heading>

                {trades.length === 0 ? (
                  <Box textAlign="center" py={12}>
                    <Text color="gray.500">No trades yet</Text>
                  </Box>
                ) : (
                  <Table variant="simple">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Date</Th>
                        <Th>Symbol</Th>
                        <Th>Type</Th>
                        <Th isNumeric>Quantity</Th>
                        <Th isNumeric>Price</Th>
                        <Th isNumeric>Total</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {trades.map((trade, index) => (
                        <Tr key={index}>
                          <Td>{formatDate(trade.date)}</Td>
                          <Td fontWeight="semibold">{trade.symbol}</Td>
                          <Td>
                            <Badge
                              colorScheme={trade.type === 'buy' ? 'vaultbank' : 'red'}
                              variant="subtle"
                            >
                              {trade.type.toUpperCase()}
                            </Badge>
                          </Td>
                          <Td isNumeric>{trade.quantity}</Td>
                          <Td isNumeric>{formatCurrency(trade.price)}</Td>
                          <Td isNumeric fontWeight="semibold">
                            {formatCurrency(trade.total)}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Performance Tab (Brokerage only) */}
          {selectedAccount === 'brokerage' && (
            <TabPanel>
              <Card bg={bgColor} borderColor={borderColor} borderWidth="1px">
                <CardBody>
                  <Heading size="md" mb={6}>Portfolio Performance</Heading>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Text mb={2} fontWeight="semibold">Asset Allocation</Text>
                      <Progress value={75} colorScheme="vaultbank" size="lg" />
                      <Text mt={2} fontSize="sm" color="gray.600">
                        75% Stocks, 25% Cash
                      </Text>
                    </Box>

                    <Divider />

                    <Box>
                      <Text mb={4} fontWeight="semibold">Top Performers</Text>
                      <VStack spacing={3} align="stretch">
                        {holdings
                          .sort((a, b) => b.gain_loss_percent - a.gain_loss_percent)
                          .slice(0, 3)
                          .map((holding, index) => (
                            <Flex
                              key={index}
                              justify="space-between"
                              align="center"
                              p={4}
                              bg="gray.50"
                              borderRadius="md"
                            >
                              <Box>
                                <Text fontWeight="semibold">{holding.symbol}</Text>
                                <Text fontSize="sm" color="gray.600">{holding.name}</Text>
                              </Box>
                              <HStack>
                                <Text
                                  color="green.600"
                                  fontWeight="semibold"
                                >
                                  {formatPercent(holding.gain_loss_percent)}
                                </Text>
                                <FiTrendingUp color="green" />
                              </HStack>
                            </Flex>
                          ))}
                      </VStack>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>

      {/* Trade Modal */}
      <Modal isOpen={tradeModalOpen} onClose={() => setTradeModalOpen(false)} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {tradeType === 'buy' ? 'Buy Securities' : 'Sell Securities'}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text mb={2} fontWeight="semibold">Trade Type</Text>
                <RadioGroup
                  value={tradeType}
                  onChange={(value) => setTradeType(value)}
                >
                  <HStack spacing={6}>
                    <Radio value="buy" colorScheme="vaultbank">Buy</Radio>
                    <Radio value="sell" colorScheme="red">Sell</Radio>
                  </HStack>
                </RadioGroup>
              </Box>

              <Box w="100%">
                <Text mb={2} fontWeight="semibold">Symbol</Text>
                <Select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  placeholder="Select a holding"
                  bg="white"
                >
                  {holdings.map((holding, index) => (
                    <option key={index} value={holding.symbol}>
                      {holding.symbol} - {holding.name}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box w="100%">
                <Text mb={2} fontWeight="semibold">Quantity</Text>
                <NumberInput
                  value={tradeQuantity}
                  onChange={(value) => setTradeQuantity(value)}
                  min={1}
                  bg="white"
                >
                  <NumberInputField />
                </NumberInput>
              </Box>

              {selectedSymbol && (
                <Box w="100%" p={4} bg="gray.50" borderRadius="md">
                  <Text fontSize="sm" color="gray.600">
                    Estimated Total: {' '}
                    <Text as="span" fontWeight="semibold">
                      {formatCurrency((parseInt(tradeQuantity) || 0) * (holdings.find(h => h.symbol === selectedSymbol)?.current_price || 0))}
                    </Text>
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => setTradeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              colorScheme={tradeType === 'buy' ? 'vaultbank' : 'red'}
              onClick={handleTrade}
              isDisabled={!selectedSymbol || !tradeQuantity}
            >
              {tradeType === 'buy' ? 'Buy' : 'Sell'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// Helper component for stat cards
const StatCard = ({ label, value, helpText, positive }) => {
  return (
    <Card bg="white" borderWidth="1px" borderColor="gray.200">
      <CardBody p={4}>
        <Stat>
          <StatLabel fontSize="sm" color="gray.600">{label}</StatLabel>
          <StatNumber fontSize="2xl">{value}</StatNumber>
          <StatHelpText fontSize="sm">
            {positive !== undefined && (
              <StatArrow type={positive ? 'increase' : 'decrease'} />
            )}
            {helpText}
          </StatHelpText>
        </Stat>
      </CardBody>
    </Card>
  );
};

export default Investments;
