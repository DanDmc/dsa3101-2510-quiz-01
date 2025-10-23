import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
//import './index.css';

// --- ADD THESE IMPORTS ---
// Make sure these paths are correct for your project!
import Header from './components/Header';
import Footer from './components/Footer';
import Container from '@mui/material/Container'; // Import the Container

// --- Your Page Imports ---
import HomePage from './pages/HomePage.jsx';
import CreateQuestionPage from './pages/CreateQuestionPage.jsx';
import EditPage from './pages/EditPage.jsx'; 

// Define page constants for clarity
const PAGES = {
  HOME: 'home',
  CREATE: 'create',
  EDIT: 'edit',
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [selectedQuestions, setSelectedQuestions] = useState([]); 

  // Navigation handlers
  const goToHomePage = () => setCurrentPage(PAGES.HOME);
  const goToCreatePage = () => setCurrentPage(PAGES.CREATE);
  
  const goToEditPage = (selectedIds) => {
    if (selectedIds && selectedIds.length > 0) {
        setSelectedQuestions(selectedIds);
        setCurrentPage(PAGES.EDIT);
    } else {
        alert("Please select at least one question to edit."); 
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.CREATE:
        return <CreateQuestionPage goToHomePage={goToHomePage} />;
      case PAGES.EDIT:
        return <EditPage selectedQuestionIds={selectedQuestions} goToHomePage={goToHomePage} />;
      case PAGES.HOME:
      default:
        return (
          <HomePage 
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage} 
            goToHomePage={goToHomePage}
          />
        );
    }
  };

  // --- THE FIX IS HERE ---
  // The return block is now the final, correct version.
  // It has the permanent Header, Footer, and the
  // full-width Container (`maxWidth={false}`).
  return (
    <StrictMode>
      <Header goToHomePage={goToHomePage} />

      <Container maxWidth={false} sx={{ mt: 4, mb: 5 }}>
        {renderPage()}
      </Container>
      
      <Footer />
    </StrictMode>
  );
}

// This part stays the same
createRoot(document.getElementById('root')).render(<App />);


// You can remove this 'export' if this file is your main entry point
// and isn't being imported anywhere else.
export default App;
