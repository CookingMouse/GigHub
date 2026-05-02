"use client";

import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";
import { FileUploadWidget } from "./file-upload-widget";
import type { UploadResponse } from "./file-upload-widget";

const companyAccent = "#1D4ED8";

export const CompanyProfilePage = () => {
  const session = useProtectedUser("company");
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof profileApi.getCompanyProfile>>["profile"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [companyDocs, setCompanyDocs] = useState<UploadResponse[]>([]);

  useEffect(() => {
    if (session.status !== "ready") return;

    const load = async () => {
      try {
        const response = await profileApi.getCompanyProfile();
        setProfile(response.profile);
      } catch (loadError) {
        setError(loadError instanceof ApiRequestError ? loadError.message : "Unable to load profile.");
      }
    };

    void load();
  }, [session.status]);

  if (session.status !== "ready") return null;

  const save = () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        const updated = await profileApi.updateCompanyProfile({
          companyName: profile.companyName,
          website: profile.website ?? "",
          industry: profile.industry ?? "",
          about: profile.about ?? ""
        });
        setProfile(updated.profile);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (saveError) {
        setError(saveError instanceof ApiRequestError ? saveError.message : "Unable to save profile.");
      } finally {
        setSaving(false);
      }
    });
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <WorkspaceLayout
      title="Company Profile"
      subtitle="Establish your professional identity to attract top talent."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p style={{ color: "#059669", background: "#ECFDF5", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px" }}>Profile updated successfully!</p> : null}
      
      {profile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* LinkedIn Style Header */}
          <section className="inline-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 120, background: `linear-gradient(90deg, ${companyAccent}, #3B82F6)` }} />
            <div style={{ padding: "0 24px 24px", marginTop: -60, position: "relative" }}>
              <div style={{ 
                width: 120, height: 120, borderRadius: 24, background: "#fff", 
                border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 40, fontWeight: 700, color: companyAccent,
                marginBottom: 16
              }}>
                {getInitials(profile.companyName)}
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.5px" }}>{profile.companyName}</h1>
                  <p style={{ margin: "4px 0", fontSize: 16, color: "#4B5563" }}>{profile.industry || "Industry not specified"}</p>
                  <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#6B7280", marginTop: 8 }}>
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ color: companyAccent, fontWeight: 500 }}>
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    <span>{profile.postedJobs.length} Job Opportunities</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <Link href={`/companies/${session.user.id}`} className="button-secondary">
                    View Public Profile
                  </Link>
                  <button className="button-primary" style={{ backgroundColor: companyAccent }} onClick={save} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="workspace-grid">
            {/* About Section */}
            <section className="inline-panel" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>About Company</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <label className="field">
                    <span>Company Legal Name</span>
                    <input
                      placeholder="e.g. Acme Corporation"
                      onChange={(event) => setProfile({ ...profile, companyName: event.target.value })}
                      value={profile.companyName}
                    />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <label className="field">
                      <span>Industry</span>
                      <input
                        placeholder="e.g. Software Development"
                        onChange={(event) => setProfile({ ...profile, industry: event.target.value })}
                        value={profile.industry ?? ""}
                      />
                    </label>
                    <label className="field">
                      <span>Website URL</span>
                      <input
                        placeholder="e.g. https://acme.com"
                        onChange={(event) => setProfile({ ...profile, website: event.target.value })}
                        value={profile.website ?? ""}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Company Overview</span>
                    <textarea
                      placeholder="Describe what your company does, its mission, and its values..."
                      style={{ minHeight: 160 }}
                      onChange={(event) => setProfile({ ...profile, about: event.target.value })}
                      value={profile.about ?? ""}
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* Company Documents (R2 Upload) */}
            <section className="inline-panel">
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, marginBottom: 16 }}>Company Documents</h2>
                <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
                  Upload certifications, credentials, or company documents to build credibility with freelancers.
                </p>
                <FileUploadWidget
                  fileType="document"
                  maxFileSize={15}
                  label="Upload Documents"
                  description="PDF, DOC, or image files up to 15MB"
                  initialFiles={companyDocs}
                  onUploadSuccess={(file) => {
                    setCompanyDocs([...companyDocs, file]);
                  }}
                  onUploadError={(error) => {
                    setError(error.message);
                  }}
                />
              </div>
            </section>

            {/* Job History Sidebar */}
            <section className="inline-panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>Active Job Openings</h2>
                <Link href="/jobs" style={{ fontSize: 13, color: companyAccent, fontWeight: 500 }}>View All</Link>
              </div>
              
              <div className="card-stack">
                {profile.postedJobs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", background: "#F9FAFB", borderRadius: 12 }}>
                    <p className="muted" style={{ fontSize: 14 }}>No jobs posted yet.</p>
                    <Link href="/jobs/new" style={{ fontSize: 13, color: companyAccent, fontWeight: 500, marginTop: 8, display: "inline-block" }}>
                      Create first job draft
                    </Link>
                  </div>
                ) : (
                  profile.postedJobs.slice(0, 5).map((job) => (
                    <article className="status-panel" key={job.id} style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: 14, display: "block" }}>{job.title}</strong>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>Status: {job.status}</span>
                        </div>
                        <Link className="button-secondary" href={`/jobs/${job.id}`} style={{ padding: "4px 12px", height: "auto", fontSize: 12 }}>
                          Manage
                        </Link>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <p className="muted">Loading profile...</p>
      )}
    </WorkspaceLayout>
  );
};
