import { useMemo, useState } from "react";

import styles from "./SourcebooksTables.module.css";

type SourcebookRow = {
  title: string;
  publisher: string;
  type: string;
  edition: string;
};

const NOT_ALLOWED_BOOKS: SourcebookRow[] = [
  {
    title: "Book of Ebon Tides",
    publisher: "Kobold Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Races and Dark Bargains",
    publisher: "Ghostfire Gaming",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Iron Hero Feat",
    publisher: "Third-party",
    type: "Partnered / homebrew feat",
    edition: "5e",
  },
  {
    title: "Obojima: Tales from the Tall Grass consumables",
    publisher: "1985 Games",
    type: "Partnered item content",
    edition: "5e",
  },
  {
    title: "Dungeons & Dragons vs. Rick and Morty",
    publisher: "Wizards of the Coast",
    type: "Boxed adventure product",
    edition: "5e",
  },
  {
    title: "The Lord of the Rings Roleplaying",
    publisher: "Free League",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "The Pugilist Class",
    publisher: "Third-party",
    type: "Partnered class",
    edition: "5e / 5.5e",
  },
];

const ALLOWED_BOOKS: SourcebookRow[] = [
  {
    title: "Basic Rules (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Elemental Evil Player's Companion",
    publisher: "Wizards of the Coast",
    type: "Player supplement",
    edition: "5e",
  },
  {
    title: "Player's Handbook (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Dungeon Master's Guide (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Monster Manual (2014)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5e",
  },
  {
    title: "Sword Coast Adventurer's Guide",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Xanathar's Guide to Everything",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Volo's Guide to Monsters",
    publisher: "Wizards of the Coast",
    type: "Monsters / lore",
    edition: "5e",
  },
  {
    title: "Mordenkainen's Tome of Foes",
    publisher: "Wizards of the Coast",
    type: "Monsters / lore",
    edition: "5e",
  },
  {
    title: "Guildmasters' Guide to Ravnica",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Acquisitions Incorporated",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Eberron: Rising from the Last War",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Explorer's Guide to Wildemount",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Mythic Odysseys of Theros",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Tasha's Cauldron of Everything",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Van Richten's Guide to Ravenloft",
    publisher: "Wizards of the Coast",
    type: "Setting / monsters",
    edition: "5e",
  },
  {
    title: "Fizban's Treasury of Dragons",
    publisher: "Wizards of the Coast",
    type: "Rules / monsters",
    edition: "5e",
  },
  {
    title: "Strixhaven: A Curriculum of Chaos",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5e",
  },
  {
    title: "Mordenkainen Presents: Monsters of the Multiverse",
    publisher: "Wizards of the Coast",
    type: "Rules / monsters",
    edition: "5e",
  },
  {
    title: "Spelljammer: Adventures in Space",
    publisher: "Wizards of the Coast",
    type: "Setting / rules set",
    edition: "5e",
  },
  {
    title: "Bigby Presents: Glory of the Giants",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Planescape: Adventures in the Multiverse",
    publisher: "Wizards of the Coast",
    type: "Setting / rules set",
    edition: "5e",
  },
  {
    title: "The Book of Many Things",
    publisher: "Wizards of the Coast",
    type: "Rules expansion",
    edition: "5e",
  },
  {
    title: "Player's Handbook (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Dungeon Master's Guide (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Monster Manual (2024)",
    publisher: "Wizards of the Coast",
    type: "Core rules",
    edition: "5.5e",
  },
  {
    title: "Eberron: Forge of the Artificer",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5.5e",
  },
  {
    title: "Heroes of Faerun",
    publisher: "Wizards of the Coast",
    type: "Setting / player options",
    edition: "5.5e",
  },
  {
    title: "Adventures in Faerun",
    publisher: "Wizards of the Coast",
    type: "Setting / rules support",
    edition: "5.5e",
  },
  {
    title: "Tal'Dorei Campaign Setting Reborn",
    publisher: "Darrington Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "Dungeons of Drakkenheim",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Sebastian Crowe's Guide to Drakkenheim",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting / player options",
    edition: "5e",
  },
  {
    title: "Humblewood Campaign Setting",
    publisher: "Hit Point Press",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Humblewood Tales",
    publisher: "Hit Point Press",
    type: "Partnered supplement",
    edition: "Mixed",
  },
  {
    title: "Tome of Beasts 1",
    publisher: "Kobold Press",
    type: "Partnered monster book",
    edition: "5e",
  },
  {
    title: "Flee, Mortals!",
    publisher: "MCDM",
    type: "Partnered monster book",
    edition: "5e",
  },
  {
    title: "Where Evil Lives",
    publisher: "MCDM",
    type: "Partnered encounter / monster book",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Player Pack",
    publisher: "Ghostfire Gaming",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Grim Hollow: Player's Guide",
    publisher: "Ghostfire Gaming",
    type: "Partnered sourcebook",
    edition: "5.5e",
  },
  {
    title: "Grim Hollow: Campaign Guide",
    publisher: "Ghostfire Gaming",
    type: "Partnered setting book",
    edition: "5.5e",
  },
  {
    title: "Tales from the Shadows",
    publisher: "Kobold Press",
    type: "Partnered sourcebook",
    edition: "5e",
  },
  {
    title: "The Illrigger Revised",
    publisher: "MCDM",
    type: "Partnered class",
    edition: "5e",
  },
  {
    title: "The Griffon's Saddlebag: Book Two",
    publisher: "The Griffon's Saddlebag",
    type: "Partnered item book",
    edition: "5e",
  },
  {
    title: "Heliana's Guide to Monster Hunting: Part 1",
    publisher: "Loot Tavern",
    type: "Partnered sourcebook",
    edition: "Mixed",
  },
  {
    title: "Obojima: Tales from the Tall Grass",
    publisher: "1985 Games",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "Valda's Spire of Secrets: Player Pack",
    publisher: "Mage Hand Press",
    type: "Partnered player options",
    edition: "5e",
  },
  {
    title: "Ruins of Symbaroum: Setting Handbook",
    publisher: "Free League",
    type: "Partnered setting book",
    edition: "5e",
  },
  {
    title: "The Crooked Moon Part One: Player Options & Campaign Setting",
    publisher: "Legends of Avantris",
    type: "Partnered sourcebook",
    edition: "Mixed",
  },
  {
    title: "Exploring Eberron (2024)",
    publisher: "Visionary Creative / Keith Baker",
    type: "Partnered setting book",
    edition: "5.5e",
  },
];

