import SubclassesDirectory from "./SubclassesDirectory";

export default function FamiliarsDirectory() {
  return (
    <SubclassesDirectory
      section="familiars"
      nounSingular="Creature"
      nounPlural="familiars & monsters"
      searchLabel="Search familiars & monsters"
      searchPlaceholder="Search by creature name, CR, or keyword"
      searchHint="Search filters by CR heading and linked creature names."
      emptyText="No familiars or monsters listed yet."
      linkPlaceholder="https://www.dndbeyond.com/monsters/..."
    />
  );
}
