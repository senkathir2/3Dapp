"use client";

import { Html } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { useState } from "react";
import { useSTLStore } from "@/store/stlStore";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import * as THREE from "three";
export default function ModelChooser() {
  /* global store slices */
  const fileList = [
    "/models/I.PLY",
    "/models/demo2.PLY",
    "/models/Z.PLY",
    "/models/500I.PLY",
    "/models/700I.PLY",
    "/models/1000I.PLY",
    "/models/1500I.PLY",
    "/models/2000I.PLY",
    "/models/2500I.PLY",
    "/models/2770I.PLY",
  ];
  const pendingAttach = useSTLStore((s) => s.pendingAttach);
  const addModel = useSTLStore((s) => s.addModel);
  const clearPending = useSTLStore((s) => s.setPendingAttach);

  const [busy, setBusy] = useState(false);

  /* no face selected → no overlay */
  if (!pendingAttach) return null;

  /* pick + load */
  function pick(fileUrl) {
    setBusy(true);

    new PLYLoader().load(fileUrl, (geom) => {
      geom.computeVertexNormals();
      geom.computeBoundingBox();
      geom.center();
      geom.scale(0.001, 0.001, 0.001);

      const bbox = new THREE.Box3().setFromBufferAttribute(
        geom.attributes.position
      );

      const size = new THREE.Vector3();
      bbox.getSize(size);

      console.log("size", size);

      /* 🔑 grab the *current* pendingAttach safely */
      const attach = useSTLStore.getState().pendingAttach;
      const newShape = fileUrl.split("/")[2].split(".")[0];
      const offsetDistance = Math.max(size.x, size.y, size.z) / 2;

      console.log("offset", offsetDistance);

      // Final offset origin
      const offsetOrigin = attach.faceCenterWorld
        .clone()
        .add(attach.offsetDir.multiplyScalar(offsetDistance));

      let pos = [];
      if (attach) {
        useSTLStore.getState().setSnapModel({
          geom,
          shape: newShape,
          faceNormal: attach.faceNormal,
          basePoint: attach.basePoint,
          dragPlane: attach.dragPlane,
          u: attach.u,
          v: attach.v,
          size: size,
          uLimit: attach.uLimit,
          vLimit: attach.vLimit,
          rotation: attach.rotation,
          faceCenterWorld: attach.faceCenterWorld,
          offsetDir: attach.offsetDir,
          offsetOrigin,
        });
        // addModel(attach.worldCenter.x*0.001, attach.worldCenter.y*0.001 ,attach.worldCenter.z*0.001 , geom, newShape);
        clearPending(null);
      }

      setBusy(false);
    });
  }

  return (
    <Html>
      <div
        style={{
          position: "fixed",
          top: "40%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 2px 10px #0003",
          minWidth: 240,
        }}
      >
        <h4>Select model</h4>

        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0" }}>
          {fileList.map((f) => (
            <li
              key={f}
              style={{
                margin: "6px 0",
                cursor: busy ? "progress" : "pointer",
                opacity: busy ? 0.4 : 1,
              }}
              onClick={() => !busy && pick(f)}
            >
              {f.replace("/models/", "")}
            </li>
          ))}
        </ul>

        <button
          disabled={busy}
          onClick={() => clearPending(null)}
          style={{ marginTop: 12 }}
        >
          Cancel
        </button>
      </div>
    </Html>
  );
}
