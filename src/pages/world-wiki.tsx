import type { ReactNode } from "react";
import { useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";

import WorldWikiIndex from "../components/worldWiki/WorldWikiIndex";
import WorldWikiArticle from "../components/worldWiki/WorldWikiArticle";

export default function WorldWikiPage(): ReactNode {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const isCreateMode = params.get("new") === "1";

  return (
    <Layout title="World Wiki" description="Lore, locations, and factions of Altharion.">
      {slug || isCreateMode ? (
        <WorldWikiArticle slug={isCreateMode ? null : slug} />
      ) : (
        <WorldWikiIndex />
      )}
    </Layout>
  );
}
