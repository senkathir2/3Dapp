"use client";

import { Html } from "@react-three/drei";
import { Box3, Vector3, Plane, Raycaster } from "three";
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useSTLStore } from "@/store/stlStore";
import ModelChooser from "./ModelChooser";
import IModel from "./IPLYModel";

/* -------- helper to render every placed part -------- */
export const Models = () => {
  const models = useSTLStore((s) => s.models);
  return models.map(({ pos, geo, shape, rotation }, i) => {
    if (shape.includes("I")) {
      return (
        <IModel
          key={i}
          position={pos}
          geom={geo}
          shape={shape}
          rotation={rotation}
        />
      );
    } else if (shape.includes("Z")) {
      return (
        <STLModel
          key={i}
          position={pos}
          geom={geo}
          shape={shape}
          rotation={rotation}
        />
      );
    }
  });
};

/* ------------------- ONE MESH ----------------------- */
export default function STLModel({
  id,
  geom,
  position,
  shape,
  rotation = [0, 0, 0],
}) {
  const meshRef = useRef();
  const [size, setSize] = useState(null);
  const [center, setCenter] = useState(null);
  const [pickBox, setPick] = useState(null);
  const [hover, setHover] = useState(null);
  const { camera, gl, scene } = useThree();

  const setPendingAttach = useSTLStore((s) => s.setPendingAttach);

  // Cache bounding box after rotation is applied
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.updateMatrixWorld(true);

    const bbox = new Box3().setFromObject(mesh);
    const sz = new Vector3();
    const ctr = new Vector3();
    bbox.getSize(sz);
    bbox.getCenter(ctr);

    setSize(sz);
    setCenter(ctr);
    setPick(new THREE.BoxGeometry(sz.x, sz.y, sz.z));
  }, [geom]);

  const onMove = useCallback((e) => {
    e.stopPropagation();
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.updateMatrixWorld(true);

    // 1. Face normal in world space
    const faceNormal = e.face.normal
      .clone()
      .transformDirection(mesh.matrixWorld)
      .normalize();

    // 2. Mesh's local +X direction in world space
    const worldLocalX = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    // 3. Compare face normal to local +X and -X
    const angleToX = faceNormal.angleTo(worldLocalX);
    const angleToNegX = faceNormal.angleTo(worldLocalX.clone().negate());
    const ANGLE_TOLERANCE = THREE.MathUtils.degToRad(10);

    if (angleToNegX === 0 || angleToX === 0) {
      gl.domElement.style.cursor = "crosshair";
    }

    setHover(Math.floor(e.faceIndex / 2));
  }, []);
  const onOut = useCallback(() => {
    gl.domElement.style.cursor = "default";
  }, []);

  // const onFaceClick = useCallback(
  //   (e) => {
  //     e.stopPropagation();
  //     const mesh = meshRef.current;
  //     if (!mesh) return;

  //     mesh.updateMatrixWorld(true);

  //     // 1. Face normal in world space
  //     const faceNormal = e.face.normal
  //       .clone()
  //       .transformDirection(mesh.matrixWorld)
  //       .normalize();

  //     // 2. Mesh local +X in world space
  //     const worldLocalX = new THREE.Vector3(1, 0, 0)
  //       .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
  //       .normalize();

  //     // 3. Compare face normal with ±X
  //     const angleToX = faceNormal.angleTo(worldLocalX);
  //     const angleToNegX = faceNormal.angleTo(worldLocalX.clone().negate());
  //     const ANGLE_TOLERANCE = THREE.MathUtils.degToRad(10);

  //     if (angleToX > ANGLE_TOLERANCE && angleToNegX > ANGLE_TOLERANCE) {
  //       console.log("❌ Not aligned with local ±X");
  //       return;
  //     }

  //     // 4. Get bounding box of geometry
  //     const geometry = mesh.geometry;
  //     geometry.computeBoundingBox();
  //     const bbox = geometry.boundingBox;

  //     // 5. Click point in world space
  //     const clickPoint = e.point.clone();

  //     // 6. Get all 8 corners of the bounding box (local)
  //     const corners = [
  //       new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
  //       new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
  //       new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
  //       new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.max.z),
  //       new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
  //       new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.max.z),
  //       new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
  //       new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
  //     ];

  //     // 7. Transform each corner to world direction (rotation only)
  //     const meshQuat = mesh.getWorldQuaternion(new THREE.Quaternion());
  //     const rotatedCorners = corners.map((c) =>
  //       c.clone().applyQuaternion(meshQuat)
  //     );

  //     // 8. Choose the best corner (most aligned with face normal)
  //     let bestCorner = null;
  //     let maxDot = -Infinity;
  //     rotatedCorners.forEach((rotated, i) => {
  //       const dot = faceNormal.dot(rotated.clone().normalize());
  //       if (dot > maxDot) {
  //         maxDot = dot;
  //         bestCorner = corners[i]; // still in local space
  //       }
  //     });

  //     // 9. Final position: clickPoint - rotated best corner
  //     const rotatedBestCorner = bestCorner.clone().applyQuaternion(meshQuat);
  //     const spawnPos = clickPoint.clone().sub(rotatedBestCorner);

  //     console.log("📦 BBox.min (local)", bbox.min);
  //     console.log("🌀 Best corner (rotated)", rotatedBestCorner);
  //     console.log("📍 Click point", clickPoint);
  //     console.log("📦 Final spawn position", spawnPos);

  //     const size = new THREE.Vector3();
  //     bbox.getSize(size);
  //     const center = new THREE.Vector3();
  //     bbox.getCenter(center);
  //     const worldCenter = center.clone().applyMatrix4(mesh.matrixWorld);

  //     const scale = [0.001, 0.001, 0.001];

  //     setPendingAttach({
  //       worldCenter: spawnPos,
  //       size,
  //       currShape: shape,
  //       negativeX: angleToNegX < ANGLE_TOLERANCE,
  //       scale,
  //     });
  //   },
  //   [geom, shape]
  // );

  // const onFaceClick = useCallback(
  //   (e) => {
  //     e.stopPropagation();
  //     const mesh = meshRef.current;
  //     if (!mesh) return;

  //     mesh.updateMatrixWorld(true);

  //     // 1. Face normal in world space
  //     const faceNormal = e.face.normal
  //       .clone()
  //       .transformDirection(mesh.matrixWorld)
  //       .normalize();

  //     // 2. Mesh's local +X direction in world space
  //     const worldLocalX = new THREE.Vector3(1, 0, 0)
  //       .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
  //       .normalize();

  //     // 3. Compare face normal to local +X and -X
  //     const angleToX = faceNormal.angleTo(worldLocalX);
  //     const angleToNegX = faceNormal.angleTo(worldLocalX.clone().negate());
  //     const ANGLE_TOLERANCE = THREE.MathUtils.degToRad(10);

  //     if (angleToX > ANGLE_TOLERANCE && angleToNegX > ANGLE_TOLERANCE) {
  //       console.log("❌ Not aligned with local ±X");
  //       return;
  //     }

  //     console.log("angleToX", angleToX);
  //     console.log("angleToNegX", angleToNegX);
  //     console.log("ANGLE_TOLERANCE", ANGLE_TOLERANCE);

  //     // 4. Compute spawn position slightly outside the face
  //     const clickPoint = e.point.clone();
  //     const offset = 0.001;
  //     const spawnPos = clickPoint.add(
  //       faceNormal.clone().multiplyScalar(offset)
  //     );

  //     // 5. Add model
  //     const size = new THREE.Vector3();
  //     mesh.geometry.computeBoundingBox();
  //     mesh.geometry.boundingBox.getSize(size);
  //     const center = new THREE.Vector3();
  //     mesh.geometry.boundingBox.getCenter(center);
  //     const worldCenter = center.clone().applyMatrix4(mesh.matrixWorld);
  //     console.log("worldcenter", worldCenter);
  //     console.log(size);
  //     const newCenter = new THREE.Vector3(
  //       center.x - size.x * 0.001,
  //       center.y,
  //       center.z + size.z * 0.001 - 0.01
  //     );
  //     console.log("newCenter", newCenter);

  //     // worldCenter.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  //     newCenter.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);

  //     // console.log("rot world center", worldCenter);
  //     console.log("rot new center", newCenter);

  //     if (angleToNegX === 0) {
  //       // setPendingAttach({
  //       //   worldCenter: worldCenter,
  //       //   size: size,
  //       //   currShape: shape,
  //       //   negativeX: true,
  //       //   scale: [0.001, 0.001, 0.001]
  //       // });
  //       useSTLStore
  //         .getState()
  //         .addModel(
  //           worldCenter.x - size.x,
  //           worldCenter.y,
  //           worldCenter.z + size.z * (2 / 3) + 0.03,
  //           geom,
  //           "Z"
  //         );
  //     }

  //     if (angleToX === 0) {
  //       // setPendingAttach({
  //       //   worldCenter: worldCenter,
  //       //   size: size,
  //       //   currShape: shape,
  //       //   negativeX: false,
  //       //   scale: [0.001, 0.001, 0.001]
  //       // });
  //       useSTLStore
  //         .getState()
  //         .addModel(
  //           worldCenter.x + size.x,
  //           worldCenter.y,
  //           worldCenter.z - size.z * (2 / 3) - 0.03,
  //           geom,
  //           "Z"
  //         );
  //     }
  //   },
  //   [geom]
  // );

  // const onFaceClick = useCallback(
  //   (e) => {
  //     e.stopPropagation();

  //     const mesh = meshRef.current;
  //     if (!mesh) return;

  //     // Get the clicked face's world normal
  //     const faceNormal = e.face.normal
  //       .clone()
  //       .transformDirection(mesh.matrixWorld) // converts to world space
  //       .normalize();

  //     // Get the intersection point in world space
  //     const clickPoint = e.point.clone();

  //     // Offset slightly in the direction of the face
  //     const OFFSET = 0.001;
  //     const spawnPos = clickPoint
  //       .clone()
  //       .add(faceNormal.clone().multiplyScalar(OFFSET));

  //     useSTLStore.getState().addModel(spawnPos.x, spawnPos.y, spawnPos.z, geom);
  //   },
  //   [geom]
  // );

  // const onFaceClick = useCallback(
  //   (e) => {
  //     e.stopPropagation();
  //     const mesh = meshRef.current;
  //     if (!mesh) return;

  //     mesh.updateMatrixWorld(true);

  //     const size = new Vector3();
  //     mesh.geometry.computeBoundingBox();
  //     mesh.geometry.boundingBox.getSize(size);

  //     const faceNormal = e.face.normal
  //       .clone()
  //       .transformDirection(mesh.matrixWorld)
  //       .normalize();
  //     const clickPoint = e.point.clone();

  //     const normal = faceNormal.clone().normalize(); // face normal
  //     const offsetDistance = Math.max(size.x, size.y, size.z); // for example, 10 units away from the face

  //     // Calculate center of the face (if not already done)
  //     const pos = geom.attributes.position;
  //     const a = new Vector3().fromBufferAttribute(pos, e.face.a);
  //     const b = new Vector3().fromBufferAttribute(pos, e.face.b);
  //     const c = new Vector3().fromBufferAttribute(pos, e.face.c);
  //     const faceCenter = new Vector3().add(a).add(b).add(c).divideScalar(3);

  //     // Offset point along the normal
  //     const offsetOrigin = faceCenter
  //       .clone()
  //       .add(normal.multiplyScalar(offsetDistance));

  //     // Build drag plane
  //     const dragPlane = new Plane().setFromNormalAndCoplanarPoint(
  //       faceNormal.clone(),
  //       offsetOrigin.clone()
  //     );

  //     // Get tangent axes on plane
  //     let tempUp = new Vector3(0, 1, 0);
  //     if (Math.abs(faceNormal.dot(tempUp)) > 0.9) {
  //       tempUp = new Vector3(1, 0, 0);
  //     }
  //     const u = new Vector3().crossVectors(tempUp, faceNormal).normalize();
  //     const v = new Vector3().crossVectors(faceNormal, u).normalize();

  //     // Get model size

  //     // Setup snapping ghost
  //     useSTLStore.getState().setSnapModel({
  //       geom,
  //       shape: "Z",
  //       faceNormal,
  //       basePoint: clickPoint.clone(),
  //       dragPlane,
  //       u,
  //       v,
  //       size,
  //     });
  //   },
  //   [geom]
  // );

  const onFaceClick = useCallback(
    (e) => {
      e.stopPropagation();
      const mesh = meshRef.current;
      if (!mesh) return;

      mesh.updateMatrixWorld(true);

      const geom = mesh.geometry;
      const pos = geom.attributes.position;
      const bbox = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();

      bbox.getCenter(center);
      bbox.getSize(size);

      const faceNormal = e.face.normal
        .clone()
        .transformDirection(mesh.matrixWorld)
        .normalize();

      console.log("Mesh Rotation:", mesh.rotation);
      console.log("Face Normal (local):", e.face.normal);
      console.log("Face Normal (world):", faceNormal);

      const faceCenterWorld = getWorldFaceCenterFromBoundingBox(
        mesh,
        faceNormal
      );

      // Check direction of click relative to normal
      const rayDir = e.ray.direction.clone().normalize();
      const dot = faceNormal.dot(rayDir);

      // If dot > 0, normal points away from camera — flip it
      const offsetDir =
        dot > 0 ? faceNormal.clone().negate() : faceNormal.clone();

      //scene.add(new THREE.PlaneHelper(dragPlane, 5, 0xff0000));

      // Get u, v tangent vectors
      let tempUp = new Vector3(0, 1, 0);
      if (Math.abs(faceNormal.dot(tempUp)) > 0.9) {
        tempUp = new Vector3(1, 0, 0);
      }
      const u = new Vector3().crossVectors(tempUp, faceNormal).normalize();
      const v = new Vector3().crossVectors(faceNormal, u).normalize();

      const uLimit = size.length() / 3; // or more precise method
      const vLimit = size.length() / 1000;

      // // 1. Face center - red sphere
      // const faceCenterHelper = new THREE.Mesh(
      //   new THREE.SphereGeometry(0.01), // adjust radius as needed
      //   new THREE.MeshBasicMaterial({ color: "red" })
      // );
      // faceCenterHelper.position.copy(faceCenterWorld);
      // scene.add(faceCenterHelper);

      // // 2. Face normal - green arrow
      // const normalArrow = new THREE.ArrowHelper(
      //   faceNormal, // direction
      //   faceCenterWorld, // origin
      //   offsetDistance, // length
      //   0x00ff00 // color
      // );
      // scene.add(normalArrow);

      // // 3. Offset origin - blue sphere
      // const offsetHelper = new THREE.Mesh(
      //   new THREE.SphereGeometry(0.01),
      //   new THREE.MeshBasicMaterial({ color: "blue" })
      // );
      // offsetHelper.position.copy(offsetOrigin);
      // scene.add(offsetHelper);

      // Set snap model
      useSTLStore.getState().setPendingAttach({
        shape: "Z",
        faceNormal,
        //basePoint: offsetOrigin.clone(),
        //dragPlane,
        u,
        v,
        size,
        uLimit,
        vLimit,
        rotation: mesh.rotation.clone(),
        faceCenterWorld,
        offsetDir,
      });
      // useSTLStore.getState().setSnapModel({
      //   geom,
      //   shape: "Z",
      //   faceNormal,
      //   basePoint: offsetOrigin.clone(),
      //   dragPlane,
      //   u,
      //   v,
      //   size,
      //   uLimit,
      //   vLimit,
      //   rotation: mesh.rotation.clone(),
      // });
    },
    [geom]
  );

  const plusPos = useMemo(() => {
    if (hover === null || !size || !center) return null;
    const n = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ][hover];
    return [
      center.x + n[0] * (size.x / 2 + 0.05),
      center.y + n[1] * (size.y / 2 + 0.05),
      center.z + n[2] * (size.z / 2 + 0.05),
    ];
  }, [hover, size, center]);

  const onRightClick = (event) => {
    event.stopPropagation();
    //event.preventDefault();
    useSTLStore.getState().removeModel(id);
  };

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geom}
        //scale={[0.001, 0.001, 0.001]}
        position={position}
        rotation={rotation} // ✅ Apply rotation here
      >
        <meshStandardMaterial color="hotpink" side={THREE.DoubleSide} />
      </mesh>

      {pickBox && center && (
        <mesh
          geometry={pickBox}
          position={center}
          onPointerMove={onMove}
          onPointerOut={onOut}
          rotation={rotation}
          onClick={onFaceClick}
          onContextMenu={onRightClick}
        >
          {[...Array(6)].map((_, i) => (
            <meshStandardMaterial key={i} wireframe opacity={1} />
          ))}
        </mesh>
      )}
      <ModelChooser />
    </>
  );
}

