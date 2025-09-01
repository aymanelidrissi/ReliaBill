"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

export function LogoutButton() {
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
