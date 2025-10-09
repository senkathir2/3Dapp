"use client";

import React, { useMemo } from "react";
import { useSTLStore } from "@/store/stlStore";
import meta from "@/data/assetMeta.json";

/* Build a { shapeKey → meta } map once */
const metaMap = Object.fromEntries(meta.map((m) => [m.shape, m]));

export default function Boq() {
  /* Zustand may return `undefined` before hydration—fallback to [] */
  const models = useSTLStore((s) => s.models) ?? [];

  console.log("BOQ models:", models);

  /* Derive BOQ lines */
  const rows = useMemo(() => {
    if (!Array.isArray(models) || models.length === 0) return [];

    /* count items by shape */
    const counts = models.reduce((acc, m) => {
      if (!m?.shape) return acc;
      acc[m.shape] = (acc[m.shape] || 0) + 1;
      return acc;
    }, {});

    console.log("BOQ counts:", counts);

    /* compose table rows */
    return Object.entries(counts).map(([shape, qty]) => {
      const meta = metaMap[shape] ?? {};
      const unitPrice = Number(meta.unitPrice) || 0;
      return {
        key: shape,
        label: meta.label ?? shape,
        qty,
        unitPrice,
        lineTotal: qty * unitPrice,
      };
    });
  }, [models]);

  console.log("BOQ rows:", rows);

  const grandTotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);

  console.log("BOQ grandTotal:", grandTotal);

  return (
    <div
      style={{
        bottom: 10,
        left: 10,
        padding: 12,
        borderRadius: 6,
        fontSize: 14,
        minWidth: 280,
        zIndex: 101,
        color: "white"
      }}
    >
      <strong>Bill&nbsp;of&nbsp;Quantities</strong>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 6,
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #ccc" }}>
            <th style={{ textAlign: "left" }}>Item</th>
            <th style={{ textAlign: "right" }}>Qty</th>
            <th style={{ textAlign: "right" }}>Unit ₹</th>
            <th style={{ textAlign: "right" }}>Total ₹</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td style={{ textAlign: "right" }}>{r.qty}</td>
              <td style={{ textAlign: "right" }}>{r.unitPrice.toFixed(2)}</td>
              <td style={{ textAlign: "right" }}>{r.lineTotal.toFixed(2)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: 8 }}>
                —No items placed—
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: "1px solid #ccc" }}>
            <td colSpan={3} style={{ textAlign: "right", fontWeight: 600 }}>
              Sub total ₹
            </td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              {grandTotal.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
