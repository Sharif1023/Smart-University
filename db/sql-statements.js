export function parseSqlStatements(source) {
  const statements = [];
  let delimiter = ";";
  let pending = "";
  let quote = null;
  let blockComment = false;

  for (const line of source.split(/\r?\n/)) {
    const command = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line);
    if (!pending.trim() && !quote && !blockComment && command) {
      delimiter = command[1];
      continue;
    }

    for (let i = 0; i < line.length; ) {
      const char = line[i];
      const next = line[i + 1];

      if (blockComment) {
        if (char === "*" && next === "/") {
          blockComment = false;
          i += 2;
        } else i += 1;
        continue;
      }

      if (quote) {
        pending += char;
        if (char === "\\" && i + 1 < line.length) {
          pending += line[i + 1];
          i += 2;
          continue;
        }
        if (char === quote) {
          if (next === quote) {
            pending += next;
            i += 2;
            continue;
          }
          quote = null;
        }
        i += 1;
        continue;
      }

      if (
        char === "#" ||
        (char === "-" &&
          next === "-" &&
          (line[i + 2] === undefined || /\s/.test(line[i + 2])))
      )
        break;
      if (char === "/" && next === "*") {
        blockComment = true;
        i += 2;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") {
        quote = char;
        pending += char;
        i += 1;
        continue;
      }
      if (line.startsWith(delimiter, i)) {
        if (pending.trim()) statements.push(pending.trim());
        pending = "";
        i += delimiter.length;
        continue;
      }

      pending += char;
      i += 1;
    }
    pending += "\n";
  }

  if (pending.trim()) statements.push(pending.trim());
  return statements;
}
