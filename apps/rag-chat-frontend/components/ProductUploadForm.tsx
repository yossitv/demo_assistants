'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { ParseError } from '@/types';

interface UploadResult {
  knowledgeSpaceId: string;
  status: 'completed' | 'partial' | 'error';
  successCount: number;
  failureCount: number;
  errors: ParseError[];
}

interface ProductUploadFormProps {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.md', '.markdown'];

export default function ProductUploadForm({ onSuccess, onError }: ProductUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit. Selected file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('name', selectedFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('sourceType', 'file');

      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const token = process.env.NEXT_PUBLIC_JWT_TOKEN;

      const response = await fetch(`${apiUrl}/v1/knowledge/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const uploadResult: UploadResult = {
        knowledgeSpaceId: result.knowledgeSpaceId,
        status: result.status || 'completed',
        successCount: result.summary?.successCount || 0,
        failureCount: result.summary?.failureCount || 0,
        errors: result.summary?.errors || [],
      };

      setUploadResult(uploadResult);
      onSuccess?.(uploadResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* File Selection Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />
        
        {!selectedFile ? (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Click to upload
              </button>
              {' or drag and drop'}
            </div>
            <p className="text-xs text-gray-500">
              Markdown files only (.md, .markdown), max 10MB
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm font-medium text-gray-900">
              {selectedFile.name}
            </div>
            <div className="text-xs text-gray-500">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-500"
              disabled={isUploading}
            >
              Choose different file
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div
          className={`rounded-md p-4 ${
            uploadResult.status === 'completed'
              ? 'bg-green-50'
              : uploadResult.status === 'partial'
              ? 'bg-yellow-50'
              : 'bg-red-50'
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className={`h-5 w-5 ${
                  uploadResult.status === 'completed'
                    ? 'text-green-400'
                    : uploadResult.status === 'partial'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3
                className={`text-sm font-medium ${
                  uploadResult.status === 'completed'
                    ? 'text-green-800'
                    : uploadResult.status === 'partial'
                    ? 'text-yellow-800'
                    : 'text-red-800'
                }`}
              >
                {uploadResult.status === 'completed'
                  ? 'Upload Completed'
                  : uploadResult.status === 'partial'
                  ? 'Upload Partially Completed'
                  : 'Upload Failed'}
              </h3>
              <div
                className={`mt-2 text-sm ${
                  uploadResult.status === 'completed'
                    ? 'text-green-700'
                    : uploadResult.status === 'partial'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}
              >
                <p>
                  Successfully processed: {uploadResult.successCount} products
                </p>
                {uploadResult.failureCount > 0 && (
                  <p>Failed: {uploadResult.failureCount} products</p>
                )}
              </div>
              {uploadResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary
                    className={`cursor-pointer text-sm font-medium ${
                      uploadResult.status === 'partial'
                        ? 'text-yellow-800'
                        : 'text-red-800'
                    }`}
                  >
                    View Errors ({uploadResult.errors.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs">
                    {uploadResult.errors.map((err, idx) => (
                      <li key={idx}>
                        Item {err.itemIndex}: {err.reason}
                        {err.field && ` (field: ${err.field})`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex justify-end space-x-3">
        {uploadResult && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Upload Another File
          </button>
        )}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
