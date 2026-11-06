import SubclassesDirectory from "./SubclassesDirectory";

export default function ItemSetsDirectory() {
  return (
    <SubclassesDirectory
      section="item-sets"
      nounSingular="Set Piece"
      nounPlural="item sets"
      searchLabel="Search item sets"
      searchPlaceholder="Search by set name, item name, rarity, or keyword"
      searchHint="Search filters by set name and linked item names."
      emptyText="No item sets listed yet."
      linkPlaceholder="https://www.dndbeyond.com/magic-items/..."
    />
  );
}
