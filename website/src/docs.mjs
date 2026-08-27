import {marked} from 'marked';
import './site.css';

const documents = {
  guide: {
    title: 'Developer guide',
    path: 'README.md'
  },
  compatibility: {
    title: 'Modern Java compatibility',
    path: 'modern-java.md'
  },
  support: {
    title: 'Support policy',
    path: 'support.md'
  },
  kotlin: {
    title: 'Kotlin compiler design',
    path: 'design/kotlin-compiler.md'
  },
  scala: {
    title: 'Scala compiler design',
    path: 'design/scala-compiler.md'
  },
  invoke: {
    title: 'java.lang.invoke design',
    path: 'design/java-lang-invoke.md'
  },
  records: {
    title: 'Record reflection design',
    path: 'design/record-reflection.md'
  },
  controlflow: {
    title: 'MethodHandle control flow',
    path: 'design/methodhandles-control-flow.md'
  },
  finally: {
    title: 'MethodHandle try/finally',
    path: 'design/methodhandles-try-finally.md'
  },
  toolchain: {
    title: 'TypeScript modernization',
    path: 'design/typescript-dependency-modernization.md'
  }
};

const params = new URLSearchParams(window.location.search);
const pageKey = Object.hasOwn(documents, params.get('page')) ? params.get('page') : 'guide';
const page = documents[pageKey];
const content = document.querySelector('#document-content');
const toc = document.querySelector('#document-toc');

document.title = `${page.title} | Doppio Modern JVM`;
document.querySelectorAll('[data-doc-page]').forEach((link) => {
  if (link.dataset.docPage === pageKey) {
    link.setAttribute('aria-current', 'page');
  }
});

try {
  const response = await fetch(`./${page.path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  content.innerHTML = marked.parse(await response.text(), {
    gfm: true
  });
  content.classList.remove('document-loading');

  const usedIds = new Map();
  const tocLinks = [];
  content.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const baseId = heading.textContent
      .toLowerCase()
      .replace(/[^a-z0-9\u3131-\uD79D]+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
    const count = usedIds.get(baseId) || 0;
    usedIds.set(baseId, count + 1);
    heading.id = count === 0 ? baseId : `${baseId}-${count + 1}`;
    if (heading.tagName !== 'H1') {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.dataset.depth = heading.tagName.slice(1);
      link.textContent = heading.textContent;
      tocLinks.push(link);
    }
  });
  toc.replaceChildren(...tocLinks);

  content.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) {
      return;
    }
    const normalized = new URL(href, new URL(page.path, 'https://docs.local/'));
    if (normalized.pathname.endsWith('.md')) {
      const relativePath = normalized.pathname.slice(1);
      const match = Object.entries(documents).find(([, item]) => item.path === relativePath);
      if (match) {
        link.href = `./docs.html?page=${match[0]}${normalized.hash}`;
      }
    } else {
      link.href = `./${normalized.pathname.slice(1)}${normalized.hash}`;
    }
  });
} catch (error) {
  content.innerHTML = `
    <h1>Document unavailable</h1>
    <p>The Markdown source could not be loaded. ${String(error)}</p>
  `;
}
