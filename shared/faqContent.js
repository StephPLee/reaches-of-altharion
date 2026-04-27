function stripFrontMatter(markdown) {
  if (!markdown.startsWith("---")) {
    return markdown;
  }

  const endIndex = markdown.indexOf("\n---", 3);
  return endIndex === -1 ? markdown : markdown.slice(endIndex + 4);
}

function createCategory(name) {
  return {
    id: name,
    name,
    description: "",
    entries: [],
  };
}

function normalizeMarkdownBlock(lines) {
  return lines.join("\n").trim();
}

function parseFaqMarkdown(markdown) {
  const lines = stripFrontMatter(markdown).split(/\r?\n/);
  const categories = [];
  let currentCategory = null;
  let currentQuestion = null;
  let currentContent = [];

  function flushContent() {
    const content = normalizeMarkdownBlock(currentContent);

    if (currentQuestion && currentCategory) {
      currentCategory.entries.push({
        id: `${currentCategory.id}:${currentQuestion}`,
        question: currentQuestion,
        answer: content || "No answer has been added yet.",
      });
    } else if (currentCategory && content) {
      currentCategory.description = content;
    }

    currentQuestion = null;
    currentContent = [];
  }

  for (const line of lines) {
    const categoryMatch = line.match(/^##\s+(.+?)\s*$/);
    if (categoryMatch) {
      flushContent();
      currentCategory = createCategory(categoryMatch[1].trim());
      categories.push(currentCategory);
      continue;
    }

    const questionMatch = line.match(/^###\s+(.+?)\s*$/);
    if (questionMatch && currentCategory) {
      flushContent();
      currentQuestion = questionMatch[1].trim();
      continue;
    }

    if (currentCategory) {
      currentContent.push(line);
    }
  }

  flushContent();

  return categories.filter(
    (category) => category.description || category.entries.length > 0,
  );
}

module.exports = {
  parseFaqMarkdown,
};
