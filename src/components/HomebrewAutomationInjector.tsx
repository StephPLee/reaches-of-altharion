import { useLayoutEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  homebrewAutomationEntries,
  type HomebrewAutomationEntry,
} from "../data/avraeAliases";
import AvraeAliasBlock from "./AvraeAliasBlock";
import AvraeCommandBlock from "./AvraeCommandBlock";
import HomebrewAutomationSection from "./HomebrewAutomationSection";

function normalizeMatchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findAnchorForEntry(
  article: HTMLElement,
  entry: HomebrewAutomationEntry,
) {
  if (entry.headingText) {
    const selector = entry.headingSelector ?? "h2";
    const headings = Array.from(
      article.querySelectorAll<HTMLElement>(selector),
    );
    const normalizedHeadingText = normalizeMatchText(entry.headingText);
    const matchingHeading = headings.find(
      (heading) =>
        normalizeMatchText(heading.textContent ?? "") === normalizedHeadingText,
    );

    if (matchingHeading) {
      return matchingHeading;
    }
  }

  const anchors = Array.from(
    article.querySelectorAll<HTMLAnchorElement>("a[href]"),
  );

  return (
    anchors.find((anchor) => entry.href && anchor.href === entry.href) ??
    anchors.find(
      (anchor) =>
        entry.linkText && anchor.textContent?.trim() === entry.linkText,
    )
  );
}

function getInsertionTarget(anchor: HTMLElement) {
  if (/^H[1-6]$/.test(anchor.tagName)) {
    return getHeadingInsertionTarget(anchor);
  }

  const paragraph = anchor.closest("p");

  if (paragraph && paragraph.querySelector("br")) {
    return splitParagraphAtBreaks(paragraph, anchor);
  }

  return anchor.closest("p, li, div") ?? anchor;
}

function getHeadingInsertionTarget(heading: HTMLElement) {
  let next = heading.nextElementSibling as HTMLElement | null;
  let target: HTMLElement = heading;

  while (next && !/^H[1-6]$/.test(next.tagName)) {
    const text = next.textContent?.trim() ?? "";

    if (text) {
      target = next;
    }

    if (/^H[1-6]$/.test(next.tagName)) {
      break;
    }

    next = next.nextElementSibling as HTMLElement | null;

    if (target !== heading) {
      break;
    }
  }

  return target;
}

function splitParagraphAtBreaks(
  paragraph: HTMLParagraphElement,
  anchor: HTMLElement,
) {
  const nodes = Array.from(paragraph.childNodes);
  const segments: ChildNode[][] = [];
  let currentSegment: ChildNode[] = [];

  nodes.forEach((node) => {
    if (node.nodeName === "BR") {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
      return;
    }

    currentSegment.push(node);
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  if (segments.length <= 1) {
    return paragraph;
  }

  const fragment = document.createDocumentFragment();
  let targetParagraph: HTMLParagraphElement | null = null;

  segments.forEach((segment) => {
    const nextParagraph = document.createElement("p");

    segment.forEach((node) => {
      nextParagraph.appendChild(node);
    });

    if (segment.includes(anchor)) {
      targetParagraph = nextParagraph;
    }

    fragment.appendChild(nextParagraph);
  });

  paragraph.replaceWith(fragment);
  return targetParagraph ?? paragraph;
}

export default function HomebrewAutomationInjector() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    const marker = markerRef.current;

    if (!marker) {
      return;
    }

    const article = marker.closest("article");

    if (!article) {
      return;
    }

    const mountedBlocks: Array<{ container: HTMLDivElement; root: Root }> = [];

    homebrewAutomationEntries.forEach((entry) => {
      const anchor = findAnchorForEntry(article, entry);

      if (!anchor) {
        return;
      }

      const target = getInsertionTarget(anchor);
      const container = document.createElement("div");
      container.dataset.homebrewAutomation = entry.id;
      target.insertAdjacentElement("afterend", container);

      const root = createRoot(container);
      root.render(
        <HomebrewAutomationSection>
          {entry.setupCommands?.map((setupCommand, index) => (
            <AvraeCommandBlock
              key={`${entry.id}-setup-${index}`}
              command={setupCommand.command}
              label={setupCommand.label}
            />
          ))}
          {!entry.setupCommands?.length && entry.counterCommand ? (
            <AvraeCommandBlock command={entry.counterCommand} />
          ) : null}
          {entry.codeBlocks?.map((codeBlock, index) => (
            <AvraeAliasBlock
              key={`${entry.id}-code-${index}`}
              title={codeBlock.title}
              code={codeBlock.code}
              downloadName={codeBlock.downloadName}
            />
          ))}
          {!entry.codeBlocks?.length && entry.code ? (
            <AvraeAliasBlock
              title={entry.title}
              code={entry.code}
              downloadName={entry.downloadName}
            />
          ) : null}
        </HomebrewAutomationSection>,
      );

      mountedBlocks.push({ container, root });
    });

    return () => {
      mountedBlocks.forEach(({ container, root }) => {
        root.unmount();
        container.remove();
      });
    };
  }, []);

  return <span ref={markerRef} />;
}
