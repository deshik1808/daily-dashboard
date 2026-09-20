// components/design/FormattedNote.tsx
import { parseNoteLines } from "@/lib/notes";

interface FormattedNoteProps {
  content?: string | null;
  className?: string;
}

export function FormattedNote({ content, className = "" }: FormattedNoteProps) {
  if (!content || !content.trim()) {
    return null;
  }

  const lines = parseNoteLines(content);

  return (
    <div className={`space-y-1 ${className}`}>
      {lines.map((item, idx) => {
        if (item.type === "empty") {
          return <div key={idx} className="h-1.5" />;
        }
        if (item.type === "bullet") {
          return (
            <div key={idx} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="select-none font-bold text-muted shrink-0">•</span>
              <span className="flex-1 break-words text-ink">{item.text}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="break-words text-[13px] leading-relaxed text-ink">
            {item.text}
          </p>
        );
      })}
    </div>
  );
}
