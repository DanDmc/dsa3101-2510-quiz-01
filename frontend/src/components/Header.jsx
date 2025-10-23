// src/components/Header.jsx

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';

function Header() {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#3b5998' }}>
      {/* THE FIX:
        1. disableGutters: Removes the default fixed padding/margins of the Toolbar.
        2. sx: Sets the Toolbar to take 100% width and applies explicit padding (px: 3) 
           to align the content correctly with the rest of the page.
      */}
      <Toolbar disableGutters sx={{ width: '100%', px: { xs: 2, md: 3 } }}>
        
        {/* Title */}
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          DSDS QUIZ BANK
        </Typography>
        <Typography variant="body2" sx={{ ml: 2, opacity: 0.8 }}>
          Build assessment questions and store them
        </Typography>
        
        {/* This Box pushes the icons to the right */}
        <Box sx={{ flexGrow: 1 }} />
        
        {/* Icons */}
        <Box>
          <IconButton color="inherit" aria-label="home">
            <HomeIcon />
            <Typography variant="button" sx={{ ml: 0.5 }}>HOME</Typography>
          </IconButton>
          <IconButton color="inherit" aria-label="user">
            <PersonIcon />
            <Typography variant="button" sx={{ ml: 0.5 }}>USER</Typography>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Header;