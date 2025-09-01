"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export function LogoutButton() {
    const router = useRouter();
    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={logout}
        >
            Log out
        </Button>
    );
}
