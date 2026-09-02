// Panel content is rasterised through an SVG <foreignObject> image, which is
// sandboxed: it cannot fetch external stylesheets, so Google Fonts (or any
// network font) never applies inside a panel texture. The faces have to be
// inlined as data: URIs. We self-host via @fontsource and embed the latin
// woff2 files once, cached for the lifetime of the page.

import fraunces400 from "@fontsource/fraunces/files/fraunces-latin-400-normal.woff2?url"
import inter400 from "@fontsource/inter/files/inter-latin-400-normal.woff2?url"
import inter500 from "@fontsource/inter/files/inter-latin-500-normal.woff2?url"
import inter600 from "@fontsource/inter/files/inter-latin-600-normal.woff2?url"
import jetbrainsMono400 from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url"

const FACES = [
  { family: "Fraunces", weight: 400, url: fraunces400 },
  { family: "Inter", weight: 400, url: inter400 },
  { family: "Inter", weight: 500, url: inter500 },
  { family: "Inter", weight: 600, url: inter600 },
  { family: "JetBrains Mono", weight: 400, url: jetbrainsMono400 },
]

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

let cached: Promise<string> | null = null

export function getEmbeddedFontCSS(): Promise<string> {
  cached ??= Promise.all(
    FACES.map(async (face) => {
      const res = await fetch(face.url)
      const base64 = toBase64(await res.arrayBuffer())
      return (
        `@font-face{font-family:'${face.family}';font-style:normal;` +
        `font-weight:${face.weight};` +
        `src:url(data:font/woff2;base64,${base64}) format('woff2');}`
      )
    }),
  ).then((faces) => faces.join("\n"))
  return cached
}