/* ---------------- drag ghost ----------------------- */
export function Cursor() {
  const meshRef = useRef();
  const { camera, gl } = useThree();
  const mouse = useRef(new THREE.Vector2());
  const ray = useMemo(() => new Raycaster(), []);
  const plane = useMemo(() => new Plane(new Vector3(0, 0, 1), 0), []);

  const dragging = useSTLStore((s) => s.draggedModel);
  const addModel = useSTLStore((s) => s.addModel);
  const finishDrag = useSTLStore((s) => s.finishDrag);
  const [hit, setHit] = useState(null);

  const [ghostRotation, setGhostRotation] = useState(
    meshRef.current?.rotation
      ? meshRef.current.rotation.clone()
      : new THREE.Euler()
  );

  // function snapTo90Radians(angle) {
  //   const step = Math.PI / 2; // 90 degrees
  //   return Math.round(angle / step) * step;
  // }

  // useEffect(() => {
  //   if (meshRef?.rotation) {
  //     setGhostRotation(snap.rotation.clone());
  //   }
  // }, [dragging]);

  // useEffect(() => {
  //   const handleKeyDown = (e) => {
  //     if (!dragging) return;

  //     const current = ghostRotation.clone();

  //     switch (e.key.toLowerCase()) {
  //       case "r":
  //         current.y += Math.PI / 2;
  //         break;
  //       case "x":
  //         current.x += Math.PI / 2;
  //         break;
  //       case "z":
  //         current.z += Math.PI / 2;
  //         break;
  //       default:
  //         return;
  //     }

  //     // ✅ Snap each axis to nearest 90°
  //     current.x = snapTo90Radians(current.x);
  //     current.y = snapTo90Radians(current.y);
  //     current.z = snapTo90Radians(current.z);

  //     setGhostRotation(current);
  //   };

  //   window.addEventListener("keypress", handleKeyDown);
  //   return () => {
  //     window.removeEventListener("keypress", handleKeyDown);
  //   };
  // }, [ghostRotation, dragging]);

  const move = useCallback(
    (e) => {
      const { left, top, width, height } =
        gl.domElement.getBoundingClientRect();
      mouse.current.set(
        ((e.clientX - left) / width) * 2 - 1,
        -((e.clientY - top) / height) * 2 + 1
      );
      ray.setFromCamera(mouse.current, camera);
      const p = new Vector3();
      ray.ray.intersectPlane(plane, p);
      setHit(p);
    },
    [camera, gl]
  );

  const click = useCallback(() => {
    if (!dragging || !hit) return;
    addModel(hit.x, hit.y, hit.z, dragging.geometry, dragging.shape, [0,0,0]);
    finishDrag();
  }, [dragging, hit]);

  useEffect(() => {
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", click);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", click);
    };
  }, [move, click]);

  return dragging && hit ? (
    <mesh
      position={hit}
      pointerEvents={false}
      ref={meshRef}
      rotation={ghostRotation}
    >
      <primitive object={dragging.geometry} />
      <meshStandardMaterial transparent opacity={0.6} color="cyan" />
    </mesh>
  ) : null;
}

