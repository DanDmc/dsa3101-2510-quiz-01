import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
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
        // Pass goToHomePage to CreateQuestionPage so it can pass it to the Header
        return <CreateQuestionPage goToHomePage={goToHomePage} />;
      case PAGES.EDIT:
        // Pass goToHomePage to EditPage
        return <EditPage selectedQuestionIds={selectedQuestions} goToHomePage={goToHomePage} />;
      case PAGES.HOME:
      default:
        // Pass both navigation functions to HomePage
        return (
          <HomePage 
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage} 
            goToHomePage={goToHomePage} // 👈 Pass to HomePage
          />
        );
    }
  };

  return (
    <StrictMode>
      {renderPage()}
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(<App />);