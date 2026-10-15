import * as path from 'path';
import * as fs from 'fs';
import {ManifestAttributes, parseManifest} from './manifest';

/** Metadata for an unpacked JAR; attributes refer to the manifest main section. */
export default class JAR {
  private attributes: ManifestAttributes = Object.create(null);
  private classpath: string[] = [];

  constructor(dir: string, doneCb: (err?: Error) => void) {
    fs.readFile(path.resolve(dir, 'META-INF/MANIFEST.MF'), (err, data) => {
      if (err) return doneCb(err);
      try {
        this.attributes = parseManifest(data).mainAttributes;
        var classpath = this.attributes['class-path'];
        if (classpath !== undefined) {
          // Manifest Class-Path entries are URLs, including directories and
          // archives without a .jar suffix. Resolution belongs to the loader.
          this.classpath = classpath.split(/ +/).filter((entry) => entry.length > 0);
        }
      } catch (error) {
        return doneCb(error);
      }
      doneCb();
    });
  }

  public getClassPath(): string[] {
    return this.classpath.slice(0);
  }

  public getAttribute(attribute: string): string {
    return this.attributes[attribute.toLowerCase()];
  }

  public toString(): string {
    return JSON.stringify(this.attributes);
  }
}
