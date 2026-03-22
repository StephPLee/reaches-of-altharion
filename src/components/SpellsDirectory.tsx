import SubclassesDirectory from "./SubclassesDirectory";

export default function SpellsDirectory() {
  return (
    <SubclassesDirectory
      section="spells"
      nounSingular="Spell"
      nounPlural="spells"
      searchLabel="Search spells"
      searchPlaceholder="Search by spell name, school, damage type, or keyword"
      searchHint="Search filters by heading and listed spell names."
      emptyText="No spells listed yet."
      linkPlaceholder="https://www.dndbeyond.com/spells/..."
      linkOptional
    />
  );
}
