"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Table, ChevronDown, LogIn, UserCircle2 } from "lucide-react"; // npm i lucide-react --legacy-peer-deps
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useSTLStore } from "@/store/stlStore";

export default function Topbar() {
  const {
    projectName,
    setProject,
    projects,
    fetchProjects,
    loadProjectById,
    unsavedChanges,
    clearModels,
    saveAllToBackend,
  } = useSTLStore();
  const [selectedProject, setSelectedProject] = useState(0);

  const handleChange = (event) => {
    loadProjectById(event.target.value);
    setSelectedProject(event.target.value);
  };

  const handleSave = async () => {
    await saveAllToBackend();
  };

  const handleDiscard = () => {
    clearModels();
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <nav>
      {/* inner wrapper keeps everything aligned and max‑width constrained */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
          paddingBottom: "1vh",
        }}
      >
        {/* <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-3xl">🧠</span>
        </Link> */}

        <h1>Neuraxis</h1>

        <FormControl
          sx={{ m: 1, minWidth: 200 }}
          variant="outlined"
          size="small"
        >
          <InputLabel id="demo-simple-select-label" sx={{ color: "white" }}>
            Select To Load
          </InputLabel>
          <Select
            labelId="demo-simple-select-label"
            id="demo-simple-select"
            value={selectedProject}
            label="Select To Load"
            onChange={handleChange}
            sx={{
              color: "white", // Text color
              "& .MuiSvgIcon-root": {
                color: "white", // Icon color (dropdown arrow)
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "white", // Outline border
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "white", // Border on hover
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "white", // Border on focus
              },
              "& .MuiSelect-select": {
                paddingRight: "0px", // less padding
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: "black",
                  color: "white",
                },
              },
            }}
          >
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Project Name"
          variant="outlined"
          size="small"
          value={projectName}
          onChange={(e) => setProject(e.target.value)}
          sx={{
            "& .MuiInputBase-input": {
              color: "white", // Text color
            },
            "& .MuiInputLabel-root": {
              color: "white", // Label color
            },
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "white", // Default border color
              },
              "&:hover fieldset": {
                borderColor: "white", // Hover border
              },
              "&.Mui-focused fieldset": {
                borderColor: "white", // Focused border
              },
            },
          }}
        />
        {unsavedChanges && (
          <>
            <Button variant="outlined" onClick={() => handleSave()}>
              Save
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleDiscard()}
            >
              Discard
            </Button>
          </>
        )}

        {/*  Right: Utility icons  */}
        <div style={{ display: "flex", gap: "1.5rem" }}>
          {/* BOQ page link */}
          <Link href="/BOQ" title="Bill of Quantities">
            <Table className="h-6 w-6" />
          </Link>

          {/* Dummy dropdown button
          <button className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-800/60 hover:bg-gray-700/60 transition"
            style={{
              backgroundColor:"black"
            }}>
            Options
            <ChevronDown className="h-4 w-4" />
          </button> */}

          {/* Sign‑in icon button
          <button className="p-2 rounded-md bg-blue-600 hover:bg-blue-500 transition">
            <LogIn className="h-5 w-5" />
          </button> */}

          {/* Placeholder company / profile icon */}
          <UserCircle2 className="h-8 w-8 text-gray-300" />
        </div>
      </div>
    </nav>
  );
}
