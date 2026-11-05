"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MensagensDeErro } from "./campo";

type Props = Omit<ComponentProps<"input">, "name" | "type"> & {
  nome: string;
  rotulo: string;
  erros?: string[];
  ajuda?: string;
};

/** Campo de senha com botão para mostrar/ocultar (útil no celular). */
export function CampoSenha({ nome, rotulo, erros, ajuda, id, ...props }: Props) {
  const [visivel, setVisivel] = useState(false);
  const idCampo = id ?? `campo-${nome}`;
  const idAjuda = ajuda ? `${idCampo}-ajuda` : undefined;
  const idErro = erros?.length ? `${idCampo}-erro` : undefined;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={idCampo}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={idCampo}
          name={nome}
          type={visivel ? "text" : "password"}
          aria-invalid={erros?.length ? true : undefined}
          aria-describedby={[idAjuda, idErro].filter(Boolean).join(" ") || undefined}
          className="h-11 pr-11 text-base"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {ajuda ? (
        <p id={idAjuda} className="text-muted-foreground text-xs">
          {ajuda}
        </p>
      ) : null}
      <MensagensDeErro id={idErro} erros={erros} />
    </div>
  );
}
