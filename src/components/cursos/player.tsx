"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CircleCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { concluirAula } from "@/lib/cursos/acoes";

type Props = {
  aulaId: string;
  titulo: string;
  provedor: "youtube" | "vimeo";
  videoId: string;
  videoHash: string | null;
  exigirVideoCompleto: boolean;
  concluida: boolean;
  /** Para onde ir depois de concluir (próxima aula ou página do curso). */
  proximo: { href: string; rotulo: string };
};

/** Parte do vídeo que precisa ter sido assistida de fato (e não pulada) para a aula contar. */
const MINIMO_ASSISTIDO = 0.85;

type PlayerYouTube = {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(segundos: number, permitirBusca: boolean): void;
  destroy(): void;
};
type PlayerVimeo = {
  on(evento: string, tratador: (dados: { seconds: number; duration: number }) => void): void;
  setCurrentTime(segundos: number): Promise<number>;
  destroy(): Promise<void>;
};
declare global {
  interface Window {
    YT?: { Player: new (alvo: HTMLElement, opcoes: Record<string, unknown>) => PlayerYouTube };
    onYouTubeIframeAPIReady?: () => void;
    Vimeo?: { Player: new (alvo: HTMLElement, opcoes: Record<string, unknown>) => PlayerVimeo };
  }
}

function carregarScript(src: string): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    const existente = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existente?.dataset.carregado) return resolver();
    const script = existente ?? document.createElement("script");
    script.addEventListener("load", () => {
      script.dataset.carregado = "1";
      resolver();
    });
    script.addEventListener("error", () => rejeitar(new Error("Falha ao carregar o player.")));
    if (!existente) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

async function carregarYouTube(): Promise<void> {
  if (window.YT?.Player) return;
  await new Promise<void>((resolver, rejeitar) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolver();
    };
    carregarScript("https://www.youtube.com/iframe_api").catch(rejeitar);
  });
}

/** Posição e tempo assistido ficam no navegador, para a pessoa continuar de onde parou. */
function lerMemoria(chave: string): { posicao: number; assistido: number } {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(chave) ?? "{}");
    return { posicao: Number(salvo.posicao) || 0, assistido: Number(salvo.assistido) || 0 };
  } catch {
    return { posicao: 0, assistido: 0 };
  }
}
function gravarMemoria(chave: string, valor: { posicao: number; assistido: number } | null) {
  try {
    if (valor) window.localStorage.setItem(chave, JSON.stringify(valor));
    else window.localStorage.removeItem(chave);
  } catch {
    // Navegação privada ou armazenamento cheio: segue sem lembrar a posição.
  }
}

export function Player({ aulaId, titulo, provedor, videoId, videoHash, exigirVideoCompleto, concluida, proximo }: Props) {
  const alvo = useRef<HTMLDivElement>(null);
  const [feita, setFeita] = useState(concluida);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function concluir() {
    setSalvando(true);
    setAviso(null);
    const { ok } = await concluirAula(aulaId);
    setSalvando(false);
    if (ok) setFeita(true);
    else setAviso("Não foi possível registrar a conclusão. Confira a sua conexão e tente de novo.");
  }
  const concluirRef = useRef(concluir);
  useEffect(() => {
    concluirRef.current = concluir;
  });

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;
    const chave = `aula:${aulaId}`;
    const memoria = lerMemoria(chave);
    let ultimo = memoria.posicao;
    let cancelado = false;
    let destruir: (() => void) | undefined;
    let relogio: ReturnType<typeof setInterval> | undefined;

    // Soma só o tempo realmente assistido: saltos para a frente não contam.
    function registrar(segundos: number) {
      const avanco = segundos - ultimo;
      if (avanco > 0 && avanco <= 4) memoria.assistido += avanco;
      ultimo = segundos;
      memoria.posicao = segundos;
      gravarMemoria(chave, memoria);
    }

    function aoTerminar(duracao: number) {
      if (exigirVideoCompleto && duracao > 0 && memoria.assistido < duracao * MINIMO_ASSISTIDO) {
        setAviso("Para concluir esta aula, assista ao vídeo inteiro, sem pular partes.");
        return;
      }
      gravarMemoria(chave, null);
      void concluirRef.current();
    }

    const filho = document.createElement("div");
    elemento.replaceChildren(filho);

    (async () => {
      try {
        if (provedor === "youtube") {
          await carregarYouTube();
          if (cancelado || !window.YT) return;
          const player = new window.YT.Player(filho, {
            videoId,
            host: "https://www.youtube-nocookie.com",
            width: "100%",
            height: "100%",
            playerVars: { rel: 0, playsinline: 1, start: Math.floor(memoria.posicao) || undefined },
            events: {
              onStateChange: (evento: { data: number }) => {
                if (evento.data === 0) aoTerminar(player.getDuration());
              },
            },
          });
          relogio = setInterval(() => {
            if (typeof player.getCurrentTime === "function") registrar(player.getCurrentTime());
          }, 1000);
          destruir = () => player.destroy();
        } else {
          await carregarScript("https://player.vimeo.com/api/player.js");
          if (cancelado || !window.Vimeo) return;
          const player = new window.Vimeo.Player(filho, {
            url: `https://player.vimeo.com/video/${videoId}${videoHash ? `?h=${videoHash}` : ""}`,
            responsive: true,
          });
          if (memoria.posicao > 5) void player.setCurrentTime(memoria.posicao).catch(() => undefined);
          player.on("timeupdate", ({ seconds }) => registrar(seconds));
          player.on("ended", ({ duration }) => aoTerminar(duration));
          destruir = () => void player.destroy();
        }
      } catch {
        if (!cancelado) setAviso("Não foi possível carregar o vídeo. Confira a sua conexão e recarregue a página.");
      }
    })();

    return () => {
      cancelado = true;
      if (relogio) clearInterval(relogio);
      destruir?.();
    };
  }, [aulaId, provedor, videoId, videoHash, exigirVideoCompleto]);

  return (
    <div className="grid gap-4">
      <div
        ref={alvo}
        aria-label={`Vídeo: ${titulo}`}
        className="aspect-video w-full overflow-hidden rounded-xl bg-black [&_iframe]:size-full"
      />

      {feita ? (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-medium text-emerald-900" role="status">
            <CircleCheck className="size-5" aria-hidden />
            Aula concluída
          </p>
          <Button asChild className="h-11">
            <Link href={proximo.href}>{proximo.rotulo}</Link>
          </Button>
        </div>
      ) : exigirVideoCompleto ? (
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          A aula é marcada como concluída sozinha quando o vídeo chega ao fim. Se você sair, o vídeo continua de onde parou.
        </p>
      ) : (
        <Button type="button" className="h-11 justify-self-start" disabled={salvando} onClick={concluir}>
          {salvando ? "Salvando…" : "Marcar aula como concluída"}
        </Button>
      )}
      {aviso ? (
        <p className="text-destructive text-sm" role="alert">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