// export  function SnappingCursor() {
//   const { camera, gl } = useThree();
//   const snap = useSTLStore((s) => s.snapModel);
//   const addModel = useSTLStore((s) => s.addModel);
//   const clearSnap = useSTLStore((s) => s.clearSnapModel);
//   const ray = useMemo(() => new Raycaster(), []);
//   const [ghostPos, setGhostPos] = useState(null);
//   const [modelHeight, setModelHeight] = useState(0);
//   const [faceCenter, setFaceCenter] = useState(null);

//   useEffect(() => {
//     if (!snap) return;

//     // --- Compute model height in faceNormal direction ---
//     const boundingBox = new Box3().setFromBufferAttribute(
//       snap.geom.attributes.position
//     );
//     const size = new Vector3();
//     boundingBox.getSize(size);
//     const normalAbs = new Vector3(
//       Math.abs(snap.faceNormal.x),
//       Math.abs(snap.faceNormal.y),
//       Math.abs(snap.faceNormal.z)
//     );
//     const height = size.dot(normalAbs) / 2;
//     setModelHeight(height);

//     // --- Compute face center from face vertices (a, b, c) ---
//     const pos = snap.geom.attributes.position;
//     const a = new Vector3().fromBufferAttribute(pos, snap.a);
//     const b = new Vector3().fromBufferAttribute(pos, snap.b);
//     const c = new Vector3().fromBufferAttribute(pos, snap.c);
//     const center = new Vector3().add(a).add(b).add(c).divideScalar(3);
//     setFaceCenter(center);

