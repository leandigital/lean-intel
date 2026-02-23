/**
 * Mock for marked ESM module
 */

class Renderer {
  code({ text, lang }) {
    return `<pre><code class="language-${lang || 'plaintext'}">${text}</code></pre>`;
  }
}

const marked = {
  parse: (markdown) => {
    // Simple mock transformation
    let html = markdown;

    // Headers
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
    });

    // Paragraphs (simple)
    html = html.replace(/^([^<\n].+)$/gm, '<p>$1</p>');

    return html;
  },
  setOptions: () => {},
  use: () => {},
  Renderer: Renderer,
};

module.exports = {
  marked,
  Renderer,
};
