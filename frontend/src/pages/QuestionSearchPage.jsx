import React, { useMemo, useState } from "react";
import {
  Box, Container, CssBaseline, Grid, Typography, Divider,
  Stack, TextField, InputAdornment, IconButton, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, Chip, Paper, FormControl, InputLabel, Select, MenuItem
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SortIcon from "@mui/icons-material/Sort";

import st2137 from "../../data/json_output/ST2137_questions.json";

function normalizeOneArrayFile(arr, source = "ST2137") {
  return (arr || []).map((q, idx) => ({
    ...q,
    _id: `${source}-${q.question_no ?? idx}`,
    _source: source,
  }));
}

export default function QuestionSearchPage() {
  const allQuestions = useMemo(() => normalizeOneArrayFile(st2137, "ST2137"), []);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(allQuestions);
  const [selected, setSelected] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all")
  const [typeSort, setTypeSort] = useState("none"); 
  const [sortDirection, setSortDirection] = useState("none"); 

const normType = (t) => (t || "").toString().trim().toLowerCase();

const handleSearch = (e) => {
  e?.preventDefault();

  const kw = query.trim().toLowerCase();
  const keywords = kw ? kw.split(/[\s,]+/).filter(Boolean) : [];

  // base set
  let list = [...allQuestions];

  // text search (ANY keyword)
  if (keywords.length) {
    list = list.filter((q) => {
      const hay =
        `${(q.question_stem || "").toLowerCase()} ` +
        `${(q.question_type || "").toLowerCase()} ` +
        `${(q.concept_tags || []).join(" ").toLowerCase()}`;
      return keywords.some((k) => hay.includes(k));
    });
  }

  // question type filter
  if (typeFilter !== "all") {
    list = list.filter((q) => normType(q.question_type) === typeFilter);
  }

   // sort by question type if needed
  if (sortDirection !== "none") {
    list.sort((a, b) => {
      const A = (a.question_type || "").toLowerCase();
      const B = (b.question_type || "").toLowerCase();
      return sortDirection === "asc"
        ? A.localeCompare(B)
        : B.localeCompare(A);
    });
  }

  setRows(list);
  setSelected([]);
};


  const toggleAll = (e) => {
    if (e.target.checked) setSelected(rows.map((r) => r._id));
    else setSelected([]);
  };
  const toggleOne = (id) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#f4f7fa" }}>
      <CssBaseline />
      <Header />

      <Container maxWidth="xl" sx={{ flexGrow: 1, mt: 3, mb: 3 }}>
        {/* Toolbar */}
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Button variant="outlined" size="small">+ CREATE</Button>
              <Button variant="outlined" size="small">DELETE</Button>
              <Button variant="outlined" size="small">EDIT</Button>

              {/* ── Question Type FILTER ── */}
              <FormControl size="small" sx={{ minWidth: 180, ml: { xs: 0, md: 2 } }}>
                <InputLabel id="type-filter-label">Filter: Question Type</InputLabel>
                <Select
                  labelId="type-filter-label"
                  label="Filter: Question Type"
                   value={typeFilter}
                   onChange={(e) => {
                    setTypeFilter(e.target.value);
                    // re-run search with current query and new filter
                    handleSearch();
                  }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="mcq">MCQ</MenuItem>
                  <MenuItem value="open-ended">Open Ended</MenuItem>
                  <MenuItem value="coding">Coding</MenuItem>
                </Select>
              </FormControl>

              
            </Stack>
          </Grid>
          <Grid item xs={12} md={4}>
            <form onSubmit={handleSearch}>
              <TextField
                fullWidth size="small" placeholder="python"
                value={query} onChange={(e) => setQuery(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit" aria-label="search"><SearchIcon/></IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
        </Grid>

        <Box mt={2} mb={1}>
          <Typography variant="h6" fontWeight="bold">
            Questions in Group &lt;Show all Questions&gt;
          </Typography>
          <Divider sx={{ my: 1 }} />
        </Box>

        {/* Table */}
        <Paper elevation={0}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length>0 && selected.length<rows.length}
                      checked={rows.length>0 && selected.length===rows.length}
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
                        onClick={() => {
                          setSortDirection((prev) =>
                            prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
                          );
                          handleSearch();
                        }}
                        sx={{
                         transition: "transform 0.2s",
                         transform:
                          sortDirection === "asc"
                            ? "rotate(180deg)"
                            : sortDirection === "desc"
                            ? "rotate(0deg)"
                            : "rotate(90deg)",
                        }}
                      >
                        <SortIcon fontSize="small" color={sortDirection === "none" ? "disabled" : "action"} />
                      </IconButton>
                    </Box>
                  </TableCell>


                  <TableCell width={220}>Source</TableCell>
                  <TableCell width={56} align="right">
                    <IconButton size="small"><ViewModuleIcon fontSize="small"/></IconButton>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selected.includes(q._id)} onChange={() => toggleOne(q._id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {truncate(q.question_stem || "", 120)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                        {(q.concept_tags || []).slice(0,4).map((t,i)=>(
                          <Chip key={i} label={t} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={prettyType(q.question_type)}
                        color={q.question_type?.toLowerCase()==="coding" ? "warning" : "default"}
                        size="small" variant="outlined"
                      />
                    </TableCell>
                    <TableCell><Typography variant="body2">ST2137</Typography></TableCell>
                    <TableCell align="right">{/* per-row actions */}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display:"flex", justifyContent:"space-between", p:1.5, color:"text.secondary" }}>
            <Typography variant="caption">Rows per page: 8</Typography>
            <Typography variant="caption">Showing {rows.length} result{rows.length!==1?"s":""}</Typography>
          </Box>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
}


function truncate(s, n){ return !s ? "" : (s.length>n ? s.slice(0,n-1)+"…" : s); }
function prettyType(t){
  if (!t) return "Unknown";
  const m = { mcq: "MCQ", "open-ended": "Open Ended", coding: "Coding" };
  return m[t.toLowerCase()] || t;
}

