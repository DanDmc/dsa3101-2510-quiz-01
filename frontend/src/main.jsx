// src/main.jsx
import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';
import Container from '@mui/material/Container';

import HomePage from './pages/HomePage.jsx';
import CreateQuestionPage from './pages/CreateQuestionPage.jsx';
import EditPage from './pages/EditPage.jsx';
import QuestionSearchPage from './pages/QuestionSearchPage.jsx';

// -------- Mock fallback data (unchanged) --------
const mockQuestions = [
  { id: 1, question_stem: 'Convert 1110010101 from binary to text', question_type: 'Open ended', difficultyManual: 0.5, difficultyGenerated: null, file_id: 101 },
  { id: 2, question_stem: 'If a route function returns the string "Hello world!", the HTTP status...', question_type: 'Open ended', difficultyManual: 0.8, difficultyGenerated: null, file_id: 102 },
  { id: 3, question_stem: 'How many 8-digit numbers can be formed using 2, 3, 4, 4, 5, 5, 5, 5?', question_type: 'Open ended', difficultyManual: 0.2, difficultyGenerated: null, file_id: 103 },
  { id: 4, question_stem: 'In a simple regression, the RMSE of the regression line is equal to 0.6...', question_type: 'MCQ', difficultyManual: 0.6, difficultyGenerated: null, file_id: 104 },
  { id: 5, question_stem: 'In an SQL database, a record with ID = 1 already exists. Another record...', question_type: 'MCQ', difficultyManual: 0.9, difficultyGenerated: null, file_id: 105 },
  { id: 6, question_stem: 'Which of the following statement(s) is/are correct about primary keys...', question_type: 'MRQ', difficultyManual: 0.3, difficultyGenerated: null, file_id: 106 },
  { id: 7, question_stem: 'You are testing a Flask API endpoint that checks book orders. The...', question_type: 'MRQ', difficultyManual: 0.7, difficultyGenerated: null, file_id: 107 },
  { id: 8, question_stem: 'Correctly order the following steps using the Karush-Kuhn-Tucker (KKT)...', question_type: 'Ordering', difficultyManual: 0.44, difficultyGenerated: null, file_id: 108 },
  { id: 9, question_stem: 'Order the typical stages of finding the Maximum Likelihood Estimator...', question_type: 'Ordering', difficultyManual: 0.32, difficultyGenerated: null, file_id: 109 },
  { id: 10, question_stem: 'Match the term in the Karush-Kuhn-Tucker (KKT) necessary conditions...', question_type: 'Matching', difficultyManual: 0.25, difficultyGenerated: null, file_id: 110 },
  { id: 11, question_stem: 'Match the following matrix or vector components from the Multiple...', question_type: 'Matching', difficultyManual: 0.41, difficultyGenerated: null, file_id: 111 },
  { id: 12, question_stem: 'Match the estimator criterion to the correct principle or context it represents', question_type: 'Matching', difficultyManual: 0.12, difficultyGenerated: null, file_id: 112 },
];

// -------- App constants & helpers --------
const PAGES = { HOME: 'home', CREATE: 'create', EDIT: 'edit', SEARCH: 'search' };
const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api';
console.log(`API Target: ${BASE_API_URL}`);

const COURSE_UNKNOWN_KEY = 'UNKNOWN';
const courseKey = (val) => {
  const s = (val || '').trim();
  if (!s) return COURSE_UNKNOWN_KEY;
  return s.toUpperCase();
};
const courseLabel = (key) => {
  if (!key || key === COURSE_UNKNOWN_KEY) return 'Unknown';
  return key;
};