//     const onMove = (e) => {
//       if (!faceCenter) return;

//       const { left, top, width, height } = gl.domElement.getBoundingClientRect();
//       const mouse = new Vector2(
//         ((e.clientX - left) / width) * 2 - 1,
//         -((e.clientY - top) / height) * 2 + 1
//       );

//       ray.setFromCamera(mouse, camera);

//       const dragDirection = snap.u.clone().normalize(); // direction of line slide
//       const projectedPoint = new Vector3();
//       ray.ray.closestPointToPoint(faceCenter, projectedPoint);

//       const delta = projectedPoint.clone().sub(faceCenter);
//       let uAmount = delta.dot(dragDirection);

//       // Clamp within u bounds
//       uAmount = Math.max(snap.uMin, Math.min(snap.uMax, uAmount));

//       const constrained = faceCenter
//         .clone()
//         .add(dragDirection.multiplyScalar(uAmount))
//         .add(snap.faceNormal.clone().multiplyScalar(modelHeight));

//       setGhostPos(constrained);
//     };

//     const onClick = () => {
//       if (!ghostPos || !snap) return;
//       const finalPos = ghostPos
//         .clone()
//         .add(snap.faceNormal.clone().multiplyScalar(modelHeight));
//       addModel(finalPos.x, finalPos.y, finalPos.z, snap.geom, snap.shape);
//       clearSnap();
//     };

