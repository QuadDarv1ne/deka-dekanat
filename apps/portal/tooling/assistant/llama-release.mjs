// Derives the llama.cpp release tag from an archive file name.
//
// The download URL is built as
//   https://github.com/ggml-org/llama.cpp/releases/download/<tag>/<archive>
// so the tag and the archive must describe the same build. Keeping the tag as a
// separate manifest field let them drift apart ("b12180" with an archive named
// "llama-b12649-..."), which produced a 404 and left the assistant without a
// runtime. The archive name is the single source of truth.
export function llamaReleaseTag(archive, fallback) {
  const fromArchive = /^llama-(b\d+)-/.exec(String(archive ?? ''))?.[1];
  return fromArchive ?? fallback ?? null;
}
