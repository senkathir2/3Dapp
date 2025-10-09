import { create } from "zustand";
import client from "@/api/client";
import toast from "react-hot-toast";
import * as THREE from "three";

function parseGeometry(json) {
  if (!json) return null;
  try {
    const loader = new THREE.BufferGeometryLoader();
    return loader.parse(json);
  } catch (err) {
    console.warn("Geometry parse error:", err);
    return new THREE.BoxGeometry(1, 1, 1);
  }
}

function normalizeRotation(rot) {
  if (Array.isArray(rot)) return rot;
  if (rot && rot.isEuler) return [rot._x, rot._y, rot._z];
  return [0, 0, 0];
}

export const useSTLStore = create((set, get) => ({
  projectName: "",
  setProject: (name) => set({ projectName: name }),
  models: [],
  projects: [],
  unsavedChanges: false,
  addModel: (x, y, z, geo, shape, rotation) =>
    set((s) => ({
      unsavedChanges: true,
      models: [
        ...s.models,
        {
          id: s.models.length + 1,
          position: [x, y, z],
          geometry: geo,
          shape: shape,
          rotation,
          scale: [1, 1, 1],
          distWallNegX: 0,
          distWallPosX: 0,
          distFloor: 0,
          dimensions: {},
          created_by: "dev",
        },
      ],
    })),

  removeModel: (id) =>
    set((s) => {
      const exists = s.models.some((m) => m.id === id);
      if (!exists) {
        toast.error(`Model #${id} not found ❌`);
        return s;
      }

      const updated = s.models.filter((m) => m.id !== id);
      toast.success(`Removed model #${id} `);
      return { models: updated, unsavedChanges: true };
    }),

  markSaved: () => set({ unsavedChanges: false }),

  clearModels: () => set({ models: [], unsavedChanges: false }),

  saveAllToBackend: async () => {
    const { projectName, models } = get();

    if (!projectName) {
      toast.error("Please enter a project name before saving");
      return;
    }

    if (models.length === 0) {
      toast("No models to save!");
      return;
    }

    const savingToast = toast.loading(`Saving "${projectName}"...`);

    try {
      await client.post("/models/bulk/", {
        project: projectName,
        models,
      });
      toast.success(`Project "${projectName}" saved successfully`);
      set({ unsavedChanges: false });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save project");
    } finally {
      toast.dismiss(savingToast);
    }
  },

  fetchProjects: async () => {
    try {
      const res = await client.get("/projects/");
      set({ projects: res.data });
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch projects");
    }
  },

  loadProjectById: async (id) => {
    try {
      const res = await client.get(`/projects/${id}/`);
      const models = res.data.models.map((m) => ({
        ...m,
        geometry: parseGeometry(m.geometry),
        rotation: normalizeRotation(m.rotation),
      }));
      set({
        projectName: res.data.name,
        models: models || [],
        unsavedChanges: false,
      });
      toast.success(`Loaded project "${res.data.name}"`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project");
    }
  },

  updateModel: (id, upd) =>
    set((s) => ({
      models: s.models.map((m) => (m.id === id ? { ...m, ...upd } : m)),
    })),

  roomDimensions: { width: 10, height: 5, depth: 10 },
  setRoomDimensions: (dimensions) => set({ roomDimensions: dimensions }),

  referenceWall: null,
  setReferenceWall: (wall) => set({ referenceWall: wall }),

  selectedAssetId: null,
  setSelectedAssetId: (id) => set({ selectedAssetId: id }),

  selectedModel: null,
  setSelectedModel: (model) => set({ selectedModel: model }),

  // Drag-and-drop state
  dragging: false,
  draggedModel: null,

  startDrag: (geometry, shape) => {
    const newModel = {
      id: `temp-${Date.now()}`,
      geometry,
      shape,
      position: [0, 0, 0],
      scale: [0.01, 0.01, 0.01],
      dimensions: {},
    };
    set({ dragging: true, draggedModel: newModel });
  },

  stopDrag: () => {
    const { draggedModel } = get();
    if (!draggedModel) return;

    set((state) => ({
      dragging: false,
      draggedModel: null,
      models: [
        ...state.models,
        { ...draggedModel, id: state.models.length + 1 },
      ],
      selectedAssetId: state.models.length + 1,
    }));
  },

  updateDragPosition: (position) => {
    set((state) => {
      if (!state.draggedModel) return {};
      return {
        draggedModel: { ...state.draggedModel, position },
      };
    });
  },

  finishDrag: () => set({ dragging: false, draggedModel: null }),

  pendingAttach: null, // { pos, scale }
  setPendingAttach: (p) => set({ pendingAttach: p }),

  fileList: [],
  setFileList: (files) => set({ fileList: files }),
  snapModel: null,
  setSnapModel: (snap) => set({ snapModel: snap }),
  clearSnapModel: () => set({ snapModel: null }),
}));
