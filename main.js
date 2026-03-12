function jsToJSON(input) {
    const fixes = [];
    let src = input.trim();

    const vm = src.match(/^(?:const|let|var)\s+\w+\s*=\s*([\s\S]*)$/);
    if (vm) {
        src = vm[1].trim();
        fixes.push({ type: 'info', msg: 'Stripped variable declaration' });
    }

    if (src.endsWith(';')) {
        src = src.slice(0, -1).trim();
        fixes.push({ type: 'info', msg: 'Removed trailing semicolon' });
    }

    let b = src;
    src = src.replace(
        /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\/[^\n]*/g,
        (m, s) => s || ''
    );
    if (src !== b) fixes.push({ type: 'warn', msg: 'Removed // comments' });

    b = src;
    src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    if (src !== b) fixes.push({ type: 'warn', msg: 'Removed /* */ comments' });

    b = src;
    src = src.replace(/`([^`]*)`/g, (_, c) =>
        '"' + c.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
    );
    if (src !== b) fixes.push({ type: 'warn', msg: 'Converted template literals' });

    b = src;
    src = src.replace(/'((?:[^'\\]|\\.)*)'/g, (_, c) =>
        '"' + c.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\'/g, "'") + '"'
    );
    if (src !== b) fixes.push({ type: 'warn', msg: "Single quotes → double quotes" });

    b = src;
    src = src.replace(
        /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g,
        (m, p, k, s) => `${p}"${k}"${s}`
    );
    if (src !== b) fixes.push({ type: 'ok', msg: 'Quoted unquoted keys' });

    b = src;
    src = src.replace(/,(\s*[}\]])/g, '$1');
    if (src !== b) fixes.push({ type: 'warn', msg: 'Removed trailing commas' });

    b = src;
    src = src.replace(/:\s*undefined\b/g, ': null');
    if (src !== b) fixes.push({ type: 'err', msg: 'undefined → null' });

    b = src;
    src = src.replace(/:\s*function\s*\([^)]*\)\s*\{[^}]*\}/g, ': null');
    src = src.replace(/:\s*\([^)]*\)\s*=>[^,\n}]*/g, ': null');
    src = src.replace(/:\s*\w+\s*=>[^,\n}]*/g, ': null');
    if (src !== b) fixes.push({ type: 'err', msg: 'Functions → null' });

    b = src;
    src = src.replace(/:\s*-?Infinity\b/g, ': null').replace(/:\s*NaN\b/g, ': null');
    if (src !== b) fixes.push({ type: 'err', msg: 'Infinity / NaN → null' });

    let parsed;
    try {
        parsed = JSON.parse(src);
    } catch (e) {
        return { success: false, error: e.message, fixes };
    }

    return { success: true, output: JSON.stringify(parsed, null, 2), parsed, fixes };
}


function jsonToJS(input) {
    const fixes = [];
    let parsed;

    try {
        parsed = JSON.parse(input.trim());
    } catch (e) {
        return { success: false, error: e.message, fixes };
    }

    fixes.push({ type: 'ok', msg: 'Valid JSON parsed' });

    function toJS(val, depth) {
        const pad = '  '.repeat(depth);
        const innerPad = '  '.repeat(depth + 1);

        if (val === null) return 'null';
        if (typeof val === 'boolean' || typeof val === 'number') return String(val);
        if (typeof val === 'string') {
            return "'" + val.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
        }

        if (Array.isArray(val)) {
            if (!val.length) return '[]';
            const items = val.map(v => innerPad + toJS(v, depth + 1));
            return '[\n' + items.join(',\n') + ',\n' + pad + ']';
        }

        const keys = Object.keys(val);
        if (!keys.length) return '{}';

        const lines = keys.map(k => {
            const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : "'" + k + "'";
            return innerPad + safeKey + ': ' + toJS(val[k], depth + 1);
        });

        return '{\n' + lines.join(',\n') + ',\n' + pad + '}';
    }

    fixes.push({ type: 'info', msg: 'Keys unquoted' });
    fixes.push({ type: 'info', msg: 'Strings → single quotes' });

    const output = 'const data = ' + toJS(parsed, 0) + ';';
    return { success: true, output, parsed, fixes };
}


function hlJSON(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="tok-key">$1</span>:')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="tok-str">$1</span>')
        .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="tok-num">$1</span>')
        .replace(/:\s*(true|false)/g, ': <span class="tok-bool">$1</span>')
        .replace(/:\s*(null)/g, ': <span class="tok-null">$1</span>');
}

function hlJS(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^(const|let|var)(\s)/gm, '<span class="tok-kw">$1</span>$2')
        .replace(/(\n\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1<span class="tok-key">$2</span>$3')
        .replace(/:\s*'((?:[^'\\]|\\.)*)'/g, ": <span class=\"tok-str\">'$1'</span>")
        .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="tok-num">$1</span>')
        .replace(/:\s*(true|false)\b/g, ': <span class="tok-bool">$1</span>')
        .replace(/:\s*(null)\b/g, ': <span class="tok-null">$1</span>');
}


let isFlipped = false;
let lastResult = null;
let timer = null;
let toastTimer = null;


const $ = id => document.getElementById(id);

const inputArea    = $('inputArea');
const outputArea   = $('outputArea');
const inputStatus  = $('inputStatus');
const outputStatus = $('outputStatus');
const fixesBar     = $('fixesBar');
const bottomMeta   = $('bottomMeta');
const swapBtn      = $('swapBtn');
const leftLabel    = $('leftLabel');
const rightLabel   = $('rightLabel');
const titleText    = $('titleText');
const convertBtn   = $('convertBtn');


function renderFixes(fixes) {
    fixesBar.innerHTML = '<span class="fixes-label">Fixes</span>';

    if (!fixes.length) {
        const el = document.createElement('span');
        el.className = 'empty-text';
        el.textContent = '— none applied —';
        fixesBar.appendChild(el);
        return;
    }

    fixes.forEach(f => {
        const tag = document.createElement('span');
        tag.className = 'fix-tag fix-' + f.type;
        tag.textContent = f.msg;
        fixesBar.appendChild(tag);
    });
}

function showEmpty() {
    outputArea.innerHTML = `
        <div class="empty">
            <div class="empty-sym">{}</div>
            <div class="empty-txt">Output will appear here</div>
            <div class="empty-hint">type or paste on the left</div>
        </div>
    `;
}


function convert() {
    const raw = inputArea.value.trim();

    if (!raw) {
        lastResult = null;
        showEmpty();
        inputStatus.textContent = 'Ready';
        inputStatus.className = 'status-pill pill-neutral';
        outputStatus.textContent = 'Waiting';
        outputStatus.className = 'status-pill pill-neutral';
        renderFixes([]);
        bottomMeta.textContent = '—';
        return;
    }

    const result = isFlipped ? jsonToJS(raw) : jsToJSON(raw);
    lastResult = result;
    renderFixes(result.fixes || []);

    if (result.success) {
        inputStatus.textContent = '✓ Parsed';
        inputStatus.className = 'status-pill pill-ok';
        outputStatus.textContent = isFlipped ? '✓ JS Object' : '✓ Valid JSON';
        outputStatus.className = 'status-pill pill-ok';
        outputArea.innerHTML = '<span>' + (isFlipped ? hlJS(result.output) : hlJSON(result.output)) + '</span>';
        bottomMeta.textContent = result.output.split('\n').length + ' lines · ' + new Blob([result.output]).size + ' bytes';
    } else {
        inputStatus.textContent = '⚠ Check input';
        inputStatus.className = 'status-pill pill-warn';
        outputStatus.textContent = '✗ Failed';
        outputStatus.className = 'status-pill pill-err';
        outputArea.innerHTML = `
            <div class="err-block">
                <div class="err-title">⚠ Parse Error</div>
                <div class="err-msg">${result.error}</div>
            </div>
        `;
        bottomMeta.textContent = '—';
    }
}


swapBtn.addEventListener('click', () => {
    isFlipped = !isFlipped;

    swapBtn.classList.toggle('flipped', isFlipped);

    titleText.innerHTML = isFlipped
        ? 'JSON <span class="arrow">→</span> JS'
        : 'JS <span class="arrow">→</span> JSON';

    leftLabel.textContent  = isFlipped ? 'Valid JSON'        : 'JavaScript Object';
    rightLabel.textContent = isFlipped ? 'JavaScript Object' : 'Valid JSON';

    convertBtn.textContent = isFlipped ? '← Convert' : 'Convert →';

    inputArea.placeholder = isFlipped
        ? `// Paste valid JSON here — converts to a JS object\n\n{\n  "name": "my-app",\n  "version": "1.0.0",\n  "debug": false,\n  "port": 3000,\n  "tags": ["web", "api"]\n}`
        : `// Paste your JS object here\n// Unquoted keys, single quotes, trailing commas — all fine!\n\nconst config = {\n  name: 'my-app',\n  version: '1.0.0',\n  debug: false,\n  port: 3000,\n  tags: ['web', 'api',],\n  author: {\n    name: 'Dev',\n    email: 'dev@example.com',\n  },\n}`;

    inputArea.value = '';
    inputArea.focus();
    convert();

    toast(isFlipped ? '⇄ Mode: JSON → JS Object' : '⇄ Mode: JS → JSON');
});


inputArea.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(convert, 280);
});

convertBtn.addEventListener('click', convert);

$('clearBtn').addEventListener('click', () => {
    inputArea.value = '';
    convert();
});

$('copyBtn').addEventListener('click', () => {
    if (!lastResult?.success) {
        toast('Nothing to copy');
        return;
    }
    navigator.clipboard.writeText(lastResult.output).then(() => toast('✓ Copied!'));
});


function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}


convert();