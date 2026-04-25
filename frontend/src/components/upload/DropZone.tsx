import { useRef, useState } from 'react';
import axios from 'axios';
import { AlertCircle, FileUp, Loader2 } from 'lucide-react';

import { uploadDataset } from '../../lib/api';
import { useDatasetStore } from '../../store/datasetStore';

export function DropZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isUploading, uploadError, setProfile, setUploading, setUploadError } = useDatasetStore();

  const handleFile = async (file: File) => {
    const valid = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const byExtension = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!valid.includes(file.type) && !byExtension) {
      setUploadError('Upload a CSV or XLSX file. Try exporting your dataset as .csv.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const profile = await uploadDataset(file);
      setProfile(profile);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? error.response?.data?.detail ?? error.message
        : error instanceof Error
          ? error.message
          : 'Upload failed. Try a smaller file.';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) {
            void handleFile(file);
          }
        }}
        className={[
          'flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded border border-dashed p-8 text-center transition-colors',
          isDragging ? 'border-accent bg-accent-light' : 'border-border-strong bg-canvas-secondary hover:border-accent',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
        />
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded bg-white shadow-card">
          {isUploading ? (
            <Loader2 className="animate-spin text-accent" size={22} strokeWidth={1.5} />
          ) : (
            <FileUp className="text-accent" size={22} strokeWidth={1.5} />
          )}
        </div>
        <div className="text-lg font-semibold text-text-primary">
          {isUploading ? 'Reading your dataset...' : 'Drop a CSV or XLSX dataset'}
        </div>
        <div className="mt-2 max-w-md text-sm text-text-secondary">
          Astra profiles columns, missing values, class balance, correlations, and leakage signals before training.
        </div>
      </div>

      {uploadError && (
        <div className="mt-4 flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={18} strokeWidth={1.5} />
          <div>
            <div className="font-medium">{uploadError}</div>
            <div className="mt-1 text-red-600">Try uploading a smaller CSV or checking that the file opens locally.</div>
          </div>
        </div>
      )}
    </div>
  );
}
