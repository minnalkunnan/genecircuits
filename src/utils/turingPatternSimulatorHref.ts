/**
 * URL for public/turing-pattern.html next to the main circuit UI.
 *
 * Electron Forge dev server loads the window at `http://localhost:PORT/main_window`
 * (no trailing slash). A relative href `turing-pattern.html` is resolved as if
 * `main_window` were a file, producing `/turing-pattern.html` → 404.
 */
export function turingPatternSimulatorHref(): string {
  const url = new URL(window.location.href);
  const lastSeg = url.pathname.split("/").pop() ?? "";
  const looksLikeFile = /\.[a-z0-9]{2,8}$/i.test(lastSeg);

  if (looksLikeFile) {
    url.pathname = url.pathname.replace(/\/[^/]+$/, "/");
  } else if (url.pathname !== "/" && !url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  return new URL("turing-pattern.html", url.href).href;
}
