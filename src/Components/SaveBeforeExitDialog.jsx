import React, { useEffect, useState } from "react";
import { useSTLStore } from "../store/stlStore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import styled from "styled-components";
import { Input, TextField } from "@mui/material";

const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    bgcolor: "black",
    color: "white",
    border: "2px solid #cecece",
    boxShadow: 24,
    p: 4,
    display: "flex",
    flexDirection: "column",
    gap: "2vh",
  };

  const ButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    gap: 4vw;
  `;

export default function SaveBeforeExitDialog() {
  const { unsavedChanges, saveAllToBackend, projectName, setProject, clearModels } = useSTLStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        setShow(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChanges]);

  const handleSave = async () => {
    await saveAllToBackend();
    if(!unsavedChanges){
      setShow(false);
    }
    //window.location.reload();
  };

  const handleDiscard = () => {
    clearModels()
    setShow(false);
  };

  if (!show) return null;

  return (
    <div>
      <Modal
        open={show}
        //onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            You have unsaved changes. Save before exiting?
          </Typography>
          <TextField
            label="Project Name"
            variant="outlined"
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
          <ButtonContainer>
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
          </ButtonContainer>
        </Box>
      </Modal>
    </div>
  );
}
