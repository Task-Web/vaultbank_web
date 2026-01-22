import React from 'react';
import { Box, useBreakpointValue } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';

// Motion-enabled Box component
const MotionBox = motion(Box);

/**
 * PageTransition wrapper
 * Adds smooth fade-in and slide animations to page content
 * Uses framer-motion for smooth transitions between routes
 */
const PageTransition = ({ children, locationKey }) => {
  // Adjust animation based on screen size
  const slideDistance = useBreakpointValue({ base: 10, md: 20 });

  const variants = {
    initial: {
      opacity: 0,
      x: slideDistance,
    },
    enter: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1.0], // Smooth easing curve
      },
    },
    exit: {
      opacity: 0,
      x: -slideDistance,
      transition: {
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1.0],
      },
    },
  };

  return (
    <MotionBox
      key={locationKey}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={variants}
      width="100%"
    >
      {children}
    </MotionBox>
  );
};

export default PageTransition;
