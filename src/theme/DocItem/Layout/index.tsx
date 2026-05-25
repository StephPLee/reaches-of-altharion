import type { ReactNode } from "react";
import { useDoc } from "@docusaurus/plugin-content-docs/client";
import DocVersionBanner from "@theme/DocVersionBanner";
import DocVersionBadge from "@theme/DocVersionBadge";
import DocItemFooter from "@theme/DocItem/Footer";
import DocItemContent from "@theme/DocItem/Content";
import DocItemPaginator from "@theme/DocItem/Paginator";
import ContentVisibility from "@theme/ContentVisibility";

export default function DocItemLayout({ children }: { children: ReactNode }): ReactNode {
  const { metadata } = useDoc();
  return (
    <div className="row">
      <div className="col col--12">
        <ContentVisibility metadata={metadata} />
        <DocVersionBanner />
        <article>
          <DocVersionBadge />
          <DocItemContent>{children}</DocItemContent>
          <DocItemFooter />
        </article>
        <DocItemPaginator />
      </div>
    </div>
  );
}
