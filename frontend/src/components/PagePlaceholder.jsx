import React from 'react';
import { Box, Flex, Text, Heading } from '@chakra-ui/react';

const PagePlaceholder = ({ title }) => {
  return (
    <Box p={8} bg="gray.50" minH="100vh">
      <Flex direction="column" gap={4}>
        <Heading size="lg">{title}</Heading>
        <Text color="gray.600">
          This page is under construction. Coming soon!
        </Text>
      </Flex>
    </Box>
  );
};

export default PagePlaceholder;
