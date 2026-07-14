import React, { useState } from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Input,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Icon,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react';
import { ChevronDownIcon, BellIcon, SearchIcon } from '@chakra-ui/icons';
import { FiUser, FiSettings } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useStateContext } from '../contexts/StateContext';
import { formatCurrency, maskAccountNumber } from '../utils/formatters';
import { getUserDisplayName } from '../utils/userProfile';

const TopNavigation = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { state } = useStateContext();
  const accounts = state?.data?.accounts || [];
  const displayName = getUserDisplayName(state?.data?.user_profile);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Box
      h="64px"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      position="fixed"
      top={0}
      right={0}
      left="250px"
      zIndex="sticky"
    >
      <Flex
        h="full"
        px={6}
        alignItems="center"
        justify="space-between"
      >
        {/* Left side - Search and Account Selector */}
        <HStack spacing={4} flex={1}>
          <Box position="relative" w="full">
            <Input
              placeholder="Search transactions..."
              size="md"
              pl={10}
              borderRadius="md"
              borderColor="gray.300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              _focus={{ borderColor: 'vaultbank.500', boxShadow: '0 0 0 1px var(--chakra-colors-vaultbank-500)' }}
            />
            <SearchIcon
              position="absolute"
              left={3}
              top="50%"
              transform="translateY(-50%)"
              color="gray.400"
              boxSize={5}
              onClick={() => {
                if (searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              cursor="pointer"
            />
          </Box>

          {/* Account Selector Dropdown */}
          <Menu>
            <MenuButton
              as={Button}
              variant="outline"
              size="md"
              rightIcon={<ChevronDownIcon />}
              minWidth="200px"
              justifyContent="space-between"
              fontWeight="medium"
            >
              All Accounts
            </MenuButton>
            <MenuList minWidth="240px" maxHeight="400px" overflowY="auto">
              <MenuItem as={Link} to="/accounts" fontWeight="semibold">
                <HStack spacing={3} width="full">
                  <Text>All Accounts</Text>
                </HStack>
              </MenuItem>
              {accounts.map((account) => (
                <MenuItem
                  key={account.id}
                  as={Link}
                  to={`/accounts/${account.id}`}
                >
                  <HStack spacing={3} width="full" justify="space-between">
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {account.nickname}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {account.type} • {maskAccountNumber(account.account_number)}
                      </Text>
                    </Box>
                    <Text fontSize="sm" fontWeight="semibold" color="vaultbank.600">
                      {formatCurrency(account.available_balance)}
                    </Text>
                  </HStack>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>

        {/* Right side - Actions */}
        <HStack spacing={4}>
          {/* Quick Actions */}
          <Button
            as={Link}
            to="/transfers"
            size="sm"
            variant="primary"
            borderRadius="md"
          >
            Transfer
          </Button>
          <Button
            as={Link}
            to="/bill-pay"
            size="sm"
            variant="secondary"
            borderRadius="md"
          >
            Pay Bills
          </Button>

          {/* Notifications */}
          <BellIcon
            boxSize={6}
            color="gray.600"
            cursor="pointer"
            _hover={{ color: 'vaultbank.500' }}
          />

          {/* User Menu */}
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              rightIcon={<ChevronDownIcon />}
              px={2}
            >
              <HStack spacing={2}>
                <Avatar size="xs" name={displayName} bg="vaultbank.500" />
                <Text fontSize="sm" fontWeight="medium">
                  {displayName}
                </Text>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem as={Link} to="/settings" icon={<Icon as={FiUser} />}>Profile</MenuItem>
              <MenuItem as={Link} to="/settings" icon={<Icon as={FiSettings} />}>Settings</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default TopNavigation;