//     window.addEventListener("pointermove", onMove);
//     window.addEventListener("click", onClick);
//     return () => {
//       window.removeEventListener("pointermove", onMove);
//       window.removeEventListener("click", onClick);
//     };
//   }, [snap, camera, gl, ghostPos, ray, addModel, clearSnap, modelHeight, faceCenter]);

//   if (!snap || !ghostPos) return null;

//   return (
//     <mesh position={ghostPos}>
//       <primitive object={snap.geom} />
//       <meshStandardMaterial transparent opacity={0.5} color="cyan" />
//     </mesh>
//   );
// }

// export function SnappingCursor() {
//   const { camera, gl } = useThree();
//   const snap = useSTLStore((s) => s.snapModel);
//   const addModel = useSTLStore((s) => s.addModel);
//   const clearSnap = useSTLStore((s) => s.clearSnapModel);
//   const mouse = useRef(new THREE.Vector2());
//   const ray = useMemo(() => new THREE.Raycaster(), []);

//   const [ghostPos, setGhostPos] = useState(null);

//   useEffect(() => {
//     const onMove = (e) => {
//       const { left, top, width, height } =
//         gl.domElement.getBoundingClientRect();
//       mouse.current.set(
//         ((e.clientX - left) / width) * 2 - 1,
//         -((e.clientY - top) / height) * 2 + 1
//       );
//     };

