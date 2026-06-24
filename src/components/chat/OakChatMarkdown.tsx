"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function OakChatMarkdown({ content }: { content: string }) {
  return (
    <div className="oak-chat-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline =
              !className ||
              (!String(className).includes("language-") &&
                !String(children).includes("\n"));
            if (isInline) {
              return (
                <code className="oak-chat-markdown__code-inline" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="oak-chat-markdown__code-block">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="oak-chat-markdown__link"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
