"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Link do menu principal, destacado quando a página atual pertence a ele. */
export function LinkNavegacao({ href, exato = false, children }: { href: string; exato?: boolean; children: ReactNode }) {
  const caminho = usePathname();
  const ativo = exato ? caminho === href : caminho === href || caminho.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "hover:bg-muted inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
        ativo && "bg-muted text-foreground",
        !ativo && "text-muted-foreground",
      )}
    >
      {children}
    </Link>
  );
}
