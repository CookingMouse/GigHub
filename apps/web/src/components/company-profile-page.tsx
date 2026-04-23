"use client";

import Link from "next/link";
import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

export const CompanyProfilePage = () => {
  const session = useProtectedUser("company");
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof profileApi.getCompanyProfile>>["profile"] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status !== "ready") {
      return;
    }

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

  if (session.status !== "ready") {
    return null;
  }

  const save = () => {
    if (!profile) {
      return;
    }

    setSaving(true);
    setError(null);
    startTransition(async () => {
      try {
        const updated = await profileApi.updateCompanyProfile({
          companyName: profile.companyName,
          website: profile.website ?? "",
          industry: profile.industry ?? "",
          about: profile.about ?? ""
        });
        setProfile(updated.profile);
      } catch (saveError) {
        setError(saveError instanceof ApiRequestError ? saveError.message : "Unable to save profile.");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <WorkspaceLayout
      title="Profile"
      subtitle="Manage company details and posted jobs."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}
      {profile ? (
        <div className="workspace-grid">
          <section className="inline-panel">
            <label className="field">
              <span>Company name</span>
              <input
                onChange={(event) => setProfile({ ...profile, companyName: event.target.value })}
                value={profile.companyName}
              />
            </label>
            <label className="field">
              <span>Website</span>
              <input
                onChange={(event) => setProfile({ ...profile, website: event.target.value })}
                value={profile.website ?? ""}
              />
            </label>
            <label className="field">
              <span>Industry</span>
              <input
                onChange={(event) => setProfile({ ...profile, industry: event.target.value })}
                value={profile.industry ?? ""}
              />
            </label>
            <label className="field">
              <span>About</span>
              <textarea
                onChange={(event) => setProfile({ ...profile, about: event.target.value })}
                value={profile.about ?? ""}
              />
            </label>
            <button className="button-primary" disabled={saving} onClick={save} type="button">
              {saving ? "Saving..." : "Save profile"}
            </button>
          </section>

          <section className="inline-panel">
            <p className="eyebrow">Posted jobs</p>
            <h2>History</h2>
            <div className="card-stack">
              {profile.postedJobs.map((job) => (
                <article className="status-panel" key={job.id}>
                  <strong>{job.title}</strong>
                  <p>Status: {job.status}</p>
                  <Link className="button-secondary" href={`/jobs/${job.id}`}>
                    Open
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <p className="muted">Loading profile...</p>
      )}
    </WorkspaceLayout>
  );
};
