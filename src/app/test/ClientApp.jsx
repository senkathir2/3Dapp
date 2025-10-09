/* ─────────────────────────────────────────────────────────────
   app/test/ClientApp.jsx
   Client-side UI for the /test route
   ──────────────────────────────────────────────────────────── */
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./page.module.css";

import ModelList from "@/Components/ModelList";
import BOQ from "@/Components/Boq";
import ClientOnly from "@/Components/ClientOnly";
import { useSTLStore } from "@/store/stlStore"; // NEW
import Topbar from "@/Components/TopBar";
import SaveBeforeExitDialog from "@/Components/SaveBeforeExitDialog";
import { Toaster } from "react-hot-toast";

/* heavy R3F bundles */
const Workspace = dynamic(() => import("@/Components/Workspace"), {
  ssr: false,
});
const ControlPanel = dynamic(() => import("@/Components/ControlPanel"), {
  ssr: false,
});

/* ───────────────────────────────────────────────────────────── */
export default function ClientApp({ files }) {
  /* share the STL file list with the global store (for ModelChooser) */
  const setFileList = useSTLStore((s) => s.setFileList);
  useEffect(() => {
    console.log("files", files);
    setFileList(files);
  }, [files, setFileList]);

  /* -------- local UI state (unchanged from your old Home) ------- */
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedId] = useState(null);
  const [connections, setConnections] = useState({});

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  const updateAsset = (id, upd) =>
    setAssets(assets.map((a) => (a.id === id ? { ...a, ...upd } : a)));

  /* ─────────────────────────── render ────────────────────────── */
  return (
    <div className={styles.page}>
      {/* thumbnail picker (drag OR face-attach) */}
      <Topbar styles={{ width: "100vw" }} />
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <SaveBeforeExitDialog />
      <ModelList />

      <ClientOnly>
        <Workspace
          assets={assets}
          selectedAssetId={selectedAssetId}
          onSelectAsset={setSelectedId}
          onUpdateAsset={updateAsset}
          connections={connections}
          setConnections={setConnections}
        />

        <BOQ />
        {selectedAsset && (
          <ControlPanel
            selectedAsset={selectedAsset}
            onUpdateAsset={(upd) => updateAsset(selectedAssetId, upd)}
          />
        )}
      </ClientOnly>
    </div>
  );
}
