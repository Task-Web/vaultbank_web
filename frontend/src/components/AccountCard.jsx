import React from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import {
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiHome,
} from 'react-icons/fi';

const accountTypeConfig = {
  checking: {
    icon: FiDollarSign,
    color: 'blue',
    label: 'Checking',
  },
  savings: {
    icon: FiTrendingUp,
    color: 'green',
    label: 'Savings',
  },
  cd: {
    icon: FiTrendingUp,
    color: 'purple',
    label: 'CD',
  },
  'money_market': {
    icon: FiDollarSign,
    color: 'orange',
    label: 'Money Market',
  },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const AccountCard = ({ account }) => {
  const config = accountTypeConfig[account.type] || accountTypeConfig.checking;
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBorderColor = useColorModeValue('vaultbank.500', 'vaultbank.300');

  return (
    <Link to={`/accounts/${account.id}`}>
      <Box
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={6}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: hoverBorderColor,
          boxShadow: 'md',
          transform: 'translateY(-2px)',
        }}
      >
        <Flex justify="space-between" align="start" mb={4}>
          <Flex align="center" gap={3}>
            <Icon
              as={config.icon}
              boxSize={10}
              color={`${config.color}.500`}
              p={2}
              bg={`${config.color}.50`}
              borderRadius="md"
            />
            <Box>
              <Text fontSize="sm" color="gray.600" fontWeight="medium">
                {config.label}
              </Text>
              <Text fontSize="lg" fontWeight="semibold" color="gray.900">
                {account.nickname}
              </Text>
            </Box>
          </Flex>
          {account.card_frozen && (
            <Badge colorScheme="red" size="sm">
              Frozen
            </Badge>
          )}
        </Flex>

        <Box mb={3}>
          <Text fontSize="xs" color="gray.500" mb={1}>
            Available Balance
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="gray.900">
            {formatCurrency(account.available_balance)}
          </Text>
        </Box>

        <Flex justify="space-between" align="center" fontSize="sm">
          <Text color="gray.600">
            ****{account.account_number}
          </Text>
          <Text color="vaultbank.600" fontWeight="medium">
            View Details →
          </Text>
        </Flex>
      </Box>
    </Link>
  );
};

export default AccountCard;
