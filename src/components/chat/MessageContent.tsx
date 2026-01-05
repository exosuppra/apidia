import { useMemo } from "react";

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export default function MessageContent({ content, isUser }: MessageContentProps) {
  const formattedContent = useMemo(() => {
    if (isUser) {
      // User messages: just render as plain text
      return <p className="whitespace-pre-wrap">{content}</p>;
    }

    // Parse markdown-like content for assistant messages
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let codeBlock: string[] = [];
    let inCodeBlock = false;

    const flushList = () => {
      if (listItems.length > 0 && listType) {
        const ListTag = listType;
        elements.push(
          <ListTag 
            key={`list-${elements.length}`} 
            className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} pl-4 my-2 space-y-1`}
          >
            {listItems.map((item, i) => (
              <li key={i} className="text-sm">{formatInlineText(item)}</li>
            ))}
          </ListTag>
        );
        listItems = [];
        listType = null;
      }
    };

    const flushCodeBlock = () => {
      if (codeBlock.length > 0) {
        elements.push(
          <pre 
            key={`code-${elements.length}`} 
            className="bg-background/50 rounded p-2 my-2 text-xs overflow-x-auto font-mono"
          >
            <code>{codeBlock.join('\n')}</code>
          </pre>
        );
        codeBlock = [];
      }
    };

    const formatInlineText = (text: string): JSX.Element => {
      // Handle **bold**, *italic*, `code`, and links
      const parts: (string | JSX.Element)[] = [];
      let remaining = text;
      let keyCounter = 0;

      // Process bold text
      while (remaining.includes('**')) {
        const startIdx = remaining.indexOf('**');
        const endIdx = remaining.indexOf('**', startIdx + 2);
        
        if (endIdx === -1) break;
        
        if (startIdx > 0) {
          parts.push(remaining.slice(0, startIdx));
        }
        parts.push(
          <strong key={keyCounter++} className="font-semibold">
            {remaining.slice(startIdx + 2, endIdx)}
          </strong>
        );
        remaining = remaining.slice(endIdx + 2);
      }
      
      if (remaining) {
        // Process inline code in remaining text
        const codeRegex = /`([^`]+)`/g;
        const withCode = remaining.split(codeRegex);
        withCode.forEach((part, i) => {
          if (i % 2 === 1) {
            parts.push(
              <code key={keyCounter++} className="bg-background/50 px-1 py-0.5 rounded text-xs font-mono">
                {part}
              </code>
            );
          } else if (part) {
            parts.push(part);
          }
        });
      }

      return <>{parts.length > 0 ? parts : text}</>;
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Code block handling
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          flushList();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlock.push(line);
        return;
      }

      // Empty line
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headers
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={`h4-${index}`} className="font-semibold text-sm mt-3 mb-1">
            {formatInlineText(trimmedLine.slice(4))}
          </h4>
        );
        return;
      }

      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="font-semibold text-sm mt-3 mb-1">
            {formatInlineText(trimmedLine.slice(3))}
          </h3>
        );
        return;
      }

      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="font-bold text-base mt-3 mb-1">
            {formatInlineText(trimmedLine.slice(2))}
          </h2>
        );
        return;
      }

      // Unordered list items (-, *, •)
      if (/^[-*•]\s/.test(trimmedLine)) {
        if (listType !== 'ul') {
          flushList();
          listType = 'ul';
        }
        listItems.push(trimmedLine.slice(2));
        return;
      }

      // Ordered list items (1., 2., etc.)
      if (/^\d+\.\s/.test(trimmedLine)) {
        if (listType !== 'ol') {
          flushList();
          listType = 'ol';
        }
        listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`p-${index}`} className="text-sm mb-2 last:mb-0">
          {formatInlineText(trimmedLine)}
        </p>
      );
    });

    // Flush any remaining list or code block
    flushList();
    flushCodeBlock();

    return <div className="space-y-1">{elements}</div>;
  }, [content, isUser]);

  return formattedContent;
}
