"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FormularioValidar({ codigoInicial = "" }: { codigoInicial?: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState(codigoInicial);
  return (
    <form
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        const limpo = codigo.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
        if (limpo) router.push(`/validar/${limpo}`);
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="codigo">Código do certificado</Label>
        <Input
          id="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ex.: AUR-1A2B3-C4D5E"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          required
          className="h-11 font-mono text-base uppercase"
        />
        <p className="text-muted-foreground text-xs">O código fica no rodapé do certificado, ao lado do QR code.</p>
      </div>
      <Button type="submit" className="h-11">
        <Search aria-hidden />
        Conferir certificado
      </Button>
    </form>
  );
}
