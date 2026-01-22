import React, { useMemo } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrency, formatDate } from '../utils/formatters';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { state } = useStateContext();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Search across all accounts and credit cards
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const accounts = state?.data?.accounts || [];
    const creditCards = state?.data?.credit_cards || [];
    const allResults = [];

    // Search account transactions
    accounts.forEach(account => {
      const transactions = account.transactions || [];
      transactions.forEach(txn => {
        const searchableText = `${txn.description} ${txn.category} ${txn.merchant || ''}`.toLowerCase();
        if (searchableText.includes(query.toLowerCase())) {
          allResults.push({
            ...txn,
            account_id: account.id,
            account_nickname: account.nickname,
            account_type: account.type,
            account_number: account.account_number,
          });
        }
      });
    });

    // Search credit card transactions
    creditCards.forEach(card => {
      const transactions = card.transactions || [];
      transactions.forEach(txn => {
        const searchableText = `${txn.description} ${txn.category} ${txn.merchant || ''}`.toLowerCase();
        if (searchableText.includes(query.toLowerCase())) {
          allResults.push({
            ...txn,
            account_id: card.id,
            account_nickname: `Credit Card ${card.card_number}`,
            account_type: 'credit_card',
            account_number: card.card_number,
          });
        }
      });
    });

    // Sort by date (newest first)
    return allResults.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [state, query]);

  return (
    <Box bg="gray.50" minH="calc(100vh - 64px)" pt={4}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg" mb={2}>
              Search Results
            </Heading>
            <Text color="gray.600">
              {query ? `Showing results for "${query}"` : 'Enter a search term'}
            </Text>
            <Text fontSize="sm" color="gray.500" mt={1}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>
          </Box>

          {/* Results Table */}
          {results.length > 0 ? (
            <Box bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor} overflow="hidden">
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Date</Th>
                    <Th>Description</Th>
                    <Th>Account</Th>
                    <Th>Category</Th>
                    <Th isNumeric>Amount</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {results.map((result, idx) => (
                    <Tr
                      key={idx}
                      _hover={{ bg: 'gray.50' }}
                      cursor="pointer"
                      as={RouterLink}
                      to={`/accounts/${result.account_id}`}
                    >
                      <Td>{formatDate(result.date)}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{result.description}</Text>
                          {result.merchant && (
                            <Text fontSize="xs" color="gray.500">
                              {result.merchant}
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm">{result.account_nickname}</Text>
                          <Text fontSize="xs" color="gray.500">
                            {result.account_type} • ****{result.account_number?.slice(-4)}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <Badge colorScheme="blue" fontSize="xs">
                          {result.category}
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        <Text
                          fontWeight="semibold"
                          color={result.amount < 0 ? 'red.500' : 'green.500'}
                        >
                          {formatCurrency(result.amount)}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          ) : (
            <Box
              bg={bgColor}
              borderRadius="lg"
              border="1px"
              borderColor={borderColor}
              p={12}
              textAlign="center"
            >
              <Text fontSize="lg" color="gray.600" mb={2}>
                {query ? 'No results found' : 'Enter a search term to find transactions'}
              </Text>
              <Text fontSize="sm" color="gray.500">
                Try searching for a merchant name, category, or description
              </Text>
            </Box>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default SearchResults;
