"use client";

import React, { startTransition, useEffect, useState } from "react";
import { ApiRequestError, healthApi, profileApi } from "@/lib/api";
import { useProtectedUser } from "@/hooks/use-protected-user";
import { WorkspaceLayout } from "./workspace-layout";

type ProfileState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; profile: Awaited<ReturnType<typeof profileApi.getFreelancerProfile>>["profile"] };

export const FreelancerProfilePage = () => {
  const session = useProtectedUser("freelancer");
  const [state, setState] = useState<ProfileState>({ status: "loading" });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      const routeStatus = await healthApi.routes();

      if (!routeStatus.routes.profile) {
        setState({
          status: "error",
          message: "Profile routes are unavailable in the running API process. Restart API and retry."
        });
        return;
      }

      const response = await profileApi.getFreelancerProfile();
      setState({
        status: "ready",
        profile: response.profile
      });
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        setState({
          status: "error",
          message:
            "The running API process does not include the new profile routes yet. Restart API (npm run dev) and retry."
        });
        return;
      }

      setState({
        status: "error",
        message: loadError instanceof ApiRequestError ? loadError.message : "Unable to load profile."
      });
    }
  };

  useEffect(() => {
    if (session.status === "ready") {
      void loadProfile();
    }
  }, [session.status]);

  if (session.status !== "ready") {
    return null;
  }

  const save = () => {
    if (state.status !== "ready") {
      return;
    }

    setSaving(true);
    setError(null);
    startTransition(async () => {
      try {
        const updated = await profileApi.updateFreelancerProfile({
          displayName: state.profile.displayName,
          portfolioUrl: state.profile.portfolioUrl ?? "",
          headline: state.profile.headline ?? "",
          bio: state.profile.bio ?? "",
          experienceYears: state.profile.experienceYears ?? 0,
          pastProjects: state.profile.pastProjects,
          skills: state.profile.skills
        });

        let nextProfile = updated.profile;

        if (resumeFile) {
          const resumeUpdated = await profileApi.uploadFreelancerResume(resumeFile);
          nextProfile = resumeUpdated.profile;
          setResumeFile(null);
        }

        setState({
          status: "ready",
          profile: nextProfile
        });
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
      subtitle="Manage personal details, experience, resume, and income statement readiness."
      user={session.user}
    >
      {error ? <p className="form-error">{error}</p> : null}

      {state.status === "loading" ? <p className="muted">Loading profile...</p> : null}

      {state.status === "error" ? (
        <section className="inline-panel">
          <h2>Profile unavailable</h2>
          <p className="form-error">{state.message}</p>
          <button className="button-secondary" onClick={() => void loadProfile()} type="button">
            Retry
          </button>
        </section>
      ) : null}

      {state.status === "ready" ? (
        <section className="inline-panel">
          <div className="job-form-grid">
            <label className="field">
              <span>Display name</span>
              <input
                onChange={(event) =>
                  setState({
                    status: "ready",
                    profile: { ...state.profile, displayName: event.target.value }
                  })
                }
                value={state.profile.displayName}
              />
            </label>
            <label className="field">
              <span>Portfolio URL</span>
              <input
                onChange={(event) =>
                  setState({
                    status: "ready",
                    profile: { ...state.profile, portfolioUrl: event.target.value }
                  })
                }
                value={state.profile.portfolioUrl ?? ""}
              />
            </label>
            <label className="field">
              <span>Headline</span>
              <input
                onChange={(event) =>
                  setState({
                    status: "ready",
                    profile: { ...state.profile, headline: event.target.value }
                  })
                }
                value={state.profile.headline ?? ""}
              />
            </label>
          </div>
          <label className="field">
            <span>Bio</span>
            <textarea
              onChange={(event) =>
                setState({
                  status: "ready",
                  profile: { ...state.profile, bio: event.target.value }
                })
              }
              value={state.profile.bio ?? ""}
            />
          </label>
          <label className="field">
            <span>Past projects (one per line)</span>
            <textarea
              onChange={(event) =>
                setState({
                  status: "ready",
                  profile: {
                    ...state.profile,
                    pastProjects: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean)
                  }
                })
              }
              value={state.profile.pastProjects.join("\n")}
            />
          </label>
          <label className="field">
            <span>Resume / CV upload</span>
            <input
              accept=".pdf,.docx"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          {state.profile.resumeFileName ? (
            <p className="muted">
              Latest resume: {state.profile.resumeFileName} ({state.profile.resumeUploadedAt ?? "unknown date"})
            </p>
          ) : null}
          <button className="button-primary" disabled={saving} onClick={save} type="button">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </section>
      ) : null}
    </WorkspaceLayout>
  );
};
