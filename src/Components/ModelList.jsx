"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { useEffect, useRef, useState, memo } from "react";
import { useSTLStore } from "@/store/stlStore"; /* ← CHANGED */
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils";
import styled from "styled-components";

const ModelListContainer = styled.div`
  position: absolute;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  max-width: 10vw;
  height: 70vh;
  overflow-y: auto;
  &::-webkit-scrollbar{
    display: none;
  }
   /* Hide scrollbar for IE, Edge */
  -ms-overflow-style: none;

  /* Hide scrollbar for Firefox */
  scrollbar-width: none;
`;

/* ───────────────────────────────────────────────────────────
   IconMesh – spins a tiny preview
   ───────────────────────────────────────────────────────── */
const IconMesh = ({ geometry }) => {
  const meshRef = useRef();
  useFrame((_, dt) => {
    if (meshRef.current) meshRef.current.rotation.y += dt * 0.8;
  });
  return (
    <mesh ref={meshRef} geometry={geometry} scale={[0.005, 0.005, 0.005]}>
      <meshStandardMaterial metalness={0.25} roughness={0.6} />
    </mesh>
  );
};

/* ───────────────────────────────────────────────────────────
   Thumbnail with click logic
   ───────────────────────────────────────────────────────── */
const ModelIcon = memo(function ModelIcon({ url }) {
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    new PLYLoader().load(url, (g) => {
      const nonIndexed = g.toNonIndexed();
      const indexedGeometry = mergeVertices(nonIndexed);

      indexedGeometry.computeVertexNormals();
      indexedGeometry.computeBoundingBox();
      indexedGeometry.center();
      //indexedGeometry.scale(0.001, 0.001, 0.001);
      setGeometry({
        geo: indexedGeometry,
        shape: url.split("/")[2].split(".")[0],
      });
    });
  }, [url]);

  const store = useSTLStore.getState();

  const handleClick = () => {
    if (!geometry) return;

    const pending = store.pendingAttach;

    if (pending) {
      /* snap to face */
      store.addModel(...pending.pos, geometry.geo.clone(), geometry.shape, [0,0,0]);
      store.setPendingAttach(null);
    } else {
      /* start drag */
      const g = geometry.geo.clone();
      g.scale(0.001, 0.001, 0.001);
      store.startDrag(g, geometry.shape);
      store.setSelectedModel({ geometry: g });
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        width: 110,
        height: 110,
        margin: 8,
        border: "1px solid #444",
        borderRadius: 8,
        overflow: "hidden",
        cursor: geometry ? "pointer" : "progress",
      }}
    >
      <Canvas camera={{ position: [0, 0, 3] }} dpr={[1, 2]}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={0.8} />
        {geometry && <IconMesh geometry={geometry.geo} />}
      </Canvas>
    </div>
  );
});

/* ───────────────────────────────────────────────────────────
   Grid of thumbnails
   ───────────────────────────────────────────────────────── */
function ModelList({
  files = [
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
  ],
}) {
  return (
    <ModelListContainer>
      {/* <h3 style={{ width: "100%", marginBottom: 8, color:'white' }}>Select a model:</h3> */}
      {files.map((f) => (
        <ModelIcon key={f} url={f} />
      ))}
    </ModelListContainer>
  );
}

/* export both ways */
export { ModelList };
export default ModelList;