// Parse "2024/2025" → 2024
const startYearFromAYLabel = (ay) => {
  if (!ay || ay === 'All' || ay === 'Unknown') return '';
  const m = String(ay).match(/^(\d{4})\//);
  return m ? Number(m[1]) : '';
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.HOME);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Search payload kept here and forwarded to QuestionSearchPage
  const [searchParams, setSearchParams] = useState(null);
  const [searchQ, setSearchQ] = useState('');

  // Home table rows
  const [questions, setQuestions] = useState([]);

  // Toolbar options (kept in main and injected into HomePage)
  const [toolbarCourseOptions, setToolbarCourseOptions] = useState([
    { key: 'All', label: 'All' },
    { key: 'UNKNOWN', label: 'Unknown' },
  ]);
  const [toolbarConceptOptions, setToolbarConceptOptions] = useState(['All']);

  // Safe delete toggle
  const [isSafeDeletionEnabled, setIsSafeDeletionEnabled] = useState(true);

  // Build toolbar options from a list of question items
  const buildOptionsFromItems = (items) => {
    const courseMap = new Map();
    courseMap.set('All', 'All');
    courseMap.set(COURSE_UNKNOWN_KEY, 'Unknown');

    const concepts = new Set();

    for (const q of items) {
      const k = q?.course_key && String(q.course_key).trim()
        ? String(q.course_key).toUpperCase()
        : courseKey(q?.course);
      const lbl = q?.course && String(q.course).trim()
        ? String(q.course).trim()
        : courseLabel(k);
      courseMap.set(k, lbl);

      const tags = Array.isArray(q?.concept_tags) ? q.concept_tags : [];
      tags.forEach((t) => concepts.add(String(t)));
    }

    const courses = [...courseMap.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => {
        if (a.key === 'All') return -1;
        if (b.key === 'All') return 1;
        if (a.key === COURSE_UNKNOWN_KEY) return -1;
        if (b.key === COURSE_UNKNOWN_KEY) return 1;
        return a.key.localeCompare(b.key);
      });

    const conceptArr = ['All', ...[...concepts].sort((a, b) => a.localeCompare(b))];
    return { courses, conceptArr };
  };

  // Fetch initial questions and prime toolbar options; enrich from /search if sparse
  const fetchQuestions = async () => {
    try {
      const res = await fetch(`${BASE_API_URL}/getquestion`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      const items = data.items || [];
      setQuestions(items);

      const { courses, conceptArr } = buildOptionsFromItems(items);
      setToolbarCourseOptions(courses);
      setToolbarConceptOptions(conceptArr);

      // If options are sparse (e.g., no tags or only All/Unknown courses), try /search to enrich
      const onlyAllUnknown = courses.length <= 2; // All + Unknown
      const noConcepts = conceptArr.length <= 1;  // only 'All'
      if (onlyAllUnknown || noConcepts) {
        try {
          const res2 = await fetch(`${BASE_API_URL}/search`);
          const data2 = await res2.json();
          const arr = Array.isArray(data2) ? data2 : data2?.items || [];
          const enriched = buildOptionsFromItems(arr);
          // Merge with what we already had (keeps All/Unknown)
          setToolbarCourseOptions(enriched.courses);
          setToolbarConceptOptions(enriched.conceptArr);
        } catch (e2) {
          console.warn('Optional /search enrichment failed:', e2);
        }
      }
    } catch (err) {
      console.error('Could not fetch questions; falling back to mock data.', err);
      setQuestions(mockQuestions);

      const { courses, conceptArr } = buildOptionsFromItems(mockQuestions);
      setToolbarCourseOptions(courses);
      setToolbarConceptOptions(conceptArr);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Navigation handlers
  const goToHomePage = () => {
    setCurrentPage(PAGES.HOME);
    fetchQuestions();
  };
  const goToCreatePage = () => setCurrentPage(PAGES.CREATE);

  // Accept a string keyword OR a filter object from the toolbar/home
  const goToSearchPage = (payload = '') => {
    if (typeof payload === 'string') {
      const text = payload.trim();
      setSearchQ(text);
      setSearchParams({ query: text });
    } else if (payload && typeof payload === 'object') {
      const {
        query = '',
        course = '',
        question_type = '',
        assessment_type = '',
        academic_year = '',   // toolbar may send AY label
        year = '',            // or direct year
        semester = '',
        tags = [],
      } = payload;

      const resolvedYear =
        year !== '' && year !== undefined
          ? year
          : startYearFromAYLabel(academic_year);

      setSearchQ((query || '').trim());
      setSearchParams({
        query: (query || '').trim(),
        course: String(course || '').trim(),
        question_type: String(question_type || '').trim(),
        assessment_type: String(assessment_type || '').trim(),
        year: resolvedYear,
        semester: String(semester || '').trim(),
        tags: Array.isArray(tags) ? tags.map(String) : [],
      });
    } else {
      setSearchQ('');
      setSearchParams({ query: '' });
    }
    setCurrentPage(PAGES.SEARCH);
  };

  const goToEditPage = (questionsToEdit) => {
    if (questionsToEdit && questionsToEdit.length > 0) {
      setSelectedQuestions(questionsToEdit);
      setCurrentPage(PAGES.EDIT);
    } else {
      console.warn('Please select at least one question to edit.');
    }
  };

  const handleDeleteQuestions = (idsToDelete) => {
    if (window.confirm(`Are you sure you want to delete ${idsToDelete.length} question(s)?`)) {
      if (isSafeDeletionEnabled) {
        console.log(`[Safe Deletion Mode]: Soft-deleting IDs: ${idsToDelete.join(', ')}`);
      } else {
        console.warn(`[PERMANENT DELETION MODE]: Permanently deleting IDs: ${idsToDelete.join(', ')}`);
      }
      setQuestions((prev) => prev.filter((q) => !idsToDelete.includes(q.id)));
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.CREATE:
        return <CreateQuestionPage goToHomePage={goToHomePage} />;
      case PAGES.EDIT:
        return <EditPage selectedQuestions={selectedQuestions} goToHomePage={goToHomePage} />;
      case PAGES.SEARCH:
        return (
          <QuestionSearchPage
            initialQuery={searchQ}
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage}
            searchParams={searchParams}
            // Push fresh dropdowns back to main → then to Home toolbar
            onOptionsChange={(courses, concepts) => {
              if (Array.isArray(courses) && courses.length) setToolbarCourseOptions(courses);
              if (Array.isArray(concepts) && concepts.length) setToolbarConceptOptions(concepts);
            }}
            handleDeleteQuestions={handleDeleteQuestions}
            goToSearchPage={goToSearchPage}
            isSafeDeletionEnabled={isSafeDeletionEnabled}
            setIsSafeDeletionEnabled={setIsSafeDeletionEnabled}
          />
        );
      case PAGES.HOME:
      default:
        return (
          <HomePage
            questions={questions}
            goToCreatePage={goToCreatePage}
            goToEditPage={goToEditPage}
            goToSearchPage={goToSearchPage}
            goToHomePage={goToHomePage}
            handleDeleteQuestions={handleDeleteQuestions}
            isSafeDeletionEnabled={isSafeDeletionEnabled}
            setIsSafeDeletionEnabled={setIsSafeDeletionEnabled}
            // Provide toolbar options immediately
            courseOptions={toolbarCourseOptions}
            conceptOptions={toolbarConceptOptions}
          />
        );
    }
  };

  return (
    <StrictMode>
      <Header goToHomePage={goToHomePage} />
      <Container maxWidth={false} sx={{ mt: 4, mb: 4 }}>
        {renderPage()}
      </Container>
      <Footer />
    </StrictMode>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
