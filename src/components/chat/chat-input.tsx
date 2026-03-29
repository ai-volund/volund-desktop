import { useState, useRef, type KeyboardEvent, type DragEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Image } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith("image/");
  const sizeKB = Math.round(file.size / 1024);
  const sizeLabel = sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
      {isImage ? (
        <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      ) : (
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      <span className="truncate max-w-[150px]">{file.name}</span>
      <span className="text-xs text-muted-foreground">({sizeLabel})</span>
      <button
        onClick={onRemove}
        className="ml-auto hover:text-destructive transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Send a message...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((text.trim() || files.length > 0) && !disabled) {
      onSend(text.trim(), files.length > 0 ? files : undefined);
      setText("");
      setFiles([]);
      if (ref.current) ref.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFiles = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div
      className={`border-t bg-background ${isDragging ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {files.map((file, i) => (
            <FilePreview key={i} file={file} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}
      <div className="flex gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 self-end"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Attach files"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-h-[40px] max-h-[200px] resize-none"
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
          autoFocus
        />
        <Button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && files.length === 0)}
          size="icon"
          className="shrink-0 self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
