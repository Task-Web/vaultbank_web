import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  Card,
  CardBody,
  VStack,
  HStack,
  Input,
  Textarea,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiDownload, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import { api } from '../apiClient';

const COOKIE_NAME = import.meta.env.VITE_COOKIE_NAME || 'user_id';
const COOKIE_MAX_AGE = Number(import.meta.env.VITE_COOKIE_MAX_AGE || 60 * 60 * 24 * 30);

const applyCookieFromQuery = () => {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const override = url.searchParams.get('cookie');
  if (!override) return false;
  let cookie = `${COOKIE_NAME}=${encodeURIComponent(override)}; Path=/; SameSite=Lax`;
  if (Number.isFinite(COOKIE_MAX_AGE) && COOKIE_MAX_AGE > 0) {
    cookie += `; Max-Age=${Math.floor(COOKIE_MAX_AGE)}`;
  }
  document.cookie = cookie;
  const redirectUrl = url.origin;
  if (window.location.href !== redirectUrl) {
    window.location.replace(redirectUrl);
    return true;
  }
  return false;
};

const STATE_SCHEMA_DOCS = `State Structure:
{
  "data": {
    "accounts": [
      {
        "id": "string",
        "type": "checking|savings|cd|money_market",
        "nickname": "string",
        "account_number": "string (last 4)",
        "routing_number": "string",
        "current_balance": number,
        "available_balance": number,
        "currency": "USD",
        "opened_date": "ISO date string",
        "transactions": [...],
        "statements": [...],
        "status": "active|frozen|closed",
        "card_frozen": boolean
      }
    ],
    "credit_cards": [...],
    "loans": [...],
    "investments": {
      "brokerage": {...},
      "retirement": [...]
    },
    "bill_pay": {
      "payees": [...],
      "scheduled_payments": [...],
      "payment_history": [...]
    },
    "transfers": {
      "history": [...],
      "scheduled": [...]
    },
    "mobile_deposits": [...],
    "user_profile": {...}
  },
  "meta": {
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp",
    "version": 1,
    "type": "unrestricted"
  },
  "note": "Optional note"
}`;

