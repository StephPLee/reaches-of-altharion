import SubclassesDirectory from "./SubclassesDirectory";

export default function WondrousItemsDirectory() {
  return (
    <SubclassesDirectory
      section="wondrous-items"
      nounSingular="Wondrous Item"
      nounPlural="wondrous items"
      searchLabel="Search wondrous items"
      searchPlaceholder="Search by item name, effect, rarity, or keyword"
      searchHint="Search filters by heading and linked wondrous item names."
      emptyText="No wondrous items listed yet."
      linkPlaceholder="https://www.dndbeyond.com/magic-items/..."
    />
  );
}
