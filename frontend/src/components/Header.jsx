// src/components/Header.jsx

import React from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Container } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';

// 👈 ACCEPT goToHomePage prop
function Header({ goToHomePage }) {
  
  return (
    <AppBar position="sticky" sx={{ backgroundColor: '#3b5998' }}>
      <Toolbar disableGutters>
        <Container maxWidth={false} disableGutters>
          
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', py: 1 }}>
            
            {/* 🛠️ FIX: Make the entire title area clickable */}
            <Box 
              onClick={goToHomePage} // 👈 ATTACH HANDLER HERE
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer', // Show a pointer cursor to indicate clickability
                mr: 4 
              }}
            >
              {/* Title */}
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'white' }}>
                DSDS QUIZ BANK
              </Typography>
              <Typography variant="body2" sx={{ ml: 2, opacity: 0.8, color: 'white' }}>
                Build assessment questions and store them
              </Typography>
            </Box>
            
            {/* This Box pushes the icons to the right */}
            <Box sx={{ flexGrow: 1 }} />
            
            {/* Icons */}
            <Box>
              {/* You might also want to call goToHomePage on the HOME icon */}
              <IconButton color="inherit" aria-label="home" onClick={goToHomePage}> 
                <HomeIcon />
                <Typography variant="button" sx={{ ml: 0.5 }}>HOME</Typography>
              </IconButton>
              <IconButton color="inherit" aria-label="user">
                <PersonIcon />
                <Typography variant="button" sx={{ ml: 0.5 }}>USER</Typography>
              </IconButton>
            </Box>
            
          </Box>
          
        </Container>
      </Toolbar>
    </AppBar>
  );
}

export default Header;