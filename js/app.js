/**
 * TES Quiz — Application Logic
 *
 * Dependencies (loaded via CDN in index.html):
 *   - js-yaml  4.x  (window.jsyaml)
 *   - jsPDF    2.x  (window.jspdf.jsPDF)
 */

/* global jsyaml */
const { jsPDF } = window.jspdf;

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------
let appConfig  = {};   // config/config.yaml
let questions  = [];   // config/questions.yaml → .questions[]
let verticals  = [];   // config/scoring.yaml  → .verticals[]

let currentIdx = 0;
let answers    = {};   // { questionId: numericValue }
let userName   = '';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);

async function init() {
    const loadingEl = document.getElementById('loading');
    try {
        await loadData();
        applyConfig();
        showScreen('welcome');
        loadingEl.classList.add('hidden');
    } catch (err) {
        loadingEl.innerHTML = `
            <div class="error-message">
                <h2>Failed to Load Assessment</h2>
                <p>${escHtml(err.message)}</p>
                <p>Please verify that the <code>config/</code> YAML files are accessible.</p>
            </div>`;
        console.error(err);
    }
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
async function loadData() {
    const load = async (path) => {
        const r = await fetch(path);
        if (!r.ok) throw new Error(`Cannot load ${path} (HTTP ${r.status})`);
        return r.text();
    };

    const [cfgTxt, qTxt, sTxt] = await Promise.all([
        load('./config/config.yaml'),
        load('./config/questions.yaml'),
        load('./config/scoring.yaml'),
    ]);

    appConfig = jsyaml.load(cfgTxt)   || {};
    const qData = jsyaml.load(qTxt)   || {};
    const sData = jsyaml.load(sTxt)   || {};

    questions = qData.questions || [];
    verticals = sData.verticals || [];
}

// ---------------------------------------------------------------------------
// Page configuration
// ---------------------------------------------------------------------------
function applyConfig() {
    document.title = appConfig.title || 'Assessment Quiz';

    document.getElementById('welcome-screen').innerHTML = `
        <div class="card">
            <div class="welcome-header">
                <h1 class="app-title">${escHtml(appConfig.title || 'Assessment Quiz')}</h1>
                ${appConfig.subtitle
                    ? `<p class="app-subtitle">${escHtml(appConfig.subtitle)}</p>`
                    : ''}
            </div>
            ${appConfig.description
                ? `<p class="app-description">${escHtml(appConfig.description)}</p>`
                : ''}
            <div class="form-group">
                <label for="user-name">
                    Your Name <span class="optional">(optional)</span>
                </label>
                <input type="text" id="user-name"
                       placeholder="Enter your name"
                       autocomplete="name"
                       onkeydown="if(event.key==='Enter') startQuiz()">
            </div>
            <button class="btn btn-primary btn-full" onclick="startQuiz()">
                ${escHtml(appConfig.welcome_button || 'Start Assessment')}
            </button>
        </div>`;
}

// ---------------------------------------------------------------------------
// Screen management
// ---------------------------------------------------------------------------
function showScreen(name) {
    document.querySelectorAll('.screen')
            .forEach(el => el.classList.add('hidden'));
    document.getElementById(`${name}-screen`).classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Quiz flow
// ---------------------------------------------------------------------------
function startQuiz() {
    const nameInput = document.getElementById('user-name');
    userName   = nameInput ? nameInput.value.trim() : '';
    currentIdx = 0;
    answers    = {};
    renderQuestion(0);
    showScreen('quiz');
}

function renderQuestion(idx) {
    const q        = questions[idx];
    const pct      = Math.round((idx / questions.length) * 100);
    const selected = answers[q.id];
    const isLast   = idx === questions.length - 1;

    document.getElementById('quiz-screen').innerHTML = `
        <div class="card">
            <div class="progress-header">
                <span class="question-counter">Question ${idx + 1} of ${questions.length}</span>
                <span class="progress-pct">${pct}%</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill" style="width:${pct}%"></div>
            </div>

            <p class="question-text">${escHtml(q.text)}</p>

            <div class="options-list">
                ${q.options.map((opt, i) => `
                    <button class="option-btn${selected === opt.value ? ' selected' : ''}"
                            onclick="selectOption('${escAttr(String(q.id))}', ${Number(opt.value)}, this)"
                            data-value="${Number(opt.value)}">
                        <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="option-text">${escHtml(opt.text)}</span>
                    </button>`).join('')}
            </div>

            <div class="nav-buttons">
                <button class="btn btn-secondary"
                        onclick="prevQuestion()"
                        ${idx === 0 ? 'disabled' : ''}>
                    ← Previous
                </button>
                ${isLast
                    ? `<button class="btn btn-success" id="action-btn"
                               onclick="finishQuiz()"
                               ${selected === undefined ? 'disabled' : ''}>
                           View Results ✓
                       </button>`
                    : `<button class="btn btn-primary" id="action-btn"
                               onclick="nextQuestion()"
                               ${selected === undefined ? 'disabled' : ''}>
                           Next →
                       </button>`}
            </div>
        </div>`;
}

function selectOption(questionId, value, clickedBtn) {
    answers[questionId] = value;

    clickedBtn.closest('.options-list')
              .querySelectorAll('.option-btn')
              .forEach(b => b.classList.remove('selected'));
    clickedBtn.classList.add('selected');

    const actionBtn = document.getElementById('action-btn');
    if (actionBtn) actionBtn.disabled = false;
}

function nextQuestion() {
    if (currentIdx < questions.length - 1) {
        currentIdx++;
        renderQuestion(currentIdx);
    }
}

function prevQuestion() {
    if (currentIdx > 0) {
        currentIdx--;
        renderQuestion(currentIdx);
    }
}

function finishQuiz() {
    showScreen('results');
    renderResults(calcScores());
}

function restartQuiz() {
    answers    = {};
    currentIdx = 0;
    showScreen('welcome');
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function calcScores() {
    const scores = {};
    verticals.forEach(v => { scores[v.id] = 0; });

    questions.forEach(q => {
        const ans = answers[q.id];
        if (ans !== undefined && q.vertical !== undefined &&
            scores[q.vertical] !== undefined) {
            scores[q.vertical] += ans;
        }
    });

    return scores;
}

function getLevel(vertical, score) {
    const levels = vertical.levels || [];
    for (const lv of levels) {
        if (score >= lv.min && score <= lv.max) return lv;
    }
    return levels[levels.length - 1] || { label: 'N/A', description: '' };
}

function levelClass(label) {
    const l = (label || '').toLowerCase();
    if (/begin|develop|emerg|basic|found/.test(l))  return 'level-low';
    if (/profic|advanc|expert|master|excel/.test(l)) return 'level-high';
    return 'level-mid';
}

// ---------------------------------------------------------------------------
// Results rendering
// ---------------------------------------------------------------------------
function renderResults(scores) {
    const vertHTML = verticals.map(v => {
        const score   = scores[v.id] || 0;
        const max     = v.max_score  || 1;
        const lv      = getLevel(v, score);
        const pct     = Math.min(Math.round((score / max) * 100), 100);
        const cls     = levelClass(lv.label);

        return `
            <div class="vertical-card">
                <div class="vertical-header">
                    <span class="vertical-name">${escHtml(v.name)}</span>
                    <span class="level-badge ${cls}">${escHtml(lv.label)}</span>
                </div>
                <div class="score-track">
                    <div class="score-fill ${cls}" style="width:${pct}%"></div>
                </div>
                <div class="score-meta">
                    <span>${score} / ${max} pts</span>
                    <span>${pct}%</span>
                </div>
                ${lv.description
                    ? `<p class="level-description">${escHtml(lv.description)}</p>`
                    : ''}
            </div>`;
    }).join('');

    const dateStr = new Date().toLocaleDateString('en-US',
        { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('results-screen').innerHTML = `
        <div class="card">
            <div class="results-header">
                <h1>${escHtml(appConfig.results_title || 'Your Results')}</h1>
                ${userName
                    ? `<p class="candidate-name">
                           Assessment for: <strong>${escHtml(userName)}</strong>
                       </p>`
                    : ''}
                <p class="assessment-date">${dateStr}</p>
            </div>

            <div class="verticals-container">${vertHTML}</div>

            ${appConfig.footer
                ? `<p class="results-footer">${escHtml(appConfig.footer)}</p>`
                : ''}

            <div class="results-actions">
                <button class="btn btn-secondary" onclick="restartQuiz()">
                    ↺ Retake
                </button>
                <button class="btn btn-primary" onclick="generatePDF()">
                    ${escHtml(appConfig.pdf_button || '📄 Download PDF Report')}
                </button>
            </div>
        </div>`;
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------
function generatePDF() {
    const scores    = calcScores();
    const doc       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW        = doc.internal.pageSize.getWidth();
    const PH        = doc.internal.pageSize.getHeight();
    const M         = 20;   // margin
    const CW        = PW - M * 2;
    let   y         = 0;

    // ── Header band ────────────────────────────────────────────────────────
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, PW, 46, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(appConfig.title || 'Assessment Results', PW / 2, 18, { align: 'center' });

    if (appConfig.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(appConfig.subtitle, PW / 2, 28, { align: 'center' });
    }

    doc.setFontSize(9);
    const dateStr = new Date().toLocaleDateString('en-US',
        { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated: ${dateStr}`, PW / 2, 40, { align: 'center' });

    y = 56;

    // ── Candidate name ──────────────────────────────────────────────────────
    if (userName) {
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(`Candidate: ${userName}`, M, y);
        y += 10;
    }

    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.4);
    doc.line(M, y, PW - M, y);
    y += 9;

    // ── Vertical results ────────────────────────────────────────────────────
    verticals.forEach((v, idx) => {
        if (y > PH - 55) { doc.addPage(); y = M; }

        const score = scores[v.id] || 0;
        const max   = v.max_score  || 1;
        const lv    = getLevel(v, score);
        const pct   = Math.min(Math.round((score / max) * 100), 100);
        const color = levelRgb(lv.label);

        // Vertical title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text(v.name, M, y);
        y += 7;

        // Score line
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Score: ${score} / ${max} pts  (${pct}%)`, M, y);
        y += 6;

        // Level pill
        doc.setFillColor(...color);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const pillTxt = `Level: ${lv.label}`;
        const pillW   = doc.getTextWidth(pillTxt) + 8;
        doc.roundedRect(M, y - 4, pillW, 7, 2, 2, 'F');
        doc.text(pillTxt, M + 4, y + 1);
        y += 11;

        // Progress bar (background + fill)
        doc.setFillColor(225, 225, 225);
        doc.roundedRect(M, y, CW, 6, 2, 2, 'F');
        if (pct > 0) {
            doc.setFillColor(...color);
            doc.roundedRect(M, y, CW * (pct / 100), 6, 2, 2, 'F');
        }
        y += 12;

        // Level description
        if (lv.description) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.setTextColor(90, 90, 90);
            const lines = doc.splitTextToSize(lv.description, CW);
            doc.text(lines, M, y);
            y += lines.length * 5 + 3;
        }

        // Divider between verticals
        if (idx < verticals.length - 1) {
            doc.setDrawColor(225, 225, 225);
            doc.line(M, y, PW - M, y);
            y += 8;
        }
    });

    // ── Footer ──────────────────────────────────────────────────────────────
    if (appConfig.footer) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(appConfig.footer, PW / 2, PH - 12, { align: 'center' });
    }

    // Page border
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.8);
    doc.rect(4, 4, PW - 8, PH - 8);

    // Save
    const safe = userName
        ? userName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').slice(0, 40)
        : '';
    doc.save(safe ? `assessment_${safe}.pdf` : 'assessment_results.pdf');
}

/** Return [r, g, b] based on level label keywords */
function levelRgb(label) {
    const l = (label || '').toLowerCase();
    if (/begin|develop|emerg|basic|found/.test(l))  return [192, 57, 43];   // red
    if (/profic|advanc|expert|master|excel/.test(l)) return [30, 132, 73];  // green
    return [211, 84, 0]; // orange (mid/default)
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

function escAttr(str) {
    return escHtml(str).replace(/`/g, '&#96;');
}
