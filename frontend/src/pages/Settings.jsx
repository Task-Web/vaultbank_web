import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  Flex,
  Badge,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardBody,
  Divider,
  Icon,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Switch,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiClock,
  FiCreditCard,
  FiBell,
  FiFileText,
  FiEdit2,
  FiCheck,
  FiAlertTriangle,
} from 'react-icons/fi';
import { useStateContext } from '../contexts/StateContext';

const Settings = () => {
  const { state, loading, error, applyVaultbankChange } = useStateContext();
  const toast = useToast();
  const { isOpen: isEditProfileOpen, onOpen: onEditProfileOpen, onClose: onEditProfileClose } = useDisclosure();
  const { isOpen: isFreezeModalOpen, onOpen: onFreezeModalOpen, onClose: onFreezeModalClose } = useDisclosure();

  // Form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          <Text color="gray.600">Loading settings...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Alert status="error">
          <AlertIcon />
          Error loading settings: {error}
        </Alert>
      </Box>
    );
  }

  if (!state || !state.data) {
    return (
      <Box p={8}>
        <Alert status="info">
          <AlertIcon />
          No data available. Please initialize your account.
        </Alert>
      </Box>
    );
  }

  const { user_profile = {}, credit_cards = [], accounts = [] } = state.data;
  const { first_name = '', last_name = '', email = '', phone = '',
          address = {}, communication_preferences = {}, security = {} } = user_profile;

  // Communication preferences with defaults
  const prefs = {
    paperless: communication_preferences?.paperless ?? true,
    email_notifications: communication_preferences?.email_notifications ?? true,
    sms_notifications: communication_preferences?.sms_notifications ?? false,
  };

  // Recent logins
  const recentLogins = security?.recent_logins || [];

  // Handle profile edit
  const handleEditProfile = () => {
    setProfileForm({
      first_name: first_name || '',
      last_name: last_name || '',
      email: email || '',
      phone: phone || '',
      street: address?.street || '',
      city: address?.city || '',
      state: address?.state || '',
      zip: address?.zip || '',
    });
    setFormErrors({});
    onEditProfileOpen();
  };

  // Validate profile form
  const validateProfile = () => {
    const errors = {};

    if (!profileForm.first_name.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!profileForm.last_name.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!profileForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = 'Invalid email address';
    }
    if (!profileForm.phone.trim()) {
      errors.phone = 'Phone is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save profile
  const saveProfile = async () => {
    if (!validateProfile()) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = {
        ...user_profile,
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        address: {
          street: profileForm.street.trim(),
          city: profileForm.city.trim(),
          state: profileForm.state.trim(),
          zip: profileForm.zip.trim(),
        },
      };

      await applyVaultbankChange({
        user_profile: updatedProfile,
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onEditProfileClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle communication preference toggle
  const handleTogglePreference = async (key) => {
    try {
      const updatedPrefs = {
        ...prefs,
        [key]: !prefs[key],
      };

      await applyVaultbankChange({
        user_profile: {
          ...user_profile,
          communication_preferences: updatedPrefs,
        },
      });

      toast({
        title: 'Preferences updated',
        description: `"${key.replace('_', ' ')}" has been ${updatedPrefs[key] ? 'enabled' : 'disabled'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle card freeze/unfreeze
  const handleToggleCardFreeze = async (card) => {
    setSelectedCard(card);
    onFreezeModalOpen();
  };

  const confirmCardFreeze = async () => {
    if (!selectedCard) return;

    try {
      const updatedCards = credit_cards.map(card =>
        card.id === selectedCard.id
          ? { ...card, card_frozen: !card.card_frozen }
          : card
      );

      await applyVaultbankChange({
        credit_cards: updatedCards,
      });

      const newFrozenState = !selectedCard.card_frozen;

      toast({
        title: newFrozenState ? 'Card frozen' : 'Card unfrozen',
        description: `Your ${selectedCard.card_number} card has been ${newFrozenState ? 'frozen' : 'unfrozen'}.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onFreezeModalClose();
      setSelectedCard(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update card status.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxW="1400px" py={8} px={4}>
      {/* Header */}
      <Box mb={6}>
        <Heading size="lg" color="gray.800">
          Profile & Settings
        </Heading>
        <Text color="gray.600" mt={1}>
          Manage your personal information, preferences, and security settings
        </Text>
      </Box>

      {/* Tabs */}
      <Tabs variant="enclosed">
        <TabList>
          <Tab>
            <Icon as={FiUser} mr={2} />
            Personal Information
          </Tab>
          <Tab>
            <Icon as={FiBell} mr={2} />
            Communication Preferences
          </Tab>
          <Tab>
            <Icon as={FiShield} mr={2} />
            Security
          </Tab>
        </TabList>

        <TabPanels>
          {/* Personal Information Tab */}
          <TabPanel>
            <Card>
              <CardBody>
                <VStack spacing={6} align="stretch">
                  {/* Header */}
                  <Flex justify="space-between" align="center">
                    <Heading size="md">Personal Information</Heading>
                    <Button
                      leftIcon={<FiEdit2 />}
                      colorScheme="blue"
                      size="sm"
                      onClick={handleEditProfile}
                    >
                      Edit Information
                    </Button>
                  </Flex>

                  <Divider />

                  {/* Name Section */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        First Name
                      </Text>
                      <Text fontSize="lg" fontWeight="500">
                        {first_name || '-'}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.600" mb={1}>
                        Last Name
                      </Text>
                      <Text fontSize="lg" fontWeight="500">
                        {last_name || '-'}
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Divider />

                  {/* Contact Section */}
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={3} display="flex" alignItems="center">
                      <Icon as={FiMail} mr={2} />
                      Email Address
                    </Text>
                    <Text fontSize="md" fontWeight="500">
                      {email || '-'}
                    </Text>
                  </Box>

                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={3} display="flex" alignItems="center">
                      <Icon as={FiPhone} mr={2} />
                      Phone Number
                    </Text>
                    <Text fontSize="md" fontWeight="500">
                      {phone || '-'}
                    </Text>
                  </Box>

                  <Divider />

                  {/* Address Section */}
                  <Box>
                    <Text fontSize="sm" color="gray.600" mb={3} display="flex" alignItems="center">
                      <Icon as={FiMapPin} mr={2} />
                      Mailing Address
                    </Text>
                    {address ? (
                      <Text fontSize="md" fontWeight="500">
                        {address.street}<br />
                        {address.city}, {address.state} {address.zip}
                      </Text>
                    ) : (
                      <Text fontSize="md" color="gray.500">
                        No address on file
                      </Text>
                    )}
                  </Box>
                </VStack>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Communication Preferences Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Paperless Settings */}
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="md" mb={1}>
                          Go Paperless
                        </Heading>
                        <Text fontSize="sm" color="gray.600">
                          Receive statements and documents electronically instead of by mail
                        </Text>
                      </Box>
                      <Badge colorScheme={prefs.paperless ? 'green' : 'gray'}>
                        {prefs.paperless ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.700">
                        Paperless statements
                      </Text>
                      <Switch
                        isChecked={prefs.paperless}
                        onChange={() => handleTogglePreference('paperless')}
                        colorScheme="blue"
                      />
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* Email Notifications */}
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="md" mb={1}>
                          Email Notifications
                        </Heading>
                        <Text fontSize="sm" color="gray.600">
                          Receive updates about your accounts via email
                        </Text>
                      </Box>
                      <Badge colorScheme={prefs.email_notifications ? 'green' : 'gray'}>
                        {prefs.email_notifications ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between" align="center">
                      <Box>
                        <Text fontSize="sm" fontWeight="500" color="gray.700">
                          Email alerts
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Account alerts, transaction notifications, and security updates
                        </Text>
                      </Box>
                      <Switch
                        isChecked={prefs.email_notifications}
                        onChange={() => handleTogglePreference('email_notifications')}
                        colorScheme="blue"
                      />
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* SMS Notifications */}
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Box>
                        <Heading size="md" mb={1}>
                          SMS Notifications
                        </Heading>
                        <Text fontSize="sm" color="gray.600">
                          Receive text message alerts for important account activity
                        </Text>
                      </Box>
                      <Badge colorScheme={prefs.sms_notifications ? 'green' : 'gray'}>
                        {prefs.sms_notifications ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </HStack>
                    <Divider />
                    <HStack justify="space-between" align="center">
                      <Box>
                        <Text fontSize="sm" fontWeight="500" color="gray.700">
                          Text message alerts
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Security alerts, fraud warnings, and critical notifications
                        </Text>
                      </Box>
                      <Switch
                        isChecked={prefs.sms_notifications}
                        onChange={() => handleTogglePreference('sms_notifications')}
                        colorScheme="blue"
                      />
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>

              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  Changes to notification preferences will take effect immediately. You may still receive critical security alerts regardless of these settings.
                </Text>
              </Alert>
            </VStack>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Card Freeze Section */}
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" display="flex" alignItems="center">
                      <Icon as={FiCreditCard} mr={2} />
                      Card Security
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Instantly freeze your cards if they're lost or stolen. Unfreeze anytime when you find them.
                    </Text>

                    <Divider />

                    {/* Credit Cards */}
                    {credit_cards && credit_cards.length > 0 ? (
                      credit_cards.map((card) => (
                        <Box key={card.id}>
                          <HStack justify="space-between" align="center" p={4} bg="gray.50" borderRadius="md">
                            <Box>
                              <Text fontWeight="500">
                                Credit Card ending in {card.card_number}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {card.cardholder_name}
                              </Text>
                            </Box>
                            <HStack>
                              <Badge
                                colorScheme={card.card_frozen ? 'red' : 'green'}
                                display="flex"
                                alignItems="center"
                              >
                                <Icon as={card.card_frozen ? FiAlertTriangle : FiCheck} mr={1} />
                                {card.card_frozen ? 'Frozen' : 'Active'}
                              </Badge>
                              <Button
                                size="sm"
                                colorScheme={card.card_frozen ? 'green' : 'red'}
                                variant={card.card_frozen ? 'solid' : 'outline'}
                                onClick={() => handleToggleCardFreeze(card)}
                              >
                                {card.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
                              </Button>
                            </HStack>
                          </HStack>
                        </Box>
                      ))
                    ) : (
                      <Text color="gray.500" fontSize="sm">
                        No credit cards on file
                      </Text>
                    )}

                    {/* Debit Cards from accounts */}
                    {accounts && accounts.filter(a => a.type === 'checking').map((account) => (
                      <Box key={account.id}>
                        <HStack justify="space-between" align="center" p={4} bg="gray.50" borderRadius="md">
                          <Box>
                            <Text fontWeight="500">
                              Debit Card for {account.nickname}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              ****{account.account_number}
                            </Text>
                          </Box>
                          <HStack>
                            <Badge
                              colorScheme={account.card_frozen ? 'red' : 'green'}
                              display="flex"
                              alignItems="center"
                            >
                              <Icon as={account.card_frozen ? FiAlertTriangle : FiCheck} mr={1} />
                              {account.card_frozen ? 'Frozen' : 'Active'}
                            </Badge>
                            <Button
                              size="sm"
                              colorScheme={account.card_frozen ? 'green' : 'red'}
                              variant={account.card_frozen ? 'solid' : 'outline'}
                              onClick={() => handleToggleCardFreeze(account)}
                            >
                              {account.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
                            </Button>
                          </HStack>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Recent Login Activity */}
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md" display="flex" alignItems="center">
                      <Icon as={FiClock} mr={2} />
                      Recent Login Activity
                    </Heading>
                    <Text fontSize="sm" color="gray.600">
                      Review your recent account access for security purposes
                    </Text>

                    <Divider />

                    {recentLogins.length > 0 ? (
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Date & Time</Th>
                            <Th>Device</Th>
                            <Th>Location</Th>
                            <Th>IP Address</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {recentLogins.map((login, index) => (
                            <Tr key={index}>
                              <Td>{formatDate(login.timestamp)}</Td>
                              <Td>{login.device}</Td>
                              <Td>{login.location}</Td>
                              <Td fontFamily="mono" fontSize="sm">
                                {login.ip_address}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text color="gray.500" fontSize="sm">
                        No recent login activity
                      </Text>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              <Alert status="info">
                <AlertIcon />
                <Text fontSize="sm">
                  If you notice any suspicious activity in your login history, please contact customer support immediately.
                </Text>
              </Alert>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditProfileOpen} onClose={onEditProfileClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Personal Information</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <SimpleGrid columns={2} spacing={4} width="full">
                <FormControl isInvalid={formErrors.first_name}>
                  <FormLabel>First Name</FormLabel>
                  <Input
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    placeholder="John"
                  />
                  <FormErrorMessage>{formErrors.first_name}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={formErrors.last_name}>
                  <FormLabel>Last Name</FormLabel>
                  <Input
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                  <FormErrorMessage>{formErrors.last_name}</FormErrorMessage>
                </FormControl>
              </SimpleGrid>

              <FormControl isInvalid={formErrors.email}>
                <FormLabel>Email Address</FormLabel>
                <Input
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  type="email"
                />
                <FormErrorMessage>{formErrors.email}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={formErrors.phone}>
                <FormLabel>Phone Number</FormLabel>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
                <FormErrorMessage>{formErrors.phone}</FormErrorMessage>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel>Street Address</FormLabel>
                <Input
                  value={profileForm.street}
                  onChange={(e) => setProfileForm({ ...profileForm, street: e.target.value })}
                  placeholder="123 Main Street"
                />
              </FormControl>

              <SimpleGrid columns={2} spacing={4} width="full">
                <FormControl>
                  <FormLabel>City</FormLabel>
                  <Input
                    value={profileForm.city}
                    onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                    placeholder="New York"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>State</FormLabel>
                  <Input
                    value={profileForm.state}
                    onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                    placeholder="NY"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>ZIP Code</FormLabel>
                <Input
                  value={profileForm.zip}
                  onChange={(e) => setProfileForm({ ...profileForm, zip: e.target.value })}
                  placeholder="10001"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditProfileClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={saveProfile}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Card Freeze Confirmation Modal */}
      <Modal isOpen={isFreezeModalOpen} onClose={onFreezeModalClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedCard?.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="start">
              <Alert status={selectedCard?.card_frozen ? 'success' : 'warning'}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="500">
                    {selectedCard?.card_frozen
                      ? 'Are you sure you want to unfreeze this card?'
                      : 'Are you sure you want to freeze this card?'
                    }
                  </Text>
                  <Text fontSize="sm" mt={1}>
                    {selectedCard?.card_frozen
                      ? 'The card will be active for transactions again.'
                      : 'The card will be temporarily blocked for all transactions.'
                    }
                  </Text>
                </Box>
              </Alert>
              {selectedCard && (
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Card ending in <strong>{selectedCard.card_number || selectedCard.account_number}</strong>
                  </Text>
                </Box>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onFreezeModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme={selectedCard?.card_frozen ? 'green' : 'red'}
              onClick={confirmCardFreeze}
            >
              {selectedCard?.card_frozen ? 'Unfreeze Card' : 'Freeze Card'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default Settings;
