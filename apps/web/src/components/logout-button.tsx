"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { startTransition, useState } from "react";
import { authApi } from "@/lib/api";

export const LogoutButton = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      className="button-secondary"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);

        startTransition(async () => {
          try {
            await authApi.logout();
          } finally {
            router.replace("/login");
            router.refresh();
            setIsPending(false);
          }
        });
      }}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
};
