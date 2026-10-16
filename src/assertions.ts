import {AssertionDirective, JVMOptions} from './interfaces';

/** Preserve the public legacy options, then apply ordered launcher directives. */
export function assertionDirectives(opts: JVMOptions): AssertionDirective[] {
  const directives: AssertionDirective[] = [
    {scope: 'system', enabled: !!opts.enableSystemAssertions},
    {scope: 'default', enabled: opts.enableAssertions === true}
  ];
  const addTarget = (enabled: boolean, target: string): void => {
    const isPackage = target.slice(-3) === '...';
    directives.push({enabled, scope: isPackage ? 'package' : 'class',
      target: isPackage ? target.slice(0, -3) : target});
  };
  // Preserve the legacy precedence when both lists name the same target.
  (opts.disableAssertions || []).forEach(target => addTarget(false, target));
  if (Array.isArray(opts.enableAssertions)) {
    opts.enableAssertions.forEach(target => addTarget(true, target));
  }
  return directives.concat(opts.assertionDirectives || []);
}

/** A class directive wins over the closest package directive, then the default. */
export function assertionDefault(directives: AssertionDirective[], systemClass: boolean): boolean {
  let enabled = false;
  directives.forEach(directive => {
    if (directive.scope === (systemClass ? 'system' : 'default')) enabled = directive.enabled;
  });
  return enabled;
}

/** Project ordered settings onto the legacy boolean/list introspection API. */
export function legacyAssertionSettings(directives: AssertionDirective[]): {
  enabled: boolean | string[]; disabled: string[];
} {
  const lastTarget: {[key: string]: number} = Object.create(null),
    enabled: string[] = [], disabled: string[] = [];
  directives.forEach((directive, index) => {
    if (directive.scope === 'class' || directive.scope === 'package') {
      lastTarget[directive.scope + ':' + directive.target] = index;
    }
  });
  // Preserve last-occurrence order and keep the public package "..." notation.
  directives.forEach((directive, index) => {
    if (lastTarget[directive.scope + ':' + directive.target] !== index) return;
    const target = directive.target + (directive.scope === 'package' ? '...' : '');
    (directive.enabled ? enabled : disabled).push(target);
  });
  return {enabled: assertionDefault(directives, false) ? true : enabled.length > 0 ? enabled : false,
    disabled};
}

export function assertionStatus(directives: AssertionDirective[], className: string,
                                systemClass: boolean): boolean {
  let classEnabled: boolean = null,
    packageEnabled: boolean = null, packageLength = -1;
  const packageName = className.slice(0, Math.max(0, className.lastIndexOf('.')));
  directives.forEach(directive => {
    switch (directive.scope) {
      case 'class':
        if (directive.target === className) classEnabled = directive.enabled;
        break;
      case 'package': {
        const target = directive.target;
        if (target.length >= packageLength &&
            (packageName === target || (target !== '' && packageName.indexOf(target + '.') === 0))) {
          packageLength = target.length;
          packageEnabled = directive.enabled;
        }
        break;
      }
    }
  });
  return classEnabled !== null ? classEnabled :
    packageEnabled !== null ? packageEnabled : assertionDefault(directives, systemClass);
}
