import { Campo } from "@/components/formulario/campo";
import { CampoMarcar, CampoTextoLongo } from "@/components/formulario/campo-texto-longo";
import { Label } from "@/components/ui/label";

type Curso = { titulo: string; descricao: string; cargaHoraria: number; capaUrl: string | null };

/** Campos do formulário de curso (criar e editar). */
export function CamposCurso({ curso }: { curso?: Curso }) {
  return (
    <>
      <Campo nome="titulo" rotulo="Título do curso" defaultValue={curso?.titulo} maxLength={200} required />
      <CampoTextoLongo nome="descricao" rotulo="Descrição" defaultValue={curso?.descricao} rows={4} maxLength={5000} />
      <Campo
        nome="cargaHoraria"
        rotulo="Carga horária (horas)"
        defaultValue={curso ? String(curso.cargaHoraria).replace(".", ",") : ""}
        inputMode="decimal"
        ajuda="É o número que sai impresso no certificado. Ex.: 8 ou 1,5."
        className="max-w-40"
        required
      />
      <div className="grid gap-1.5">
        <Label htmlFor="campo-capa">Imagem de capa (opcional)</Label>
        {curso?.capaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa vem do Storage da instalação
          <img src={curso.capaUrl} alt="Capa atual" className="aspect-video w-56 rounded-lg border object-cover" />
        ) : null}
        <input id="campo-capa" name="capa" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
        <p className="text-muted-foreground text-xs">
          PNG, JPG ou WebP, até 4 MB. Sem capa, o curso usa a miniatura do primeiro vídeo.
        </p>
        {curso?.capaUrl ? <CampoMarcar nome="removerCapa" rotulo="Remover a capa atual" /> : null}
      </div>
    </>
  );
}
