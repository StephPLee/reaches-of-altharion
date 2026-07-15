import type { ReactElement, ReactNode } from "react";

export type MarkdownHeading = {
  id: string;
  text: string;
  level: number;
};

export type IconName =
  | "bold"
  | "italic"
  | "code"
  | "link"
  | "image"
  | "list"
  | "orderedList"
  | "table";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function isSafeHref(value: string) {
  return /^(https?:\/\/|\/|#)/i.test(value);
}

export type ImageSize = "small" | "medium" | "large" | "full";
export type ImageAlign = "left" | "right" | "center";

const SIZE_CLASS_KEYS: Record<ImageSize, "mediaSizeSmall" | "mediaSizeMedium" | "mediaSizeLarge" | "mediaSizeFull"> = {
  small: "mediaSizeSmall",
  medium: "mediaSizeMedium",
  large: "mediaSizeLarge",
  full: "mediaSizeFull",
};

const ALIGN_CLASS_KEYS: Record<ImageAlign, "mediaAlignLeft" | "mediaAlignRight" | "mediaAlignCenter"> = {
  left: "mediaAlignLeft",
  right: "mediaAlignRight",
  center: "mediaAlignCenter",
};

function parseImageOptions(raw: string | undefined): { size: ImageSize; align: ImageAlign } {
  const options: { size: ImageSize; align: ImageAlign } = { size: "medium", align: "right" };
  if (!raw) {
    return options;
  }

  for (const token of raw.trim().split(/\s+/)) {
    const [key, value] = token.split("=");
    if (key === "size" && (value === "small" || value === "medium" || value === "large" || value === "full")) {
      options.size = value;
    } else if (key === "align" && (value === "left" || value === "right" || value === "center")) {
      options.align = value;
    }
  }

  return options;
}

function renderInlineMarkdown(value: string, imageClassName = ""): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[([^\]]*)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) {
      nodes.push(value.slice(lastIndex, match.index));
    }

    if (match[2] !== undefined && match[3]) {
      nodes.push(
        <img
          key={`${match.index}-image`}
          className={imageClassName}
          src={isSafeHref(match[3]) ? match[3] : ""}
          alt={match[2]}
          loading="lazy"
        />,
      );
    } else if (match[5]) {
      nodes.push(<code key={`${match.index}-code`}>{match[5]}</code>);
    } else if (match[7]) {
      nodes.push(<strong key={`${match.index}-strong`}>{match[7]}</strong>);
    } else if (match[9]) {
      nodes.push(<em key={`${match.index}-em`}>{match[9]}</em>);
    } else if (match[10] && match[11]) {
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={isSafeHref(match[11]) ? match[11] : "#"}
        >
          {match[10]}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) {
    nodes.push(value.slice(lastIndex));
  }

  return nodes;
}

