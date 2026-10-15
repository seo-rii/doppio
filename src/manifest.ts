export type ManifestAttributes = {[name: string]: string};

export interface Manifest {
  mainAttributes: ManifestAttributes;
  entries: {name: string; attributes: ManifestAttributes}[];
}

/** Parse sections and unfold bytes before decoding UTF-8 attribute values. */
export function parseManifest(input: Buffer | string): Manifest {
  var bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input,
    lines: Buffer[] = [], start = 0;
  for (var i = 0; i < bytes.length; i++) {
    if (bytes[i] === 10 || bytes[i] === 13) {
      lines.push(bytes.slice(start, i));
      if (bytes[i] === 13 && bytes[i + 1] === 10) i++;
      start = i + 1;
    }
  }
  if (start < bytes.length) lines.push(bytes.slice(start));

  var mainAttributes: ManifestAttributes = Object.create(null),
    sections: ManifestAttributes[] = [mainAttributes],
    attributes = mainAttributes,
    currentName: string = null,
    currentValue: Buffer[] = [],
    sectionEnded = false;
  var finishAttribute = (): void => {
    if (currentName !== null) {
      attributes[currentName] = Buffer.concat(currentValue).toString('utf8');
      currentName = null;
      currentValue = [];
    }
  };
  lines.forEach((line) => {
    if (line.length === 0) {
      finishAttribute();
      sectionEnded = true;
    } else if (line[0] === 32) {
      if (currentName === null) throw new Error('Invalid manifest continuation line.');
      currentValue.push(line.slice(1));
    } else {
      finishAttribute();
      if (sectionEnded) {
        attributes = Object.create(null);
        sections.push(attributes);
      }
      var separator = line.indexOf(58),
        name = separator < 0 ? '' : line.toString('utf8', 0, separator);
      if (!/^[A-Za-z0-9_-]{1,70}$/.test(name) || line[separator + 1] !== 32) {
        throw new Error('Invalid manifest header.');
      }
      currentName = name.toLowerCase();
      // Only the first header after a section boundary needs this check.
      if (sectionEnded && currentName !== 'name') {
        throw new Error('Manifest entry section must begin with Name.');
      }
      sectionEnded = false;
      currentValue = [line.slice(separator + 2)];
    }
  });
  finishAttribute();
  return {mainAttributes, entries: sections.slice(1).map((entry) => ({name: entry['name'], attributes: entry}))};
}
