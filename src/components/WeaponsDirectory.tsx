import SubclassesDirectory from "./SubclassesDirectory";

export default function WeaponsDirectory() {
  return (
    <SubclassesDirectory
      section="weapons"
      nounSingular="Weapon"
      nounPlural="weapons"
      searchLabel="Search weapons"
      searchPlaceholder="Search by weapon name, rarity, type, property, or keyword"
      searchHint="Search filters by heading and linked weapon names."
      emptyText="No weapons listed yet."
      linkPlaceholder="https://www.dndbeyond.com/magic-items/..."
    />
  );
}