function renderInlineMarkdownWithBreaks(
  lines: string[],
  imageClassName = "",
): ReactNode[] {
  return lines.flatMap((line, index) => [
    ...(index > 0 ? [<br key={`br-${index}`} />] : []),
    ...renderInlineMarkdown(line, imageClassName),
  ]);
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

export function renderMarkdown(
  markdown: string,
  mediaClassNames?: {
    markdownImage?: string;
    mediaFigure?: string;
    mediaImage?: string;
    mediaCaption?: string;
    mediaStandalone?: string;
    mediaSizeSmall?: string;
    mediaSizeMedium?: string;
    mediaSizeLarge?: string;
    mediaSizeFull?: string;
    mediaAlignLeft?: string;
    mediaAlignRight?: string;
    mediaAlignCenter?: string;
    mediaFloatLeft?: string;
    mediaFloatRight?: string;
  },
): {
  blocks: ReactNode[];
  headings: MarkdownHeading[];
} {
  const classNames = {
    markdownImage: "",
    mediaFigure: "",
    mediaImage: "",
    mediaCaption: "",
    mediaStandalone: "",
    mediaSizeSmall: "",
    mediaSizeMedium: "",
    mediaSizeLarge: "",
    mediaSizeFull: "",
    mediaAlignLeft: "",
    mediaAlignRight: "",
    mediaAlignCenter: "",
    mediaFloatLeft: "",
    mediaFloatRight: "",
    ...mediaClassNames,
  };
  const inline = (value: string) =>
    renderInlineMarkdown(value, classNames.markdownImage);
  const inlineWithBreaks = (values: string[]) =>
    renderInlineMarkdownWithBreaks(values, classNames.markdownImage);
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const headings: MarkdownHeading[] = [];
  const usedIds = new Map<string, number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const fenceMatch = trimmed.match(/^```(\w+)?/);
    if (fenceMatch) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`code-${index}`}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push(<hr key={`hr-${index}`} />);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingText = heading[2];
      const content = inline(headingText);
      const baseId = slugify(headingText) || `section-${index}`;
      const seenCount = usedIds.get(baseId) ?? 0;
      usedIds.set(baseId, seenCount + 1);
      const id = seenCount > 0 ? `${baseId}-${seenCount}` : baseId;
      headings.push({ id, text: headingText, level });

      if (level === 1) {
        blocks.push(
          <h1 id={id} key={`h-${index}`}>
            {content}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2 id={id} key={`h-${index}`}>
            {content}
          </h2>,
        );
      } else if (level === 3) {
        blocks.push(
          <h3 id={id} key={`h-${index}`}>
            {content}
          </h3>,
        );
      } else {
        blocks.push(
          <h4 id={id} key={`h-${index}`}>
            {content}
          </h4>,
        );
      }
      continue;
    }

    if (trimmed.startsWith("|") && lines[index + 1] && isTableDivider(lines[index + 1])) {
      const headerCells = parseTableRow(trimmed);
      const bodyRows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        bodyRows.push(parseTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <table key={`table-${index}`}>
          <thead>
            <tr>
              {headerCells.map((cell) => (
                <th key={cell}>{inline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>
                    {inline(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <blockquote key={`blockquote-${index}`}>
          <p>{inlineWithBreaks(quoteLines)}</p>
        </blockquote>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <ol key={`ol-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const standaloneImage = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (standaloneImage) {
      const [, alt, src, optionsRaw] = standaloneImage;
      const { size, align } = parseImageOptions(optionsRaw);
      let caption: string | null = null;
      const nextLine = lines[index + 1];
      if (nextLine && nextLine.trim()) {
        const captionMatch = nextLine.trim().match(/^\*([^*]+)\*$/);
        if (captionMatch) {
          caption = captionMatch[1];
          index += 1;
        }
      }

      // Left/right images float at a fixed width (like a standard wiki
      // infobox image) so surrounding text always wraps up to their actual
      // height and reclaims full width right after - no dead space, and no
      // JS guessing about how much text to pair with them. Only two fixed
      // slots exist (never a freely-dragged position), and section
      // boundaries (headings, tables, hr, other standalone images) clear
      // any float in progress, so a floated image can never bleed past the
      // section it was placed in.
      const isFloated = align !== "center" && size !== "full";
      const figureClassName = [
        classNames.mediaFigure,
        classNames[SIZE_CLASS_KEYS[size]],
        isFloated ? classNames[align === "left" ? "mediaFloatLeft" : "mediaFloatRight"] : "",
      ]
        .filter(Boolean)
        .join(" ");
      const figure = (
        <figure key={`figure-${index}`} className={figureClassName}>
          <img
            className={classNames.mediaImage}
            src={isSafeHref(src) ? src : ""}
            alt={alt}
            loading="lazy"
          />
          {caption ? (
            <figcaption className={classNames.mediaCaption}>{caption}</figcaption>
          ) : null}
        </figure>
      );

      if (isFloated) {
        blocks.push(figure);
        continue;
      }

      const standaloneClassName = [classNames.mediaStandalone, classNames[ALIGN_CLASS_KEYS[align]]]
        .filter(Boolean)
        .join(" ");
      blocks.push(
        <div key={`media-standalone-${index}`} className={standaloneClassName}>
          {figure}
        </div>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    while (
      lines[index + 1] &&
      lines[index + 1].trim() &&
      !/^(#{1,4})\s+/.test(lines[index + 1].trim()) &&
      !/^[-*]\s+/.test(lines[index + 1].trim()) &&
      !/^>\s?/.test(lines[index + 1].trim()) &&
      !/^\d+\.\s+/.test(lines[index + 1].trim()) &&
      !lines[index + 1].trim().startsWith("|") &&
      !lines[index + 1].trim().startsWith("```") &&
      !/^!\[/.test(lines[index + 1].trim()) &&
      !/^---+$/.test(lines[index + 1].trim())
    ) {
      index += 1;
      paragraphLines.push(lines[index].trim());
    }

    blocks.push(
      <p key={`p-${index}`}>{inlineWithBreaks(paragraphLines)}</p>,
    );
  }

  return { blocks, headings };
}

export function insertMarkdown(
  textarea: HTMLTextAreaElement | null,
  value: string,
  updateMarkdown: (value: string) => void,
  markdown: string,
) {
  if (!textarea) {
    updateMarkdown(`${markdown}${value}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextMarkdown = `${markdown.slice(0, start)}${value}${markdown.slice(end)}`;
  updateMarkdown(nextMarkdown);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.selectionStart = start + value.length;
    textarea.selectionEnd = start + value.length;
  });
}

export function ToolbarIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  if (name === "bold") {
    return <strong aria-hidden="true">B</strong>;
  }

  if (name === "italic") {
    return <em aria-hidden="true">I</em>;
  }

  const paths: Record<Exclude<IconName, "bold" | "italic">, ReactNode> = {
    code: (
      <>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10.5" r="1.5" />
        <path d="m21 15-5-5L5 19" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </>
    ),
    orderedList: (
      <>
        <path d="M10 6h11" />
        <path d="M10 12h11" />
        <path d="M10 18h11" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M3.5 15a1.5 1.5 0 0 1 3 0c0 1.5-3 1.5-3 3h3" />
      </>
    ),
    table: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M9 4v16" />
        <path d="M15 4v16" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      {paths[name]}
    </svg>
  );
}
