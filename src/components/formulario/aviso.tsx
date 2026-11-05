import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Mensagem geral de formulário (erro ou sucesso), anunciada a leitores de tela. */
export function Aviso({ tipo, children }: { tipo: "erro" | "sucesso"; children: ReactNode }) {
  return (
    <Alert variant={tipo === "erro" ? "destructive" : "default"} role={tipo === "erro" ? "alert" : "status"}>
      {tipo === "erro" ? <CircleAlert aria-hidden /> : <CircleCheck aria-hidden />}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
