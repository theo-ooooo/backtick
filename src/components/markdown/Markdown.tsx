import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// allow hljs class names through sanitization so highlighting survives
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-|^hljs/]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", /^hljs/]],
  },
};

/** Shared markdown renderer — editor preview and post pages use the same output. */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="bt-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize as never, [rehypeHighlight, { ignoreMissing: true }] as never]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
