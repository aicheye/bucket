import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { ChangeEvent, DragEvent, useRef, useState } from "react";

interface FileUploadZoneProps {
  title: string;
  description: React.ReactNode;
  accept: string;
  onFileSelect: (file: File | null) => void;
  icon: IconDefinition;
  error?: string | null;
  helpLink?: string;
  helpText?: string;
}

export default function FileUploadZone({
  title,
  description,
  accept,
  onFileSelect,
  icon,
  error: externalError,
  helpLink,
  helpText = "Need help?",
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragError, setIsDragError] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finalError = localError || externalError;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      let valid = true;
      valid = item.type === accept;
      setIsDragError(!valid);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDragError(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDragError(false);
    setLocalError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === accept) {
        onFileSelect(file);
      } else {
        setLocalError(`Invalid file type. Expected ${accept}`);
        onFileSelect(null);
      }
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`flex flex-col gap-6 items-center justify-center p-8 border-2 border-dashed rounded-lg bg-base-100/50 transition-colors
            ${isDragging && !isDragError ? "border-primary bg-primary/10" : ""}
            ${isDragging && isDragError ? "border-error bg-error/10" : ""}
            ${!isDragging && !finalError ? "border-base-content/20" : ""}
            ${finalError ? "border-error bg-error/5" : ""}
        `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center">
        <FontAwesomeIcon icon={icon} className="text-4xl opacity-50 mb-4" />
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm opacity-60 mt-1 max-w-xs mx-auto">
          {description}
        </p>
        {helpLink && (
          <Link
            href={helpLink}
            target="_blank"
            className="link link-info text-sm z-10"
          >
            {helpText}
          </Link>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="file-input file-input-primary w-full max-w-xs"
        onChange={handleInputChange}
      />
      {finalError && (
        <div className="text-error text-sm mt-2 font-bold">{finalError}</div>
      )}
    </div>
  );
}
