// src/components/Header.jsx

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Container } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';

// Define the desired dark color for the icons and text
const ICON_TEXT_COLOR = '#2D2D2D';

function Header({ goToHomePage }) {
  return (
    <AppBar position="sticky" sx={{ backgroundColor: '#F5F5F5' }}>
      <Toolbar disableGutters>
        <Container maxWidth={false} disableGutters>
          
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
            
            {/* Title Area (UNCHANGED) */}
            <Box 
              onClick={goToHomePage} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer', 
                mr: 4 
              }}
            >
              {/* Title */}
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#EF6C00' }}>
                DSDS QUIZ BANK
              </Typography>
              <Typography variant="body2" sx={{ ml: 2, opacity: 0.8, color: '#C4C4C4' }}>
                Build assessment questions and store them
              </Typography>
            </Box>
            
            {/* This Box pushes the icons to the right (UNCHANGED) */}
            <Box sx={{ flexGrow: 1 }} />
            
            {/* Icons */}
            <Box>
              {/* HOME ICON: Removed color="inherit" and set color via sx on the IconButton */}
              <IconButton 
                aria-label="home" 
                onClick={goToHomePage}
                sx={{ color: ICON_TEXT_COLOR }} // 👈 FIX APPLIED HERE
              > 
                <HomeIcon />
                <Typography variant="button" sx={{ ml: 0.5, color: ICON_TEXT_COLOR }}>HOME</Typography>
              </IconButton>
              
              {/* USER ICON: Removed color="inherit" and set color via sx on the IconButton */}
              <IconButton 
                aria-label="user"
                sx={{ color: ICON_TEXT_COLOR }} // 👈 FIX APPLIED HERE
              >
                <PersonIcon />
                <Typography variant="button" sx={{ ml: 0.5, color: ICON_TEXT_COLOR }}>USER</Typography>
              </IconButton>
            </Box>
            
          </Box>
          
        </Container>
      </Toolbar>
    </AppBar>
  );
}

export default Header;