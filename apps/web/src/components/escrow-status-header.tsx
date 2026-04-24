"use client";

import type { EscrowRecord } from "@gighub/shared";
import React from "react";

type EscrowStatusHeaderProps = {
  escrow: EscrowRecord | null;
  budget: number;
  role: "company" | "freelancer";
};

/**
 * Fintech-inspired Escrow Monitor Card
 * Specifications: DM Sans/Mono, Specific hex palette, 2xl rounded corners
 */
export const EscrowStatusHeader = ({ escrow, budget }: EscrowStatusHeaderProps) => {
  const status = escrow?.status ?? "UNFUNDED";
  const fundedAmount = escrow?.fundedAmount ?? 0;
  const releasedAmount = escrow?.releasedAmount ?? 0;
  const remainingAmount = fundedAmount - releasedAmount;
  
  const progressPercent = fundedAmount > 0 ? (releasedAmount / fundedAmount) * 100 : 0;
  const isFullyReleased = status === "FULLY_RELEASED";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace("MYR", "RM");

  // Use the system default font (DM Sans) for all text including numbers
  const sansFont = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <section 
      style={{ 
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "16px", // 2xl approximation
        padding: "24px",
        marginBottom: "32px",
        fontFamily: sansFont,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)"
      }}
    >
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
          Escrow Monitor
        </h3>
        <div style={{
          backgroundColor: isFullyReleased ? "#E1F5EE" : "#EFF6FF",
          color: isFullyReleased ? "#0F6E56" : "#1D4ED8",
          fontSize: "10px",
          fontWeight: 800,
          padding: "4px 10px",
          borderRadius: "99px",
          letterSpacing: "0.5px"
        }}>
          {isFullyReleased ? "FULLY_RELEASED" : "ACTIVE_ESCROW"}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Total Funded */}
        <div>
          <p style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#9CA3AF", 
            textTransform: "uppercase", 
            letterSpacing: "1px",
            margin: "0 0 4px 0"
          }}>
            Total Funded
          </p>
          <strong style={{ 
            fontSize: "20px", 
            fontWeight: 700, 
            color: "#1D4ED8" 
          }}>
            {formatCurrency(fundedAmount)}
          </strong>
        </div>

        {/* Locked (Remaining) */}
        <div>
          <p style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#9CA3AF", 
            textTransform: "uppercase", 
            letterSpacing: "1px",
            margin: "0 0 4px 0"
          }}>
            Locked (Remaining)
          </p>
          <strong style={{ 
            fontSize: "20px", 
            fontWeight: 700, 
            color: "#B45309" 
          }}>
            {formatCurrency(remainingAmount)}
          </strong>
        </div>

        {/* Total Released */}
        <div>
          <p style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#9CA3AF", 
            textTransform: "uppercase", 
            letterSpacing: "1px",
            margin: "0 0 4px 0"
          }}>
            Total Released
          </p>
          <strong style={{ 
            fontSize: "20px", 
            fontWeight: 700, 
            color: "#0F6E56" 
          }}>
            {formatCurrency(releasedAmount)}
          </strong>
        </div>
      </div>

      {/* Footer Section: Progress Bar */}
      <div>
        <div style={{ 
          height: "8px", 
          backgroundColor: "#F3F4F6", 
          borderRadius: "4px", 
          overflow: "hidden",
          marginBottom: "12px"
        }}>
          <div style={{ 
            height: "100%", 
            width: `${progressPercent}%`, 
            backgroundColor: "#0F6E56",
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
          }} />
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#9CA3AF", 
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            Progress: <span style={{ color: "#4B5563" }}>{Math.round(progressPercent)}% released</span>
          </span>
          <span style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#9CA3AF", 
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            Coverage: <span style={{ color: "#4B5563" }}>100% funded</span>
          </span>
        </div>
      </div>
    </section>
  );
};
