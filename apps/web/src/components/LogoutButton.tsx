"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        try {
          localStorage.removeItem("rb.token");
          document.cookie = "rb.token=; Path=/; Max-Age=0";
        } finally {
          router.push("/login");
        }
      }}
    >
      Log out
    </Button>
  );
}
