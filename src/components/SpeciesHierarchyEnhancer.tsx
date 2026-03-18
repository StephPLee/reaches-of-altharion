import { useLayoutEffect, useRef } from "react";

import styles from "./SpeciesHierarchyEnhancer.module.css";

const SPECIES_WITH_SUBRACES = [
  "https://www.dndbeyond.com/species/2058822-vermin-kin#Vermin-kinRaceDetails",
];

export default function SpeciesHierarchyEnhancer() {
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

    SPECIES_WITH_SUBRACES.forEach((href) => {
      const anchor = article.querySelector<HTMLAnchorElement>(
        `a[href="${href}"]`,
      );

      if (!anchor) {
        return;
      }

      const parentParagraph = anchor.closest("p");
      let nextSibling =
        parentParagraph?.nextElementSibling as HTMLElement | null;
      const groupedNodes: HTMLElement[] = [];

      while (nextSibling?.dataset.homebrewAutomation) {
        groupedNodes.push(nextSibling);
        nextSibling = nextSibling.nextElementSibling as HTMLElement | null;
      }

      const nextList = nextSibling;

      if (
        !parentParagraph ||
        !nextList ||
        nextList.tagName !== "UL" ||
        parentParagraph.parentElement?.classList.contains(styles.group)
      ) {
        return;
      }

      parentParagraph.classList.add(styles.groupLink);
      nextList.classList.add(styles.groupList);

      const wrapper = document.createElement("div");
      wrapper.className = styles.group;
      parentParagraph.parentElement?.insertBefore(wrapper, parentParagraph);
      wrapper.appendChild(parentParagraph);
      groupedNodes.forEach((node) => {
        wrapper.appendChild(node);
      });
      wrapper.appendChild(nextList);
    });
  }, []);

  return <span ref={markerRef} />;
}
