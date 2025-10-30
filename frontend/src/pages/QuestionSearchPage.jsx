import React, { useMemo, useState, useEffect } from "react";
import {
  Box, Container, CssBaseline, Grid, Typography, Divider,
  Stack, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, Paper, IconButton
} from "@mui/material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SortIcon from "@mui/icons-material/Sort";

// --- 1. IMPORT THE TOOLBAR ---
import QuestionToolbar from '../components/QuestionToolbar';

// --- 2. UPDATED Prop signature ---
export default function QuestionSearchPage({
  searchParams,
  questions,
  goToHomePage,
  goToCreatePage,
  goToEditPage,
  handleDeleteQuestions,
  // --- Props to pass down to the toolbar ---
  goToSearchPage,
  isSafeDeletionEnabled,
  setIsSafeDeletionEnabled
}) {

  const allQuestions = useMemo(() => questions, [questions]);
  const [rows, setRows] = useState(allQuestions);
  const [selected, setSelected] = useState([]);
  const [sortDirection, setSortDirection] = useState("none");

  // --- 3. UPDATED: This effect filters the list based on searchParams ---
  useEffect(() => {
    let filteredList = [...allQuestions];

    if (searchParams) {
      const { query, assessment_type, year, semester, tags } = searchParams;
      
      const kw = query ? query.trim().toLowerCase() : "";
      if (kw) {
        const keywords = kw.split(/[\s,]+/).filter(Boolean);
        filteredList = filteredList.filter((q) => {
          const hay =
            `${(q.question_stem || "").toLowerCase()} ` +
            `${(q.question_type || "").toLowerCase()} ` +
            `${(q.concept_tags || []).join(" ").toLowerCase()}`;
          return keywords.some((k) => hay.includes(k));
        });
      }

      if (assessment_type) {
        filteredList = filteredList.filter(q => 
          (q.question_type || "").toLowerCase() === assessment_type.toLowerCase()
        );
      }
      if (year) { console.log("Filtering by Year (not implemented):", year); }
      if (semester) { console.log("Filtering by Semester (not implemented):", semester); }
      if (tags && tags.length > 0) {
        filteredList = filteredList.filter(q => 
          (q.concept_tags || []).some(tag => tags.includes(tag))
        );
      }
    }

    setRows(filteredList);
    setSelected([]);
    
  }, [searchParams, allQuestions]);

  
  // --- 4. Handlers to be passed to the Toolbar ---
  // These handlers need to calculate which *full question objects*
  // are selected before calling the functions from main.jsx.
  
  const handleEditClick = () => {
    const questionsToEdit = rows.filter(q => selected.includes(q.id));
    goToEditPage(questionsToEdit); 
  };

  const handleDeleteClick = () => {
    // We confirm here *before* calling the main handler
    if (window.confirm(`Are you sure you want to delete ${selected.length} question(s)?`)) {
      handleDeleteQuestions(selected);
      setSelected([]);
    }
  };
  
  const handleSafeDeletionToggle = (event) => {
    setIsSafeDeletionEnabled(event.target.checked);
  };

  // --- 5. Table selection handlers (unchanged) ---
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
        
        {/* --- 6. RENDER THE TOOLBAR --- */}
        {/* We pass all the functions and state from main.jsx down to it */}
        <QuestionToolbar
          numSelected={selected.length}
          goToCreatePage={goToCreatePage}
          goToEditPage={handleEditClick}      // <-- Uses local helper
          goToSearchPage={goToSearchPage}     // <-- From props
          handleDeleteClick={handleDeleteClick} // <-- Uses local helper
          isSafeDeletionEnabled={isSafeDeletionEnabled}
          handleSafeDeletionToggle={handleSafeDeletionToggle}
        />

        {/* --- 7. REMOVED the old button bar --- */}

        <Box mt={2} mb={1}>
          <Typography variant="h6" fontWeight="bold">
            Search Results
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>

        {/* --- 8. The Table (Unchanged) --- */}
        <Paper elevation={0}>
          <TableContainer>
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
                  <TableCell width={160}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        Question Type
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="sort by type"
                        sx={{ transition: "transform 0.2s", transform: "rotate(90deg)" }}
                      >
                        <SortIcon fontSize="small" color={"disabled"} />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell width={220}>Source (File ID)</TableCell>
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
                    <TableCell><Typography variant="body2">{q.file_id || 'N/A'}</Typography></TableCell>
                    <TableCell align="right">{/* per-row actions */}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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


function truncate(s, n) { return !s ? "" : (s.length > n ? s.slice(0, n - 1) + "…" : s); }
function prettyType(t) {
  if (!t) return "Unknown";
  const m = { 
    mcq: "MCQ", 
    "open-ended": "Open Ended", 
    coding: "Coding",
    mrq: "MRQ",
    ordering: "Ordering",
    matching: "Matching"
  };
  return m[t.toLowerCase()] || t;
}

