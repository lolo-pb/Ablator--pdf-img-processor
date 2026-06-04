"use client";

import { useRef, useState } from "react";

type UploadPickerProps = {
  accept: string;
  multiple: boolean;
  name: string;
  required: boolean;
  labels: {
    browseFiles: string;
    dropPrompt: string;
    fileTypesHint: string;
    removeFile: string;
    selectedFiles: string;
  };
};

export function UploadPicker(props: UploadPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function applyFiles(files: File[]) {
    const limitedFiles = props.multiple ? files : files.slice(0, 1);
    setSelectedFiles(limitedFiles);

    if (!inputRef.current) return;

    const transfer = new DataTransfer();
    for (const file of limitedFiles) {
      transfer.items.add(file);
    }
    inputRef.current.files = transfer.files;
  }

  function syncFiles(files: FileList | null) {
    const nextFiles = files ? Array.from(files) : [];
    applyFiles(nextFiles);
  }

  return (
    <div
      className={`upload-picker${isDragging ? " is-dragging" : ""}${selectedFiles.length ? " is-loaded" : ""}`}
      onClick={() => {
        if (!selectedFiles.length) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        syncFiles(event.dataTransfer.files);
      }}
      role={!selectedFiles.length ? "button" : undefined}
      tabIndex={!selectedFiles.length ? 0 : undefined}
      onKeyDown={(event) => {
        if (!selectedFiles.length && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        className="upload-picker__input"
        name={props.name}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        required={props.required}
        onChange={(event) => syncFiles(event.currentTarget.files)}
      />

      <div className="upload-picker__filemark" aria-hidden="true">
        <span>PDF</span>
      </div>

      <div className="upload-picker__copy">
        <strong className="upload-picker__title">{props.labels.dropPrompt}</strong>
        <span className="upload-picker__hint">{props.labels.fileTypesHint}</span>
      </div>

      <button
        type="button"
        className="button secondary upload-picker__browse"
        onClick={() => inputRef.current?.click()}
      >
        {props.labels.browseFiles}
      </button>

      {selectedFiles.length > 0 ? (
        <div className="upload-picker__selection">
            <strong>{props.labels.selectedFiles}</strong>
          <ul className="upload-picker__list">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${file.lastModified}-${index}`}>
                <span>{file.name}</span>
                <button
                  type="button"
                  className="upload-picker__remove"
                  onClick={() => applyFiles(selectedFiles.filter((_, fileIndex) => fileIndex !== index))}
                  aria-label={`${props.labels.removeFile} ${file.name}`}
                >
                  {props.labels.removeFile}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
