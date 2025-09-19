import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Plane,
} from "@react-three/drei";
import { Leva, useControls, useCreateStore } from "leva";
import { Physics } from "@react-three/cannon";
import { useSTLStore } from "@/store/stlStore";
import BoundingBox from "./BoundingBox";
import Scales from "./Scales";
import { SnappingCursor } from "./SnappingCursor";
import STLModel, { Cursor } from "./STLModel";
import Models from "./Models";
import IModel from "./IPLYModel";

/** AssetControls – in its own Leva store (assetStore) */
function AssetControls({ model, room, update, store }) {
  const { width, height, depth } = room;

  useControls(
    `Asset • ${model.id}`,
    {
      distWest: {
        value: model.position[0] + width / 2,
        min: 0,
        max: width,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [-width / 2 + v, model.position[1], model.position[2]],
          }),
      },
      distEast: {
        value: width / 2 - model.position[0],
        min: 0,
        max: width,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [width / 2 - v, model.position[1], model.position[2]],
          }),
      },
      distSouth: {
        value: model.position[2] + depth / 2,
        min: 0,
        max: depth,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [model.position[0], model.position[1], -depth / 2 + v],
          }),
      },
      distNorth: {
        value: depth / 2 - model.position[2],
        min: 0,
        max: depth,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [model.position[0], model.position[1], depth / 2 - v],
          }),
      },
      distFloor: {
        value: model.position[1],
        min: 0,
        max: height,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [model.position[0], v, model.position[2]],
          }),
      },
      distCeil: {
        value: height - model.position[1],
        min: 0,
        max: height,
        step: 0.01,
        onChange: (v) =>
          update(model.id, {
            position: [model.position[0], height - v, model.position[2]],
          }),
      },
    },
    { store, collapsed: false }
  );

  return null;
}

