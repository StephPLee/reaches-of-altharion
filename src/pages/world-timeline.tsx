import type { ReactNode } from "react";
import Layout from "@theme/Layout";

import Timeline from "../components/worldWiki/Timeline";

export default function WorldTimelinePage(): ReactNode {
  return (
    <Layout title="Timeline" description="An interactive timeline of Altharion's history.">
      <Timeline />
    </Layout>
  );
}
