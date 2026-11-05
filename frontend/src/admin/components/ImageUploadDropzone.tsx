import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { adminApi, ApiClientError } from "../../lib/api";

interface SingleImageDropzoneProps {
  label?: string;
  helperText?: string;
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file data"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ImageUploadDropzone({
  label = "Upload Image",
  helperText = "Drag & drop an image here, or click to browse (PNG, JPG, WEBP, GIF up to 10MB)",
  value,
  onChange,
  compact = false,
}: SingleImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function processFile(file: File) {
    setError(null);
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
      setError("Please select a valid image file (PNG, JPG, WEBP, or GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image file must be smaller than 10MB.");
      return;
    }

    setUploading(true);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const uploaded = await adminApi.uploadImage({
        fileName: file.name,
        mimeType: file.type,
        dataBase64,
      });
      onChange(uploaded.url);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to upload image. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = "";
  }

  return (
    <div className="space-y-2 text-xs">
      {label && (
        <label className="block font-bold text-ink-charcoal">{label}</label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="rounded-neo-sm border border-surface-border bg-canvas-ivory p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`${
                compact ? "h-14 w-14" : "h-20 w-20"
              } rounded-neo-sm border border-surface-border bg-surface-white p-1.5 shrink-0 flex items-center justify-center overflow-hidden`}
            >
              <img
                src={value}
                alt="Uploaded preview"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                Image Ready
              </span>
              <p className="mt-1 text-[11px] text-ink-secondary">
                Drop a new file or click Change to replace.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="neo-button-secondary text-xs py-1.5 px-2.5"
            >
              {uploading ? "Uploading..." : "Change"}
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => onChange("")}
              className="p-1.5 rounded-neo-sm border border-surface-border bg-surface-white text-ink-secondary hover:text-brand-red hover:border-brand-red transition-colors cursor-pointer"
              title="Remove image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-neo-sm border-2 border-dashed transition-colors cursor-pointer ${
            compact ? "p-4" : "p-6"
          } text-center flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? "border-brand-red bg-brand-red/5"
              : "border-surface-border bg-canvas-ivory hover:border-brand-red/60 hover:bg-canvas-ivory/80"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 text-brand-red animate-spin" />
              <p className="font-bold text-ink-charcoal">Uploading image...</p>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-surface-white border border-surface-border flex items-center justify-center text-brand-red shadow-2xs">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-ink-charcoal">
                  Drag &amp; drop image here, or{" "}
                  <span className="text-brand-red underline">browse file</span>
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">{helperText}</p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-neo-sm border border-brand-red/30 bg-brand-red/5 p-2 text-[11px] text-brand-red flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

interface MultiImageGalleryDropzoneProps {
  thumbnailUrl: string;
  images: string[];
  onChange: (nextThumbnail: string, nextImages: string[]) => void;
}

export function ProductImageGalleryDropzone({
  thumbnailUrl,
  images,
  onChange,
}: MultiImageGalleryDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allImages = Array.from(
    new Set([thumbnailUrl, ...images].filter(Boolean)),
  );

  async function processFiles(fileList: FileList | File[]) {
    setError(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)) {
        setError(
          `Unsupported file "${file.name}". Please upload PNG, JPG, WEBP, or GIF images.`,
        );
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 10MB file size limit.`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const dataBase64 = await readFileAsBase64(file);
        const res = await adminApi.uploadImage({
          fileName: file.name,
          mimeType: file.type,
          dataBase64,
        });
        uploadedUrls.push(res.url);
      }

      const nextList = Array.from(new Set([...allImages, ...uploadedUrls]));
      const nextPrimary = thumbnailUrl || nextList[0] || "";
      onChange(nextPrimary, nextList);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to upload one or more images.");
      }
    } finally {
      setUploading(false);
    }
  }

  function handleSetPrimary(url: string) {
    const reordered = [url, ...allImages.filter((img) => img !== url)];
    onChange(url, reordered);
  }

  function handleRemoveImage(url: string) {
    const remaining = allImages.filter((img) => img !== url);
    const nextPrimary =
      thumbnailUrl === url ? (remaining[0] ?? "") : thumbnailUrl;
    onChange(nextPrimary, remaining);
  }

  return (
    <div className="space-y-3 text-xs">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          if (e.target.files) {
            void processFiles(e.target.files);
          }
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isDragging) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) {
            void processFiles(e.dataTransfer.files);
          }
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`rounded-neo-sm border-2 border-dashed p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? "border-brand-red bg-brand-red/5"
            : "border-surface-border bg-canvas-ivory hover:border-brand-red/60"
        }`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 text-brand-red animate-spin" />
            <p className="font-bold text-ink-charcoal">
              Uploading product photo(s)...
            </p>
          </>
        ) : (
          <>
            <div className="h-11 w-11 rounded-full bg-surface-white border border-surface-border flex items-center justify-center text-brand-red shadow-2xs">
              <ImagePlus className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-ink-charcoal text-xs sm:text-sm">
                Drag &amp; drop product photos here, or{" "}
                <span className="text-brand-red underline">
                  click to upload
                </span>
              </p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Supports PNG, JPG, WEBP, GIF (up to 10MB per photo). Drop
                multiple photos at once.
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-neo-sm border border-brand-red/30 bg-brand-red/5 p-2.5 text-xs text-brand-red flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploaded Gallery Thumbnails */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {allImages.map((imgUrl, idx) => {
            const isPrimary = imgUrl === thumbnailUrl || (idx === 0 && !thumbnailUrl);
            return (
              <div
                key={imgUrl}
                className={`group relative rounded-neo-sm border p-2 bg-surface-white flex flex-col justify-between transition-all ${
                  isPrimary
                    ? "border-brand-red ring-1 ring-brand-red/30"
                    : "border-surface-border"
                }`}
              >
                <div className="aspect-square w-full rounded bg-canvas-ivory flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={imgUrl}
                    alt={`Product photo ${idx + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-1 pt-1.5 border-t border-surface-border">
                  {isPrimary ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-red">
                      <Star className="h-3 w-3 fill-brand-red" />
                      Main Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(imgUrl)}
                      className="text-[10px] font-bold text-ink-secondary hover:text-brand-red cursor-pointer"
                    >
                      Set as Cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(imgUrl)}
                    className="p-1 rounded text-ink-muted hover:text-brand-red hover:bg-brand-red/5 transition-colors cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
