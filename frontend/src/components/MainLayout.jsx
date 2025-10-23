import React from 'react';
import { Grid } from '@mui/material';

// Import your components
import CreateToolbar from './CreateToolbar';
import QuestionTable from './QuestionTable';
import QuestionGroups from './QuestionGroups';

function MainLayout() {
  return (
    // This is the container that holds everything
    <Grid container spacing={2}> 
      
      {/* 1. Main Content Area */}
      {/* It will take 8/12 columns on medium (md) screens (laptops) */}
      {/* It will take 12/12 columns on extra-small (xs) screens (mobile) */}
      <Grid item md={8} xs={12}>
        <CreateToolbar />   {/* Your toolbar goes here */}
        <QuestionTable />   {/* Your table goes under the toolbar */}
      </Grid>

      {/* 2. Sidebar Area */}
      {/* It will take 4/12 columns on medium (md) screens (laptops) */}
      {/* It will take 12/12 columns on extra-small (xs) screens (mobile) */}
      <Grid item md={4} xs={12}>
        <QuestionGroups />  {/* Your sidebar component */}
      </Grid>

    </Grid>
  );
}

export default MainLayout;