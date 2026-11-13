export type Video = { provedor: "youtube" | "vimeo"; id: string; hash: string | null };

const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Lê um link do YouTube ou do Vimeo e devolve o provedor e o ID do vídeo.
 * Aceita os formatos mais comuns (assistir, link curto, incorporado, shorts, ao vivo
 * e vídeo não listado do Vimeo, que tem um código extra). Devolve null se não reconhecer.
 */
export function interpretarVideo(entrada: string): Video | null {
  const texto = entrada.trim();
  if (!texto) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const partes = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return ID_YOUTUBE.test(partes[0] ?? "") ? { provedor: "youtube", id: partes[0], hash: null } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const id =
      partes[0] === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live", "v"].includes(partes[0] ?? "")
          ? partes[1]
          : null;
    return id && ID_YOUTUBE.test(id) ? { provedor: "youtube", id, hash: null } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const numeros = partes.filter((p) => /^\d{5,12}$/.test(p));
    if (numeros.length !== 1) return null;
    const id = numeros[0];
    const depois = partes[partes.indexOf(id) + 1];
    const hash = url.searchParams.get("h") ?? (depois && /^[A-Za-z0-9]{6,20}$/.test(depois) ? depois : null);
    return { provedor: "vimeo", id, hash: hash && /^[A-Za-z0-9]{1,64}$/.test(hash) ? hash : null };
  }
  return null;
}

/** Link "normal" do vídeo, para preencher o formulário de edição. */
export function linkDoVideo(video: Video): string {
  if (video.provedor === "youtube") return `https://www.youtube.com/watch?v=${video.id}`;
  return `https://vimeo.com/${video.id}${video.hash ? `/${video.hash}` : ""}`;
}

/** Miniatura do vídeo (só o YouTube tem endereço previsível). */
export function miniaturaDoVideo(video: Pick<Video, "provedor" | "id">): string | null {
  return video.provedor === "youtube" ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;
}
