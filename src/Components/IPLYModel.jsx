"use client";

import { Html } from "@react-three/drei";
import { Box3, Vector3, Plane, Raycaster } from "three";
import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useSTLStore } from "@/store/stlStore";
import ModelChooser from "./ModelChooser";

export default function IModel({
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
    const worldLocalY = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();

    // 3. Compare face normal to local +X and -X
    const angleToY = faceNormal.angleTo(worldLocalY);
    const angleToNegY = faceNormal.angleTo(worldLocalY.clone().negate());
    const ANGLE_TOLERANCE = THREE.MathUtils.degToRad(10);

    if (angleToNegY === 0 || angleToY === 0) {
      gl.domElement.style.cursor = "crosshair";
    }

    setHover(Math.floor(e.faceIndex / 2));
  }, []);
  const onOut = useCallback(() => {
    gl.domElement.style.cursor = "default";
  }, []);

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
        shape: "I",
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