function matchesSearch(row: SourcebookRow, query: string) {
  if (!query) {
    return true;
  }

  const haystack =
    `${row.title} ${row.publisher} ${row.type} ${row.edition}`.toLowerCase();
  return haystack.includes(query);
}

function SourcebookTable({ books }: { books: SourcebookRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Publisher</th>
          <th>Type</th>
          <th>Edition</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.title}>
            <td>{book.title}</td>
            <td>{book.publisher}</td>
            <td>{book.type}</td>
            <td>{book.edition}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function SourcebooksTables() {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const filteredNotAllowed = useMemo(
    () =>
      NOT_ALLOWED_BOOKS.filter((book) => matchesSearch(book, normalizedSearch)),
    [normalizedSearch],
  );

  const filteredAllowed = useMemo(
    () => ALLOWED_BOOKS.filter((book) => matchesSearch(book, normalizedSearch)),
    [normalizedSearch],
  );

  return (
    <>
      <div className={styles.searchPanel}>
        <label className={styles.searchLabel} htmlFor="sourcebooks-search">
          Search sourcebooks
        </label>
        <input
          id="sourcebooks-search"
          className={styles.searchInput}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, publisher, type, or edition"
        />
        <p className={styles.searchHint}>
          The search filters both the not allowed list and the allowed reference
          list.
        </p>
      </div>

      <div className={styles.section}>
        <h2>Not Allowed</h2>
        <p>
          These books, options, or exceptions are not allowed even though
          partnered content is generally permitted.
        </p>
        <p className={styles.count}>
          Showing {filteredNotAllowed.length} of {NOT_ALLOWED_BOOKS.length} not
          allowed entries.
        </p>
        {filteredNotAllowed.length > 0 ? (
          <SourcebookTable books={filteredNotAllowed} />
        ) : (
          <p className={styles.emptyState}>
            No not allowed entries match that search.
          </p>
        )}
      </div>

      <div className={styles.section}>
        <h2>Allowed Reference List</h2>
        <p>
          This list is here as a reference for books players are generally
          allowed to use.
        </p>
        <p className={styles.count}>
          Showing {filteredAllowed.length} of {ALLOWED_BOOKS.length} allowed
          reference entries.
        </p>
        {filteredAllowed.length > 0 ? (
          <SourcebookTable books={filteredAllowed} />
        ) : (
          <p className={styles.emptyState}>
            No allowed entries match that search.
          </p>
        )}
      </div>
    </>
  );
}