const StateManage = () => {
  const [state, setState] = useState(null);
  const [info, setInfo] = useState(null);
  const [jsonState, setJsonState] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  const userId = useMemo(() => state?.user_id || 'pending cookie', [state]);

  const handleError = (err) => {
    toast({
      title: 'Error',
      description: err.message || 'Operation failed',
      status: 'error',
      duration: 5000,
    });
  };

  const refreshState = async () => {
    try {
      setLoading(true);
      const next = await api.getState();
      setState(next);
      setJsonState(JSON.stringify(next.state, null, 2));
      setNote(next.state.note || '');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshInfo = async () => {
    try {
      const details = await api.getInfo();
      setInfo(details);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => {
    const redirected = applyCookieFromQuery();
    if (redirected) return;
    refreshState();
    refreshInfo();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const parsed = JSON.parse(jsonState);
      await api.patchState(parsed, note || undefined);
      await refreshState();
      toast({
        title: 'State Updated',
        description: 'Your changes have been saved successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all state? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await api.resetState();
      setNote('');
      await refreshState();
      toast({
        title: 'State Reset',
        description: 'All state has been cleared',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonState], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'State has been exported to JSON file',
      status: 'success',
      duration: 2000,
    });
  };

  const validateJson = () => {
    try {
      JSON.parse(jsonState);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isValidJson = validateJson();

  return (
    <Box p={8} bg={bgColor} minH="100vh">
      <VStack align="stretch" spacing={8}>
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>State Management</Heading>
          <Text color="gray.600">View and manage your per-user application state</Text>
        </Box>

        {/* User Info */}
        <HStack spacing={4}>
          <Card bg={cardBg} flex={1}>
            <CardBody py={4}>
              <Text fontSize="sm" color="gray.500">User ID</Text>
              <Code fontSize="sm" colorScheme="blue">{userId}</Code>
            </CardBody>
          </Card>
          <Card bg={cardBg} flex={1}>
            <CardBody py={4}>
              <Text fontSize="sm" color="gray.500">API Base</Text>
              <Code fontSize="sm">{api.baseUrl || 'N/A'}</Code>
            </CardBody>
          </Card>
        </HStack>

        {/* Main Tabs */}
        <Card>
          <CardBody>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab>Documentation</Tab>
                <Tab>Manage State</Tab>
              </TabList>

              <TabPanels>
                {/* Documentation Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={6}>
                    <Alert status="info">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Cookie-Scoped State Management</Text>
                        <Text fontSize="sm">
                          This application uses cookie-based user identification. Each user gets their own isolated state.
                          Modify state carefully as it affects your banking simulation data.
                        </Text>
                      </Box>
                    </Alert>

                    <Box>
                      <Heading size="md" mb={4}>State Schema Reference</Heading>
                      <Text fontSize="sm" color="gray.600" mb={4}>
                        The state object contains all your banking data including accounts, transactions, cards, and more.
                      </Text>
                      <Card bg="gray.50" p={4}>
                        <pre style={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          margin: 0
                        }}>
                          {STATE_SCHEMA_DOCS}
                        </pre>
                      </Card>
                    </Box>

                    <Divider />

                    <Box>
                      <Heading size="md" mb={4}>API Endpoints</Heading>
                      <VStack align="stretch" spacing={3}>
                        <Box>
                          <Text fontWeight="medium">GET /api/state</Text>
                          <Text fontSize="sm" color="gray.600">Fetch current user state</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="medium">PATCH /api/state</Text>
                          <Text fontSize="sm" color="gray.600">Merge changes into existing state</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="medium">PUT /api/state</Text>
                          <Text fontSize="sm" color="gray.600">Replace entire state</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="medium">DELETE /api/state</Text>
                          <Text fontSize="sm" color="gray.600">Reset/clear all state</Text>
                        </Box>
                        <Box>
                          <Text fontWeight="medium">GET /api/info</Text>
                          <Text fontSize="sm" color="gray.600">Get system and request information</Text>
                        </Box>
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Manage State Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <HStack justify="space-between">
                      <Heading size="md">State Editor</Heading>
                      <HStack spacing={2}>
                        <Button
                          leftIcon={<FiRefreshCw />}
                          size="sm"
                          onClick={refreshState}
                          isLoading={loading}
                        >
                          Refresh
                        </Button>
                        <Button
                          leftIcon={<FiDownload />}
                          size="sm"
                          variant="outline"
                          onClick={handleDownload}
                          isDisabled={!jsonState}
                        >
                          Download
                        </Button>
                        <Button
                          leftIcon={<FiTrash2 />}
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={handleReset}
                          isLoading={loading}
                        >
                          Reset
                        </Button>
                      </HStack>
                    </HStack>

                    <Alert status="warning" fontSize="sm">
                      <AlertIcon />
                      <Box>
                        <Text fontWeight="bold">Warning</Text>
                        <Text>Modifying state directly can break your banking simulation. Only edit if you know what you're doing.</Text>
                      </Box>
                    </Alert>

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={2}>Note (optional)</Text>
                      <Input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Describe your changes..."
                        size="sm"
                      />
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={2}>State JSON</Text>
                      <Textarea
                        value={jsonState}
                        onChange={(e) => setJsonState(e.target.value)}
                        minH="500px"
                        fontFamily="mono"
                        fontSize="sm"
                        placeholder="State will appear here..."
                        bg={!isValidJson && jsonState ? 'red.50' : 'white'}
                      />
                      {!isValidJson && jsonState && (
                        <Text color="red.500" fontSize="sm" mt={2}>
                          ⚠️ Invalid JSON format
                        </Text>
                      )}
                    </Box>

                    <Button
                      leftIcon={<FiSave />}
                      colorScheme="blue"
                      onClick={handleSave}
                      isLoading={loading}
                      isDisabled={!isValidJson || !jsonState}
                      width="full"
                    >
                      Save Changes (PATCH)
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>

        {/* Backend Info Card */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Backend Information</Heading>
              <Button
                leftIcon={<FiRefreshCw />}
                size="sm"
                variant="outline"
                onClick={refreshInfo}
                isLoading={loading}
              >
                Refresh
              </Button>
            </HStack>
            <Box bg="gray.50" p={4} borderRadius="md">
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px',
                fontFamily: 'monospace',
                margin: 0,
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {info ? JSON.stringify(info, null, 2) : '// Loading...'}
              </pre>
            </Box>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default StateManage;
