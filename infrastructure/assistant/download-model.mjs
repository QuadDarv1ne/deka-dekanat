import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

async function size(file) {
  try {
    return (await stat(file)).size;
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
}
async function checksum(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export async function ensureModel({
  directory,
  manifest,
  fetchImpl = fetch,
  attempts = 3,
  log = console.log,
}) {
  if (
    !/^[A-Za-z0-9._-]+\.gguf$/.test(manifest.filename) ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256) ||
    !Number.isSafeInteger(manifest.bytes) ||
    manifest.bytes <= 0
  )
    throw new Error("Invalid model manifest.");
  const root = path.resolve(directory),
    target = path.join(root, manifest.filename),
    partial = target + ".partial";
  await mkdir(root, { recursive: true });
  if (
    (await size(target)) === manifest.bytes &&
    (await checksum(target)) === manifest.sha256
  ) {
    log("Model checksum verified. Reusing the local file.");
    return { path: target, downloaded: false };
  }
  const url = `https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${manifest.filename}?download=true`;
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      let offset = await size(partial);
      if (offset > manifest.bytes) {
        await rm(partial, { force: true });
        offset = 0;
      }
      if (offset < manifest.bytes) {
        const response = await fetchImpl(url, {
          headers: offset ? { Range: `bytes=${offset}-` } : {},
          signal: AbortSignal.timeout(15 * 60 * 1000),
        });
        if (!response.ok || !response.body)
          throw new Error(`Model download returned HTTP ${response.status}.`);
        if (response.status === 206) {
          const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
            response.headers.get("content-range") ?? "",
          );
          if (
            !range ||
            Number(range[1]) !== offset ||
            Number(range[3]) !== manifest.bytes
          )
            throw new Error("Invalid download range.");
        } else if (response.status === 200) offset = 0;
        else throw new Error("Unsupported download response.");
        let received = offset,
          lastProgress = 0;
        log(
          `Downloading ${manifest.filename}${offset ? ` from byte ${offset}` : ""}.`,
        );
        await pipeline(
          Readable.fromWeb(response.body),
          new Transform({
            transform(chunk, encoding, callback) {
              received += chunk.length;
              if (received > manifest.bytes) {
                callback(
                  new Error("Model download exceeded the expected size."),
                );
                return;
              }
              const progress = Math.floor((received / manifest.bytes) * 10);
              if (progress > lastProgress) {
                lastProgress = progress;
                log(`Model download: ${progress * 10}%`);
              }
              callback(null, chunk);
            },
          }),
          createWriteStream(partial, { flags: offset ? "a" : "w" }),
        );
      }
      if (
        (await size(partial)) !== manifest.bytes ||
        (await checksum(partial)) !== manifest.sha256
      ) {
        await rm(partial, { force: true });
        throw new Error("Model checksum or size mismatch.");
      }
      await rename(partial, target);
      log("Model download complete. SHA-256 verified.");
      return { path: target, downloaded: true };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        log(`Download interrupted; retry ${attempt}/${attempts - 1}.`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }
  throw lastError;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const manifest = JSON.parse(
    await readFile(new URL("./model-manifest.json", import.meta.url), "utf8"),
  );
  await ensureModel({
    directory:
      process.env.MODEL_DIRECTORY ??
      fileURLToPath(new URL("../../var/models/", import.meta.url)),
    manifest,
  });
}
