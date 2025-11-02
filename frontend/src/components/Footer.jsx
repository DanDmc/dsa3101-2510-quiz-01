/**
 * @file Footer component.
 * @module components/Footer
 * Renders a static footer component designed to sit at the bottom of the page.
 * * It displays copyright information, version details, and maintenance credits.
 * This component takes no props and is purely presentational.
 * * @param {object} props The component props (none used).
 * @returns {JSX.Element} A Material-UI Box element configured as the page footer.
 */

// src//components/Footer.jsx

import React from 'react';
import { Box, Typography } from '@mui/material';

function Footer() {
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 2, 
        px: 2, 
        mt: 'auto', // Pushes footer to the bottom
        backgroundColor: '#f1f1f1', 
        textAlign: 'center',
        borderTop: '1px solid #ddd'
      }}
    >
      <Typography variant="caption" color="textSecondary">
        Designed and built by the DSA3101 Quiz group 1. Maintained by DSA3101 team.
        <br />
        Copyright © 2023 - Present, DSA3101 Quiz group 1. All rights reserved. DSDS Quiz bank, R version 20251013-5de439bp
      </Typography>
    </Box>
  );
}

export default Footer;