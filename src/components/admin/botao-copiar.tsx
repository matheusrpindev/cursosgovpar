"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoCopiar({ texto, rotulo = "Copiar link" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2500);
      }}
    >
      {copiado ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copiado ? "Copiado" : rotulo}
    </Button>
  );
}
