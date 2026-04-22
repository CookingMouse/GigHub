"use client";

import type { AppRole, PublicUser } from "@gighub/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiRequestError, restoreSessionUser } from "@/lib/api";

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: PublicUser };

const getRedirectTarget = (user: PublicUser | null, requiredRole?: AppRole) => {
  if (!user) {
    return "/login";
  }

  if (requiredRole && user.role !== requiredRole) {
    return user.role === "admin" ? "/admin" : "/dashboard";
  }

  return null;
};

export const useProtectedUser = (requiredRole?: AppRole) => {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const user = await restoreSessionUser();

        if (!isMounted) {
          return;
        }

        const redirectTarget = getRedirectTarget(user, requiredRole);

        if (redirectTarget) {
          router.replace(redirectTarget);
          return;
        }

        setState({
          status: "ready",
          user
        });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          router.replace("/login");
          return;
        }

        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          message: "Unable to load the current session."
        });
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, [requiredRole, router]);

  return state;
};
