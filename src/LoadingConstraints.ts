import {ClassData} from './ClassData';
import {ClassLoader} from './ClassLoader';

export interface LoadingConstraintViolation {
  name: string;
  expected: ClassData;
  actual: ClassData;
}

interface ConstraintGroup {
  loaders: Set<ClassLoader>;
  identity: ClassData;
}

/**
 * JVMS 5.3.4 identities for initiating loaders. This registry never loads,
 * links or initializes classes. Reference-array constraints concern their
 * leaf class, not an array mirror. Failed records/merges change no group.
 */
export class LoadingConstraints {
  private names = new Map<string, Map<ClassLoader, ConstraintGroup>>();

  public impose(name: string, left: ClassLoader, right: ClassLoader): LoadingConstraintViolation {
    name = name.replace(/^\[+/, '');
    if (name[0] !== 'L' || left === right) return null;
    var groups = this.names.get(name);
    if (!groups) this.names.set(name, groups = new Map());
    var a = groups.get(left), b = groups.get(right);
    if (a && a === b) return null;
    if (a && b && a.identity !== null && b.identity !== null && a.identity !== b.identity) {
      return {name, expected: a.identity, actual: b.identity};
    }
    if (!a) a = {loaders: new Set([left]), identity: null};
    if (!b) b = {loaders: new Set([right]), identity: null};
    if (a.identity === null) a.identity = b.identity;
    b.loaders.forEach(loader => { a.loaders.add(loader); groups.set(loader, a); });
    a.loaders.forEach(loader => groups.set(loader, a));
    return null;
  }

  public record(loader: ClassLoader, cls: ClassData): LoadingConstraintViolation {
    var name = cls.getInternalName();
    // Component classes are recorded by their own reference load. Traversing
    // an array here would turn passive metadata publication into active work.
    if (name[0] !== 'L') return null;
    var groups = this.names.get(name);
    if (!groups) this.names.set(name, groups = new Map());
    var group = groups.get(loader);
    if (group && group.identity !== null && group.identity !== cls) {
      return {name, expected: group.identity, actual: cls};
    }
    if (!group) groups.set(loader, group = {loaders: new Set([loader]), identity: null});
    group.identity = cls;
    return null;
  }

  /** Parsed field/method descriptors are visited in argument/return order.
   * Successful earlier constraints survive a later conflicting leaf. */
  public imposeDescriptor(descriptor: string, left: ClassLoader, right: ClassLoader): LoadingConstraintViolation {
    var names = descriptor.match(/L[^;]+;/g) || [], seen = new Set<string>();
    for (var i = 0; i < names.length; i++) {
      if (seen.has(names[i])) continue;
      seen.add(names[i]);
      var failure = this.impose(names[i], left, right);
      if (failure !== null) return failure;
    }
    return null;
  }
}

// A bootstrap loader is an actual VM identity, not the Java null loader
// representation. Independent VM instances must never share constraints.
var registries = new WeakMap<ClassLoader, LoadingConstraints>();
export function getLoadingConstraints(loader: ClassLoader): LoadingConstraints {
  var bootstrap = loader.bootstrap || loader, registry = registries.get(bootstrap);
  if (!registry) registries.set(bootstrap, registry = new LoadingConstraints());
  return registry;
}
