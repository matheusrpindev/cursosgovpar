import { describe, expect, it } from "vitest";
import { interpretarVideo, linkDoVideo, miniaturaDoVideo } from "@/lib/video";

describe("interpretarVideo", () => {
  it.each([
    ["https://www.youtube.com/watch?v=jNQXAC9IVRw", "jNQXAC9IVRw"],
    ["https://youtube.com/watch?v=jNQXAC9IVRw&t=30s&list=PLabc", "jNQXAC9IVRw"],
    ["https://youtu.be/jNQXAC9IVRw?si=abc", "jNQXAC9IVRw"],
    ["https://www.youtube.com/embed/jNQXAC9IVRw", "jNQXAC9IVRw"],
    ["https://www.youtube.com/shorts/jNQXAC9IVRw", "jNQXAC9IVRw"],
    ["https://www.youtube.com/live/jNQXAC9IVRw", "jNQXAC9IVRw"],
    ["m.youtube.com/watch?v=-346f03gOEg", "-346f03gOEg"],
    ["  https://www.youtube-nocookie.com/embed/jNQXAC9IVRw  ", "jNQXAC9IVRw"],
  ])("YouTube: %s", (link, id) => {
    expect(interpretarVideo(link)).toEqual({ provedor: "youtube", id, hash: null });
  });

  it.each([
    ["https://vimeo.com/76979871", "76979871", null],
    ["https://vimeo.com/76979871/abc123def4", "76979871", "abc123def4"],
    ["https://player.vimeo.com/video/76979871?h=abc123def4", "76979871", "abc123def4"],
    ["https://vimeo.com/channels/staffpicks/76979871", "76979871", null],
  ])("Vimeo: %s", (link, id, hash) => {
    expect(interpretarVideo(link)).toEqual({ provedor: "vimeo", id, hash });
  });

  it.each([
    "",
    "não é link",
    "https://exemplo.com/watch?v=jNQXAC9IVRw",
    "https://www.youtube.com/watch?v=curto",
    "https://www.youtube.com/@canal",
    "https://vimeo.com/sobre",
    "javascript:alert(1)",
    'https://youtu.be/"><script>',
  ])("recusa: %s", (link) => {
    expect(interpretarVideo(link)).toBeNull();
  });

  it("o link gerado volta para o mesmo vídeo", () => {
    for (const link of ["https://youtu.be/jNQXAC9IVRw", "https://vimeo.com/76979871/abc123def4"]) {
      const video = interpretarVideo(link)!;
      expect(interpretarVideo(linkDoVideo(video))).toEqual(video);
    }
  });

  it("miniatura só para YouTube", () => {
    expect(miniaturaDoVideo({ provedor: "youtube", id: "jNQXAC9IVRw" })).toContain("jNQXAC9IVRw");
    expect(miniaturaDoVideo({ provedor: "vimeo", id: "76979871" })).toBeNull();
  });
});
