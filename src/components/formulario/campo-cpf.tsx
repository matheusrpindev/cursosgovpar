"use client";

import { useState, type ComponentProps } from "react";
import { formatarCpf } from "@/lib/cpf";
import { Campo } from "./campo";

type Props = Omit<ComponentProps<typeof Campo>, "nome" | "rotulo" | "value" | "onChange"> & {
  nome?: string;
  rotulo?: string;
};

/** Campo de CPF com máscara (000.000.000-00) e teclado numérico no celular. */
export function CampoCpf({ nome = "cpf", rotulo = "CPF", defaultValue, ...props }: Props) {
  const [valor, setValor] = useState(formatarCpf(String(defaultValue ?? "")));
  return (
    <Campo
      nome={nome}
      rotulo={rotulo}
      inputMode="numeric"
      autoComplete="off"
      placeholder="000.000.000-00"
      maxLength={14}
      value={valor}
      onChange={(e) => setValor(formatarCpf(e.target.value))}
      {...props}
    />
  );
}
