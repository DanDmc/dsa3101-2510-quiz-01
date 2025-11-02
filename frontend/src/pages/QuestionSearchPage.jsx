// src/pages/QuestionSearchPage.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box, Container, CssBaseline, Typography, Divider,
  Stack, TextField, InputAdornment, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, Paper, FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const API_BASE = import.meta.env.VITE_APP_API_URL || "http://localhost:5000";

/* ---------------- Helpers ---------------- */

const AY_OPTIONS = ["2025/2026", "2024/2025", "2023/2024", "2022/2023", "Unknown"];
const ASSESSMENT_OPTIONS = ["All", "Final", "Midterm", "Quiz", "Unknown"];

const toAY = (yr) => {
  const y = Number(yr);
  if (!Number.isFinite(y) || y < 2000 || y > 2100) return "Unknown";
  return `${y}/${y + 1}`;
};
const fromAY = (ay) => {
  if (!ay || ay === "All" || ay === "Unknown") return undefined;
  const m = String(ay).match(/^(\d{4})\//);
  return m ? Number(m[1]) : undefined;
};

// --- MODIFICATION 1: Updated prettyType to include new types ---
const prettyType = (t) => {
  const map = {
    mcq: "MCQ",
    "open-ended": "Open Ended",
    openeded: "Open Ended",
    coding: "Coding",
    mrq: "MRQ",
    "fill-in-the-blanks": "Fill in the Blanks",
    others: "Others"
  };
  return map[(t || "").toLowerCase()] || (t || "Unknown");
};

// --- MODIFICATION 2: Updated typeChipProps to add MRQ styling ---
const typeChipProps = (t) => {
  const k = (t || "").toLowerCase();
  if (k === "mcq") return { color: "warning", variant: "outlined" };
  if (k === "coding") return { color: "secondary", variant: "outlined" };
  if (k === "open-ended" || k === "openended" || k === "openeded") return { color: "info", variant: "outlined" };
  if (k === "mrq") return { color: "success", variant: "outlined" };
  return { variant: "outlined" };
};

function normalizeAssessment(_course, assessment) {
  const a = (assessment || "").toString().toLowerCase().trim();
  if (!a) return "Unknown";
  return ["final", "midterm", "quiz"].includes(a) ? a : "Unknown";
}

// ---- Course canonicalization (key vs display) ----
const COURSE_UNKNOWN_KEY = "UNKNOWN";
const COURSE_ALL_KEY = "ALL"; // CHANGE 1: Define uppercase key for 'All'
const courseKey = (val) => {
  const s = (val || "").trim();
  if (!s) return COURSE_UNKNOWN_KEY;
  return s.toUpperCase();
};
const courseLabel = (key) => {
  if (!key || key === COURSE_UNKNOWN_KEY) return "Unknown";
  return key;
};

/* ---------------- Page ---------------- */

export default function QuestionSearchPage({
  initialQuery = "",
  searchParams = null,
  goToCreatePage,
  goToEditPage,
  handleDeleteQuestions,   // passed from App
  onOptionsChange,         // optional: send options back to Home
}) {
  // query + filters
  const [query, setQuery] = useState(initialQuery || "");
  const [fType, setFType] = useState("All");
  const [fCourse, setFCourse] = useState(COURSE_ALL_KEY); // CHANGE 2: Initialize state to uppercase key
  const [fAY, setFAY] = useState("All");
  const [fAssessment, setFAssessment] = useState("All");
  // Concept tag (single-select per your latest requirement)
  const [fConcept, setFConcept] = useState("All");

  // data + ui
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [sortDir, setSortDir] = useState("none");

  // dropdown dynamic options (Course uses [ {key, label} ])
  const [conceptOptions, setConceptOptions] = useState(["All"]);
  const [courseOptions, setCourseOptions] = useState([
    { key: COURSE_ALL_KEY, label: "All" }, // CHANGE 3: Options initialization uses uppercase key
    { key: COURSE_UNKNOWN_KEY, label: "Unknown" },
  ]);

  // --- Seed filters when searchParams/initialQuery arrive ---
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!searchParams) return;

    // 1) keyword
    if (typeof searchParams.query === "string") setQuery(searchParams.query);

    // 2) question type (accepts "type" or "question_type")
    const t = (searchParams.type ?? searchParams.question_type ?? "").toString().trim();
    // --- MODIFICATION 3: Normalize incoming prop to lowercase for state ---
    setFType(t ? t.toLowerCase() : "All");

    // 3) assessment type (map to dropdown labels)
    const a = (searchParams.assessment_type ?? "").toString().toLowerCase().trim();
    if (!a) setFAssessment("All");
    else if (a === "final") setFAssessment("Final");
    else if (a === "midterm") setFAssessment("Midterm");
    else if (a === "quiz") setFAssessment("Quiz");
    else setFAssessment("Unknown");

    // 4) academic year (accepts "academic_year" or "year")
    const y = searchParams.academic_year ?? searchParams.year;
    if (y == null || y === "") setFAY("All");
    else {
      const ay = y === "Unknown" ? "Unknown" : toAY(y);
      setFAY(ay);
    }

    // 5) concept tag (accept array or single; we keep one)
    const tags = Array.isArray(searchParams.concept_tags)
      ? searchParams.concept_tags
      : Array.isArray(searchParams.tags)
        ? searchParams.tags
        : (searchParams.concept_tag ? [searchParams.concept_tag] : []);
    setFConcept(tags.length ? String(tags[0]) : "All");

    // 6) course (key/uppercase)
    const c = (searchParams.course ?? "").toString().trim();
    const normalizedC = c.toUpperCase(); // Ensure we are working with uppercase for comparison

    // CRITICAL FIX 4: Robust Seeding Logic for ALL/UNKNOWN/SPECIFIC
    if (normalizedC === COURSE_UNKNOWN_KEY) {
      setFCourse(COURSE_UNKNOWN_KEY);
    } else if (normalizedC === COURSE_ALL_KEY || normalizedC === "") {
      // If incoming parameter is 'ALL' (e.g., from toolbar state) or empty, set state to the constant 'ALL'.
      setFCourse(COURSE_ALL_KEY); 
    } else {
      // Otherwise, it's a specific course code (e.g., 'ST2131')
      setFCourse(normalizedC); 
    }
  }, [searchParams]);

  // Build URL params for the /search endpoint (supports `q`)
  const buildParams = () => {
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    // This logic is already correct, as fType state is now lowercase
    if (fType !== "All") p.set("type", fType.toLowerCase());

    if (fAssessment !== "All" && fAssessment !== "Unknown") {
      p.set("assessment_type", fAssessment.toLowerCase()); // "final", "midterm", "quiz"
    }
    
    // CRITICAL FIX 5: Use the new COURSE_ALL_KEY for exclusion
    if (fCourse !== COURSE_ALL_KEY && fCourse !== COURSE_UNKNOWN_KEY) p.set("course", fCourse);

    if (fAY !== "All" && fAY !== "Unknown") p.set("academic_year", fromAY(fAY));

    if (fConcept !== "All") p.append("concept_tags", fConcept);
    return p.toString();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search?${buildParams()}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.items || [];

      // Normalize each row
      const normalized = arr.map((q) => {
        const k = (q.course_key && String(q.course_key).trim())
          ? String(q.course_key).toUpperCase()
          : courseKey(q.course);

        const label = (q.course && String(q.course).trim())
          ? String(q.course).trim()
          : courseLabel(k);

        return {
          ...q,
          _id: q.id ?? q.question_id ?? `${q.file_id || "f"}-${q.question_no ?? Math.random()}`,
          question_type: (q.question_type || "").toLowerCase(),
          courseKey: k,
          courseLabel: label,
          assessment_type: normalizeAssessment(q.course, q.assessment_type),
          _ay: toAY(q.year),
        };
      });

      // Dedupe by question_base_id if present, else by (file_id, question_no), else by _id
      const uniq = new Map();
      for (const it of normalized) {
        const key =
          (it.question_base_id != null && it.question_base_id !== 0)
            ? `base:${it.question_base_id}`
            : (it.file_id != null && it.question_no != null)
              ? `fq:${it.file_id}-${it.question_no}`
              : `id:${it._id}`;
        if (!uniq.has(key)) uniq.set(key, it);
      }
      let filtered = Array.from(uniq.values());

      // Client-side unknown buckets
      if (fAY === "Unknown") filtered = filtered.filter((r) => r._ay === "Unknown");
      if (fAssessment === "Unknown") filtered = filtered.filter((r) => !r.assessment_type || r.assessment_type === "Unknown");
      if (fCourse === COURSE_UNKNOWN_KEY) filtered = filtered.filter((r) => r.courseKey === COURSE_UNKNOWN_KEY);

      // Concept tag (single) – include rows that contain that tag
      if (fConcept !== "All") {
        filtered = filtered.filter((r) =>
          (Array.isArray(r.concept_tags) ? r.concept_tags : []).map(String).includes(fConcept)
        );
      }

      // Optional sort by type
      if (sortDir !== "none") {
        filtered.sort((a, b) => {
          const A = a.question_type || "";
          const B = b.question_type || "";
          return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
        });
      }

      setRows(filtered);
      setSelected([]);

      // ----- rebuild Concept options
      const concepts = new Set();
      filtered.forEach((r) => {
        (Array.isArray(r.concept_tags) ? r.concept_tags : []).forEach((t) => concepts.add(String(t)));
      });
      const newConceptOpts = ["All", ...[...concepts].sort((a, b) => a.localeCompare(b))];
      setConceptOptions(newConceptOpts);

      // ----- rebuild Course options
      const courseMap = new Map();
      courseMap.set(COURSE_UNKNOWN_KEY, "Unknown");
      filtered.forEach((r) => courseMap.set(r.courseKey, r.courseLabel));
      const newCourseOpts = [
        { key: COURSE_ALL_KEY, label: "All" }, // FIX: Options must be rebuilt with uppercase key
        ...[...courseMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([k, lbl]) => ({ key: k, label: lbl })),
      ];
      setCourseOptions(newCourseOpts);

      // Share options back to Home (toolbar)
      onOptionsChange?.(newCourseOpts, newConceptOpts);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // fetch when any search input changes
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) didInit.current = true;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, fType, fAY, fAssessment, fConcept, fCourse, sortDir]);

  const submitSearch = (e) => {
    e?.preventDefault();
    fetchData();
  };

  const toggleAll = (e) => {
    if (e.target.checked) setSelected(rows.map((r) => r._id));
    else setSelected([]);
  };
  const toggleOne = (id) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  /* ---------- Edit/Delete handlers (top-left row 2) ---------- */
  const onEditSelected = () => {
    if (!selected.length) return;
    const chosen = rows.filter(r => selected.includes(r._id));
    if (chosen.length) goToEditPage?.(chosen);
  };

  const onDeleteSelected = async () => {
    if (!selected.length) return;
    const ok = window.confirm(`Delete ${selected.length} selected question(s)?`);
    if (!ok) return;
    try {
      await handleDeleteQuestions?.(selected);
    } finally {
      setRows(prev => prev.filter(r => !selected.includes(r._id)));
      setSelected([]);
    }
  };

  /* -------------- UI -------------- */

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f4f7fa" }}>
      <CssBaseline />

      <Container maxWidth="xl" sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        {/* === Controls header === */}
        <Box sx={{ mb: 2 }}>
          {/* Row 1: All filters in a single row */}
          <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
            {/* Keyword */}
            <Box sx={{ flex: 1, minWidth: 260 }}>
              <form onSubmit={submitSearch}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search keyword"
                  placeholder="e.g. regression, python, probability"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton type="submit" aria-label="search">
                          <SearchIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </form>
            </Box>

            {/* --- MODIFICATION 4: Updated Question Type Dropdown --- */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Question Type</InputLabel>
              <Select label="Question Type" value={fType} onChange={(e) => setFType(e.target.value)}>
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="mcq">MCQ</MenuItem>
                <MenuItem value="open-ended">Open Ended</MenuItem>
                <MenuItem value="mrq">MRQ</MenuItem>
                <MenuItem value="fill-in-the-blanks">FILL-IN-THE-BLANKS</MenuItem>
                <MenuItem value="coding">Coding</MenuItem>
                <MenuItem value="others">Others</MenuItem>
              </Select>
            </FormControl>

            {/* Course */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Course</InputLabel>
              <Select label="Course" value={fCourse} onChange={(e) => setFCourse(e.target.value)}>
                {courseOptions.map((opt) => (
                  <MenuItem key={opt.key} value={opt.key}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Academic Year */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Academic Year</InputLabel>
              <Select label="Academic Year" value={fAY} onChange={(e) => setFAY(e.target.value)}>
                <MenuItem value="All">All</MenuItem>
                {AY_OPTIONS.map((ay) => (
                  <MenuItem key={ay} value={ay}>{ay}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Assessment */}
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Assessment</InputLabel>
              <Select label="Assessment" value={fAssessment} onChange={(e) => setFAssessment(e.target.value)}>
                {ASSESSMENT_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Concept Tag (single-select) */}
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>Concept Tag</InputLabel>
              <Select
                label="Concept Tag"
                value={fConcept}
                onChange={(e) => setFConcept(e.target.value)}
              >
                {conceptOptions.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Row 2: left = Edit/Delete, right = Sort */}
          <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              {/* EDIT (leftmost) */}
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={onEditSelected}
                disabled={selected.length === 0}
              >
                Edit
              </Button>

              {/* DELETE */}
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onDeleteSelected}
                disabled={selected.length === 0}
              >
                Delete
              </Button>
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* SORT (far right) */}
            <IconButton
              size="small"
              aria-label="sort by question type"
              onClick={() =>
                setSortDir((p) => (p === "none" ? "asc" : p === "asc" ? "desc" : "none"))
              }
              sx={{
                border: "1px solid #ddd",
                borderRadius: 1,
                transform:
                  sortDir === "asc" ? "rotate(180deg)" :
                    sortDir === "desc" ? "rotate(0deg)" : "rotate(90deg)",
                transition: "transform 0.2s",
              }}
              title={`Sort by type: ${sortDir}`}
            >
              <SortIcon color={sortDir === "none" ? "disabled" : "action"} />
            </IconButton>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Results table */}
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
                  <TableCell sx={{ width: "50%" }}>Question</TableCell>
                  <TableCell sx={{ width: 110 }}>Type</TableCell>
                  <TableCell sx={{ width: 120 }}>Course</TableCell>
                  <TableCell sx={{ width: 140 }}>Academic Year</TableCell>
                  <TableCell sx={{ width: 130 }}>Assessment</TableCell>
                  <TableCell sx={{ width: 280 }}>Concept Tags</TableCell>
                  <TableCell sx={{ width: 56 }} align="right">
                    <IconButton size="small"><ViewModuleIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">Loading…</Typography>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">No results.</Typography>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && rows.map((q) => (
                  <TableRow key={q._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(q._id)}
                        onChange={() => toggleOne(q._id)}
                      />
                    </TableCell>

                    <TableCell
                      sx={{ maxWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}
                      title={q.question_stem || ""}
                    >
                      {q.question_stem || ""}
                    </TableCell>

                    <TableCell>
                      <Chip label={prettyType(q.question_type)} size="small" {...typeChipProps(q.question_type)} />
                    </TableCell>

                    {/* Course column uses human label */}
                    <TableCell>{q.courseLabel}</TableCell>

                    <TableCell>{q._ay}</TableCell>
                    <TableCell>{q.assessment_type || "Unknown"}</TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                        {(Array.isArray(q.concept_tags) ? q.concept_tags : []).slice(0, 6).map((t, i) => (
                          <Chip key={i} label={t} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>

                    <TableCell align="right" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "space-between", p: 1.5, color: "text.secondary" }}>
            <Typography variant="caption">Rows per page: 400</Typography>
            <Typography variant="caption">Showing {rows.length} result{rows.length !== 1 ? "s" : ""}</Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}