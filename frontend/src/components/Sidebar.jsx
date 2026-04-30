import React, { useState } from 'react';
import { Box, Flex, Text, Link as ChakraLink, Icon, useColorModeValue, Collapse, Button } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  FiHome,
  FiCreditCard,
  FiDollarSign,
  FiRepeat,
  FiFileText,
  FiTrendingUp,
  FiUser,
  FiCamera,
  FiActivity
} from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrency, maskAccountNumber, getAccountTypeIcon } from '../utils/formatters';

const navigation = [
  { name: 'Dashboard', href: '/', icon: FiActivity },
  { name: 'Accounts', href: '/accounts', icon: FiHome },
  { name: 'Transfers', href: '/transfers', icon: FiRepeat },
  { name: 'Bill Pay', href: '/bill-pay', icon: FiDollarSign },
  { name: 'Mobile Deposit', href: '/mobile-deposit', icon: FiCamera },
  { name: 'Credit Cards', href: '/credit-cards', icon: FiCreditCard },
  { name: 'Loans', href: '/loans', icon: FiTrendingUp },
  { name: 'Investments', href: '/investments', icon: FiTrendingUp },
  { name: 'Statements & Documents', href: '/statements', icon: FiFileText },
  { name: 'Profile & Settings', href: '/settings', icon: FiUser },
];

const Sidebar = () => {
  const location = useLocation();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { state } = useStateContext();
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const accounts = state?.data?.accounts || [];

  // Auto-expand Accounts menu when on an account page
  React.useEffect(() => {
    if (location.pathname.startsWith('/accounts/') && location.pathname !== '/accounts') {
      setIsAccountsExpanded(true);
    }
  }, [location.pathname]);

  return (
    <Box
      as="nav"
      w="250px"
      h="100vh"
      position="fixed"
      left={0}
      top={0}
      bg="white"
      borderRight="1px"
      borderColor={borderColor}
      boxShadow="4px 0 24px rgba(0, 0, 0, 0.03)"
      overflowY="auto"
      zIndex="10"
    >
      <Flex
        direction="column"
        h="full"
      >
        {/* Logo/Brand */}
        <Box
          p={6}
          borderBottom="1px"
          borderColor={borderColor}
          bg="linear-gradient(135deg, #00539F 0%, #004687 100%)"
        >
          <Text
            fontSize="2xl"
            fontWeight="bold"
            color="white"
            letterSpacing="-0.5px"
          >
            VaultBank
          </Text>
          <Text fontSize="xs" color="rgba(255, 255, 255, 0.9)" mt={1} fontWeight="500">
            Online Banking
          </Text>
        </Box>

        {/* Navigation Links */}
        <Box flex={1} py={4}>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            const isAccounts = item.name === 'Accounts';

            return (
              <Box key={item.name}>
                <ChakraLink
                  as={isAccounts ? 'div' : Link}
                  to={isAccounts ? undefined : item.href}
                  onClick={isAccounts ? () => setIsAccountsExpanded(!isAccountsExpanded) : undefined}
                  display="flex"
                  alignItems="center"
                  px={6}
                  py={3}
                  color={isActive ? 'vaultbank.500' : 'gray.700'}
                  bg={isActive ? 'vaultbank.50' : 'transparent'}
                  fontWeight={isActive ? 'semibold' : 'normal'}
                  _hover={{
                    bg: isActive ? 'vaultbank.50' : 'gray.50',
                    color: isActive ? 'vaultbank.600' : 'gray.900',
                  }}
                  transition="all 0.2s"
                  cursor={isAccounts ? 'pointer' : 'default'}
                >
                  <Icon as={item.icon} boxSize={5} mr={3} />
                  <Text flex={1}>{item.name}</Text>
                  {isAccounts && (
                    <Icon
                      as={isAccountsExpanded ? ChevronDownIcon : ChevronRightIcon}
                      boxSize={4}
                      transition="transform 0.2s"
                    />
                  )}
                </ChakraLink>

                {/* Accounts Submenu */}
                {isAccounts && (
                  <Collapse in={isAccountsExpanded} animateOpacity>
                    <Box pl={12} pr={4} py={2}>
                      {accounts.map((account) => {
                        const isAccountActive = location.pathname === `/accounts/${account.id}`;
                        return (
                          <ChakraLink
                            key={account.id}
                            as={Link}
                            to={`/accounts/${account.id}`}
                            display="flex"
                            alignItems="center"
                            py={2}
                            color={isAccountActive ? 'vaultbank.600' : 'gray.600'}
                            fontWeight={isAccountActive ? 'semibold' : 'normal'}
                            _hover={{ color: 'vaultbank.500' }}
                            transition="all 0.2s"
                          >
                            <Text fontSize="sm" mr={2}>
                              {getAccountTypeIcon(account.type)}
                            </Text>
                            <Box flex={1}>
                              <Text fontSize="sm">{account.nickname}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {formatCurrency(account.available_balance)}
                              </Text>
                            </Box>
                          </ChakraLink>
                        );
                      })}
                    </Box>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </Box>

      </Flex>
    </Box>
  );
};

export default Sidebar;
