import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App";
import "./index.css";
import { buildApiUrl } from "./lib/apiOrigin";
import { enforceCanonicalPublicHost } from "./lib/publicSiteUrl";

enforceCanonicalPublicHost();

const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    return nativeFetch(buildApiUrl(input), init);
  }
  if (input instanceof URL && input.pathname.startsWith("/api/")) {
    return nativeFetch(buildApiUrl(`${input.pathname}${input.search}${input.hash}`), init);
  }
  if (input instanceof Request && input.url.startsWith(window.location.origin + "/api/")) {
    const url = new URL(input.url);
    const rewritten = new Request(buildApiUrl(`${url.pathname}${url.search}${url.hash}`), input);
    return nativeFetch(rewritten, init);
  }
  return nativeFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
