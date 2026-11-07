"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

/**
 * QR-код на базе пакета qrcode (генерация локально в браузере, без внешних сервисов).
 * Если передан fileName — под кодом появляется кнопка «Скачать PNG».
 */
export function QRCodeSVG({ value, size = 160, fileName }: { value: string; size?: number; fileName?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return <div style={{ width: size, height: size }} className="animate-pulse rounded-lg bg-muted" aria-label="Генерация QR-кода" />;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img src={src} width={size} height={size} alt="QR-код" className="rounded-lg" />
      {fileName && (
        <a
          href={src}
          download={fileName}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary underline underline-offset-2"
        >
          <Download className="h-3.5 w-3.5" />
          Скачать PNG
        </a>
      )}
    </div>
  );
}