export default function Workspace() {
  // two separate Leva stores
  const roomStore = useCreateStore(); // Camera + Room
  const assetStore = useCreateStore(); // Selected asset

  /* Camera (roomStore) */
  const { zoom } = useControls(
    "Camera",
    { zoom: { value: 5, min: 1, max: 20, step: 0.1 } },
    { store: roomStore }
  );

  /* Room dims (roomStore) */
  const { roomWidth, roomHeight, roomDepth } = useControls(
    "Room",
    {
      roomWidth: { value: 10, min: 1, max: 50, step: 1 },
      roomHeight: { value: 5, min: 1, max: 20, step: 1 },
      roomDepth: { value: 10, min: 1, max: 50, step: 1 },
    },
    { store: roomStore }
  );

  // push dims into Zustand
  const setRoomDimensions = useSTLStore((s) => s.setRoomDimensions);
  useEffect(() => {
    setRoomDimensions({
      width: roomWidth,
      height: roomHeight,
      depth: roomDepth,
    });
  }, [roomWidth, roomHeight, roomDepth, setRoomDimensions]);

  /* Drag + selection state */
  const dragging = useSTLStore((s) => s.dragging);
  const draggedModel = useSTLStore((s) => s.draggedModel);
  const models = useSTLStore((s) => s.models);
  const updatePos = useSTLStore((s) => s.updateDragPosition);
  const stopDrag = useSTLStore((s) => s.stopDrag);
  const finishDrag = useSTLStore((s) => s.finishDrag);

  const selectedId = useSTLStore((s) => s.selectedAssetId);
  const setSelectedId = useSTLStore((s) => s.setSelectedAssetId);
  const updateModel = useSTLStore((s) => s.updateModel);
  const selectedModel = models.find((m) => m.id === selectedId);

  /* Hover tint */
  const [hoveredId, setHoveredId] = useState(null);

  /* Orbit lock */
  const orbitRef = useRef(null);
  useEffect(() => {
    if (orbitRef.current) orbitRef.current.enableRotate = !dragging;
  }, [dragging]);

  /* Safe dims */
  const safe = (v) => (v > 0 ? v : 0.0001);
  const w = safe(roomWidth),
    h = safe(roomHeight),
    d = safe(roomDepth);

  /* Drag handlers */
  const handleMove = (e) =>
    dragging && updatePos([e.point.x, e.point.y, e.point.z]);
  const handlePlace = (e) => dragging && (e.stopPropagation(), stopDrag());
  const handleLeave = () => dragging && finishDrag();

  return (
    <div
      style={{
        position: "relative",
        width: "90vw",
        height: "95vh",
        margin: "0 auto",
      }}
    >
      {/* Left‑hand panel (always) */}
      <Leva
        store={roomStore}
        collapsed={false}
        style={{ position: "absolute", top: 10, right: 10, zIndex: 100 }}
      />

      {/* Right‑hand panel container */}
      {selectedModel && (
        <Leva
          store={assetStore}
          collapsed={false}
          style={{ position: "absolute", top: 220, right: 10, zIndex: 100 }}
        />
      )}

      <Scales />

      <Canvas
        camera={{ position: [0, h / 2, d * 1.2], fov: 60, zoom }}
        onPointerLeave={handleLeave}
      >
        {/* lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        {/* drag planes */}
        {dragging && (
          <group onPointerMove={handleMove} onClick={handlePlace}>
            <Plane
              args={[w, d]}
              rotation={[-Math.PI / 2, 0, 0]}
              visible={false}
            />
            <Plane
              args={[w, h]}
              position={[0, h / 2, -d / 2]}
              visible={false}
            />
            <Plane
              args={[w, h]}
              rotation={[0, Math.PI, 0]}
              position={[0, h / 2, d / 2]}
              visible={false}
            />
            <Plane
              args={[d, h]}
              rotation={[0, Math.PI / 2, 0]}
              position={[-w / 2, h / 2, 0]}
              visible={false}
            />
            <Plane
              args={[d, h]}
              rotation={[0, -Math.PI / 2, 0]}
              position={[w / 2, h / 2, 0]}
              visible={false}
            />
          </group>
        )}

        <React.Suspense fallback={null}>
          {/* ghost */}
          {/* {dragging && draggedModel && (
            <mesh
              geometry={draggedModel.geometry}
              position={draggedModel.position}
              scale={draggedModel.scale}
              raycast={() => null}
            >
              <meshStandardMaterial
                color="orange"
                transparent
                opacity={0.6}
                depthTest={false}
              />
            </mesh>
          )} */}

          {/* placed models */}
          {/* {models.map((m) => (
            <mesh
              key={m.id}
              geometry={m.geometry}
              position={m.position}
              scale={m.scale}
              userData={{ id: m.id }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(m.id);
              }}
              onPointerOver={() => setHoveredId(m.id)}
              onPointerOut={() => setHoveredId(null)}
            >
              <meshStandardMaterial
                color={
                  m.id === selectedId
                    ? "yellow"
                    : m.id === hoveredId
                    ? "orange"
                    : "lightgray"
                }
              />
            </mesh>
          ))} */}
          {models.map((model, i) => {
            console.log(models)
            if (model.shape.includes("I")) {
              return (
                <IModel
                  key={i}
                  position={model.position}
                  geom={model.geometry}
                  shape={model.shape}
                  rotation={model.rotation}
                />
              );
            } else if (model.shape.includes("Z")) {
              return (
                <STLModel
                  key={i}
                  position={model.position}
                  geom={model.geometry}
                  shape={model.shape}
                  rotation={model.rotation}
                />
              );
            }
          })}
          <SnappingCursor />
          <Cursor />
        </React.Suspense>

        <BoundingBox
          width={w}
          height={h}
          depth={d}
          color="#fff"
          lineWidth={2}
        />
        <Grid position={[0, -0.01, 0]} args={[w + 0.5, d + 0.5]} infiniteGrid />

        <OrbitControls ref={orbitRef} makeDefault />
        {/* always render gizmo */}
        <GizmoHelper
          alignment="bottom-right"
          margin={[80, 80]}
          controls={orbitRef.current}
        >
          <GizmoViewport
            axisColors={["red", "green", "blue"]}
            labelColor="white"
          />
        </GizmoHelper>

        <Physics />
      </Canvas>

      {/* mount AssetControls so sliders appear below the first panel */}
      {selectedModel && (
        <AssetControls
          key={`${selectedModel.id}-${selectedModel.position.join(",")}`}
          model={selectedModel}
          room={{ width: roomWidth, height: roomHeight, depth: roomDepth }}
          update={updateModel}
          store={assetStore}
        />
      )}
    </div>
  );
}
