import SpeciesDirectory from "./SpeciesDirectory";

export default function FeatsDirectory() {
  return (
    <SpeciesDirectory
      section="feats"
      nounSingular="Feat"
      nounPlural="feats"
      addRootLabel="Add Feat"
      addChildLabel="Add Sub-Feat"
      searchLabel="Search feats"
      searchPlaceholder="Search by feat name, type, source, or keyword"
      searchHint="Search filters by feat names."
      emptyText="No feats listed yet."
      linkPlaceholder="https://www.dndbeyond.com/feats/..."
    />
  );
}
