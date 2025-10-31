import React, { useMemo, useState, useEffect } from "react";
import {
  Box, Container, CssBaseline, Grid, Typography, Divider,
  Stack, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, Paper, IconButton, CircularProgress
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SortIcon from "@mui/icons-material/Sort";
import QuestionToolbar from '../components/QuestionToolbar';

// --- 1. Define the API base URL (same as main.jsx) ---
const BASE_API_URL = import.meta.env.VITE_APP_API_URL || '/api';

const DEFAULT_PARAMS = { query: "", question_type: "", assessment_type: "", year: "", semester: "", tags: [] };

export default function QuestionSearchPage({
  searchParams,
  // questions prop is no longer needed
  goToHomePage,
  goToCreatePage,
  goToEditPage,
  handleDeleteQuestions,
  goToSearchPage,
  isSafeDeletionEnabled,
  setIsSafeDeletionEnabled
}) {

  const [rows, setRows] = useState([]); 
  const [loading, setLoading] = useState(false); // Loading state
  const [selected, setSelected] = useState([]);
  const [sortDirection, setSortDirection] = useState("none");
  const [localParams, setLocalParams] = useState(searchParams || DEFAULT_PARAMS);

  const handleLocalSearch = (params) => {
    console.log("Setting local search params:", params);
    setLocalParams(params);
  };

  // --- THIS IS THE FINAL VERSION OF THE API CALL ---
  useEffect(() => {
    const fetchFilteredQuestions = async () => {
      setLoading(true);
      
      const params = new URLSearchParams();
      
      // We use 'localParams' now, which is guaranteed to be up-to-date.
      if (localParams.query) {
        params.append('q', localParams.query); 
      }
      if (localParams.question_type) params.append('question_type', localParams.question_type);
      if (localParams.assessment_type) params.append('assessment_type', localParams.assessment_type);
      if (localParams.year) params.append('year', localParams.year);
      if (localParams.semester) params.append('semester', localParams.semester);
      if (localParams.tags && localParams.tags.length > 0) {
        localParams.tags.forEach(tag => params.append('concept_tags', tag));
      }

      const queryString = params.toString();
      const fetchUrl = `${BASE_API_URL}/getquestion?${queryString}`;
      
      console.log("Fetching from API:", fetchUrl); // For debugging

      try {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRows(data.items || []);

      } catch (error) {
        console.error("Failed to fetch questions:", error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredQuestions();
    setSelected([]);
    
  }, [localParams]); 

  // Handlers to be passed to the Toolbar
  const handleEditClick = () => {
    const questionsToEdit = rows.filter(q => selected.includes(q.id));
    goToEditPage(questionsToEdit); 
  };

  const handleDeleteClick = () => {
    if (window.confirm(`Are you sure you want to delete ${selected.length} question(s)?`)) {
      handleDeleteQuestions(selected);
      setSelected([]);
    }
  };
  
  const handleSafeDeletionToggle = (event) => {
    setIsSafeDeletionEnabled(event.target.checked);
  };

  // Table selection handlers
  const toggleAll = (e) => {
    if (e.target.checked) setSelected(rows.map((r) => r.id));
    else setSelected([]);
  };
  const toggleOne = (id) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f4f7fa" }}>
      <CssBaseline />

      <Container maxWidth="xl" sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        
        {/* Render the unified toolbar */}
        <QuestionToolbar
          numSelected={selected.length}
          goToCreatePage={goToCreatePage}
          goToEditPage={handleEditClick}
          goToSearchPage={handleLocalSearch} // <-- PASS THE LOCAL HANDLER
          handleDeleteClick={handleDeleteClick}
          isSafeDeletionEnabled={isSafeDeletionEnabled}
          handleSafeDeletionToggle={handleSafeDeletionToggle}
        />

        <Box mt={2} mb={1}>
          <Typography variant="h6" fontWeight="bold">
            Search Results
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>

        {/* The Table */}
        <Paper elevation={0}>
          <TableContainer>
            {/* Added Loading Indicator */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selected.length > 0 && selected.length < rows.length}
                        checked={rows.length > 0 && selected.length === rows.length}
                        onChange={toggleAll}
                      />
                    </TableCell>
                    <TableCell>Question</TableCell>
                    <TableCell width={160}>Question Type</TableCell>
                    <TableCell width={120}>Assessment</TableCell>
                    <TableCell width={80}>Year</TableCell>
                    <TableCell width={120}>Semester</TableCell>
                    <TableCell width={56} align="right">
                      <IconButton size="small"><ViewModuleIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((q) => (
                    <TableRow key={q.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selected.includes(q.id)} onChange={() => toggleOne(q.id)} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {truncate(q.question_stem || "", 120)}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                          {(q.concept_tags || []).slice(0, 4).map((t, i) => (
                            <Chip key={i} label={t} size="small" variant="outlined" />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={prettyType(q.question_type)}
                          color={q.question_type?.toLowerCase() === "coding" ? "warning" : "default"}
                          size="small" variant="outlined"
                        />
                      </TableCell>
                      <TableCell><Typography variant="body2">{q.assessment_type || 'N/A'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{q.year || 'N/A'}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{q.semester || 'N/A'}</Typography></TableCell>
                      <TableCell align="right">{/* per-row actions */}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.5, color: "text.secondary" }}>
            <Typography variant="caption">Rows per page: {rows.length}</Typography>
            <Typography variant="caption">Showing {rows.length} result{rows.length !== 1 ? "s" : ""}</Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

// Helper functions
function truncate(s, n) { return !s ? "" : (s.length > n ? s.slice(0, n - 1) + "…" : s); }
function prettyType(t) {
  if (!t) return "Unknown";
  const m = { 
    mcq: "MCQ", 
    "open-ended": "Open Ended", 
    coding: "Coding",
    mrq: "MRQ",
    ordering: "Ordering",
    matching: "Matching",
    "fill-in-the-blanks": "Fill-in-the-blanks",
    others: "Others"
  };
  return m[t.toLowerCase()] || t;
}

