"use client";

import { useState } from "react";
import { FolderOpen, Upload, Trash2, FileText, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "ready" | "processing" | "failed";
  uploadedAt: string;
}

export default function WorkspaceFilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([
    {
      id: "f-1",
      name: "Q3_Financial_Analysis.pdf",
      size: 2450000,
      type: "application/pdf",
      status: "ready",
      uploadedAt: "2026-10-21",
    },
    {
      id: "f-2",
      name: "Cloud_Infrastructure_RFC.docx",
      size: 1120000,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      status: "ready",
      uploadedAt: "2026-10-20",
    },
    {
      id: "f-3",
      name: "API_Endpoints_Schema.md",
      size: 34000,
      type: "text/markdown",
      status: "ready",
      uploadedAt: "2026-10-19",
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("planTier", "pro");

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "File processing failed");
      }

      setFiles((prev) => [
        {
          id: data.fileId,
          name: data.fileName,
          size: data.fileSizeBytes,
          type: data.mimeType,
          status: "ready",
          uploadedAt: new Date().toISOString().split("T")[0],
        },
        ...prev,
      ]);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setFiles(files.filter((f) => f.id !== id));
  };

  const totalUsedBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header & Storage Quota Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">File Library & Document Context</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Secure, private document repository. Validated via binary magic bytes.
          </p>
        </div>

        <div className="p-3 rounded-xl glass-card border border-white/5 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-indigo-400" />
          <div className="text-xs">
            <div className="text-zinc-400 font-medium">Storage Quota (Pro Plan)</div>
            <div className="text-white font-bold">
              {formatBytes(totalUsedBytes)} <span className="text-zinc-500 font-normal">/ 1.0 GB</span>
            </div>
          </div>
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center glass-panel hover:border-indigo-500/40 transition-colors">
        <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white">Upload Documents to Workspace</h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Supported formats: PDF, DOCX, CSV, TXT, Markdown (Max 25 MB on Pro tier)
        </p>
        <div className="mt-4">
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-lg shadow-indigo-600/20">
            <span>{isUploading ? "Validating & Extracting..." : "Select Document"}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.docx,.txt,.md,.csv"
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* File List Table */}
      <div className="rounded-2xl glass-card border border-white/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5 font-semibold text-xs text-zinc-300">
          Attached Workspace Files ({files.length})
        </div>
        <div className="divide-y divide-white/5">
          {files.map((file) => (
            <div key={file.id} className="p-4 flex items-center justify-between text-xs hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-200">{file.name}</div>
                  <div className="text-[10px] text-zinc-500">
                    {formatBytes(file.size)} • Added on {file.uploadedAt}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready
                </span>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="text-zinc-500 hover:text-rose-400 p-1.5 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
