import { getAvailableFonts } from "@remotion/google-fonts";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import type { FontConfig } from "../../types";

export function useDynamicFont(font?: FontConfig): string {
  const [fontFamily, setFontFamily] = useState<string>(
    font?.family ?? "sans-serif",
  );

  useEffect(() => {
    if (!font) return;

    const available = getAvailableFonts();
    const match = available.find(
      (f) => f.fontFamily.toLowerCase() === font.family.toLowerCase(),
    );

    if (!match) {
      setFontFamily(font.family);
      return;
    }

    const handle = delayRender(`Loading font: ${font.family}`);

    match
      .load()
      .then((loaded) => {
        const style = font.style === "italic" ? "italic" : "normal";
        const result = loaded.loadFont(style as never, {
          weights: font.weight ? [String(font.weight) as never] : undefined,
        });
        return result.waitUntilDone();
      })
      .then(() => {
        setFontFamily(match.fontFamily);
        continueRender(handle);
      })
      .catch(() => {
        setFontFamily(font.family);
        continueRender(handle);
      });
  }, [font?.family, font?.weight, font?.style]);

  return fontFamily;
}