//     const onClick = () => {
//       if (!ghostPos || !snap || !isFinite(ghostPos.x)) return;
//       addModel(ghostPos.x, ghostPos.y, ghostPos.z, snap.geom, snap.shape);
//       clearSnap();
//     };

//     window.addEventListener("pointermove", onMove);
//     window.addEventListener("click", onClick);
//     return () => {
//       window.removeEventListener("pointermove", onMove);
//       window.removeEventListener("click", onClick);
//     };
//   }, [ghostPos, snap]);

//   useFrame(() => {
//     if (!snap || !snap.dragLine) return;

//     ray.setFromCamera(mouse.current, camera);
//     const { origin, direction } = snap.dragLine;

//     if (!direction || direction.lengthSq() === 0) return;

//     const rayDir = ray.ray.direction.clone().normalize();
//     const v1 = ray.ray.origin.clone().sub(origin);
//     const cross = new THREE.Vector3().crossVectors(rayDir, direction);
//     const denom = cross.lengthSq();

//     if (denom === 0) return;

//     const t =
//       new THREE.Vector3().crossVectors(v1, direction).dot(cross) / denom;
//     const pointOnLine = ray.ray.origin.clone().add(rayDir.multiplyScalar(t));

//     setGhostPos(pointOnLine);
//   });

//   if (!snap || !ghostPos) return null;

//   return (
//     <mesh position={ghostPos} key="ghost-model">
//       <primitive object={snap.geom.clone()} />
//       <meshStandardMaterial transparent opacity={0.5} color="cyan" />
//     </mesh>
//   );
// }

/**
 * Get the world-space center of the bounding box face that best aligns with the given world-space face normal.
 */
function getWorldFaceCenterFromBoundingBox(mesh, faceNormalWorld) {
  // Local bounding box
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox.clone();

  // Box center and size in local space
  const center = new Vector3();
  bbox.getCenter(center);

  const size = new Vector3();
  bbox.getSize(size);

  // Face direction options in local space
  const directions = [
    new Vector3(1, 0, 0),
    new Vector3(-1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(0, -1, 0),
    new Vector3(0, 0, 1),
    new Vector3(0, 0, -1),
  ];

  // Transform directions to world space
  const worldMatrix = mesh.matrixWorld;
  let bestDir = new Vector3();
  let bestDot = -Infinity;

  for (const dir of directions) {
    const worldDir = dir.clone().transformDirection(worldMatrix);
    const dot = faceNormalWorld.dot(worldDir);
    if (dot > bestDot) {
      bestDot = dot;
      bestDir.copy(dir); // keep local-space direction
    }
  }

  // Move from center to face center in local space
  const localFaceCenter = center
    .clone()
    .add(bestDir.multiply(size).multiplyScalar(0.5));

  // Convert to world space
  const worldFaceCenter = localFaceCenter.clone().applyMatrix4(worldMatrix);
  return worldFaceCenter;
}

function getBoundingBoxFaceNormal(mesh, point) {
  mesh.geometry.computeBoundingBox();
  const bbox = mesh.geometry.boundingBox.clone();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bbox.getCenter(center);
  bbox.getSize(size);

  const delta = new THREE.Vector3().subVectors(point, center);
  const absDelta = new THREE.Vector3(
    Math.abs(delta.x),
    Math.abs(delta.y),
    Math.abs(delta.z)
  );

  const normal = new THREE.Vector3();
  if (absDelta.x >= absDelta.y && absDelta.x >= absDelta.z) {
    normal.set(Math.sign(delta.x), 0, 0);
  } else if (absDelta.y >= absDelta.x && absDelta.y >= absDelta.z) {
    normal.set(0, Math.sign(delta.y), 0);
  } else {
    normal.set(0, 0, Math.sign(delta.z));
  }

  // Optional: transform to world space
  normal.transformDirection(mesh.matrixWorld).normalize();
  return normal;
}
