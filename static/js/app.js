const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");
const calculatorForm = document.getElementById("calculatorForm");
const resultCard = document.getElementById("resultCard");
const historyCard = document.getElementById("historyCard");
const functionInput = document.getElementById("functionInput");
const derivativeInput = document.getElementById("derivativeInput");
const variableInput = document.getElementById("variableInput");
const deriveBtn = document.getElementById("deriveBtn");
const methodMenuBtn = document.getElementById("methodMenuBtn");
const methodMenuDropdown = document.getElementById("methodMenuDropdown");
const derivativeFormula = document.getElementById("derivativeFormula");
const derivativeDetails = document.getElementById("derivativeDetails");

const HISTORY_KEY = "nr_saved_solution_history_v4";
let latestResult = null;
const graphRegistry = new Map();

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => navLinks.classList.toggle("show"));
}

const methodMenu = methodMenuBtn ? methodMenuBtn.closest(".method-menu") : null;

if (methodMenuBtn && methodMenu) {
  methodMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    methodMenu.classList.toggle("open");
    methodMenuBtn.setAttribute("aria-expanded", methodMenu.classList.contains("open") ? "true" : "false");
  });
}

if (methodMenuDropdown) {
  methodMenuDropdown.addEventListener("click", (event) => {
    const clickedLink = event.target.closest("a");
    if (!clickedLink) return;

    if (clickedLink.classList.contains("disabled-link")) {
      event.preventDefault();
      return;
    }

    if (methodMenu) {
      methodMenu.classList.remove("open");
      methodMenuBtn.setAttribute("aria-expanded", "false");
    }
  });
}

document.addEventListener("click", (event) => {
  if (methodMenu && !methodMenu.contains(event.target)) {
    methodMenu.classList.remove("open");
    methodMenuBtn.setAttribute("aria-expanded", "false");
  }
});

function updateActiveNavLink() {
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navItems = Array.from(document.querySelectorAll(".nav-links a[data-section]"));

  let currentId = sections[0]?.id || "home";
  const offset = window.innerHeight * 0.28;

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= offset) currentId = section.id;
  });

  navItems.forEach((link) => {
    link.classList.toggle("active", link.dataset.section === currentId);
  });
}

window.addEventListener("scroll", updateActiveNavLink, { passive: true });
window.addEventListener("load", updateActiveNavLink);
updateActiveNavLink();

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => navLinks.classList.remove("show"));
});

document.querySelectorAll(".symbol-pad button").forEach((button) => {
  button.addEventListener("click", () => {
    const valueToInsert = button.dataset.insert || "";
    const activeElement = document.activeElement;
    const targetInput =
      activeElement &&
      activeElement.tagName === "INPUT" &&
      (activeElement.id === "functionInput" || activeElement.id === "derivativeInput")
        ? activeElement
        : functionInput;
    insertAtCursor(targetInput, valueToInsert);
  });
});

function mathBlock(latex) {
  return `<div class="math-display">\\[${latex}\\]</div>`;
}

function mathInline(latex) {
  return `\\(${latex}\\)`;
}

function refreshMath(target = document.body) {
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise([target]).catch(() => {});
  }
}

function insertAtCursor(input, text) {
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const currentValue = input.value;
  input.value = currentValue.substring(0, start) + text + currentValue.substring(end);
  const newPosition = start + text.length;
  input.focus();
  input.setSelectionRange(newPosition, newPosition);
}

function formatNumber(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return String(value);
  if (Math.abs(numberValue) >= 100000 || (Math.abs(numberValue) < 0.0001 && numberValue !== 0)) {
    return numberValue.toExponential(6);
  }
  return numberValue.toFixed(6);
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function setHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

async function autoDerive() {
  derivativeFormula.innerHTML = "<p class='muted'>Calculating derivative...</p>";

  try {
    const response = await fetch("/derive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ function: functionInput.value, variable: variableInput.value }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Unable to calculate derivative.");
    }

    derivativeInput.value = data.plain;
    derivativeFormula.innerHTML = `
      <p class="muted">The derivative of the entered function is:</p>
      ${mathBlock(data.latex_rule)}
    `;
    derivativeDetails.open = true;
    refreshMath(derivativeDetails);
    triggerDerivativeEffect();
  } catch (error) {
    derivativeFormula.innerHTML = `<p class="status-error">${escapeHtml(error.message)}</p>`;
    derivativeDetails.open = true;
  }
}

if (deriveBtn) deriveBtn.addEventListener("click", autoDerive);


function triggerDerivativeEffect() {
  const target = derivativeDetails || derivativeInput;
  if (!target) return;

  const layer = document.createElement("div");
  layer.className = "derivative-effect-layer";
  document.body.appendChild(layer);

  const rect = target.getBoundingClientRect();
  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.55;
  const icons = ["🌱", "🍃", "🌿", "🍀", "✨"];

  for (let i = 0; i < 22; i += 1) {
    const particle = document.createElement("span");
    particle.className = i % 4 === 0 ? "derive-sprout" : "derive-leaf";
    particle.textContent = icons[i % icons.length];

    const startX = centerX + (Math.random() - 0.5) * Math.min(rect.width, 260);
    const startY = centerY + (Math.random() - 0.5) * 65;
    const travelX = `${(Math.random() - 0.5) * 240}px`;
    const travelY = `${-70 - Math.random() * 150}px`;
    const rotate = `${(Math.random() - 0.5) * 130}deg`;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty("--derive-x", travelX);
    particle.style.setProperty("--derive-y", travelY);
    particle.style.setProperty("--derive-rotate", rotate);
    particle.style.animationDelay = `${Math.random() * 0.16}s`;

    layer.appendChild(particle);
  }

  derivativeDetails.classList.remove("derivative-success-pop");
  void derivativeDetails.offsetWidth;
  derivativeDetails.classList.add("derivative-success-pop");

  window.setTimeout(() => layer.remove(), 1800);
}

function resultToSavedItem(data) {
  return {
    id: Date.now().toString(),
    savedAt: new Date().toLocaleString(),
    title: `${data.function} | root ≈ ${formatNumber(data.root)}`,
    data,
  };
}

function buildSolutionHtml(data) {
  const first = data.iterations[0];
  const firstError = first ? Math.abs(first.next_x - first.xn) : 0;
  const v = data.variable || "x";
  const functionLatex = data.symbolic?.latex_function || escapeHtml(data.function);
  const derivativeLatex = data.symbolic?.latex_derivative || escapeHtml(data.derivative);
  const derivativeRuleLatex = data.symbolic?.latex_rule || `${v}'=${derivativeLatex}`;

  return `
    <div class="solution-box readable-solution">
      <h4>Given</h4>
      ${mathBlock(`f(${v})=${functionLatex}`)}
      ${mathBlock(`f'(${v})=${derivativeLatex}`)}
      ${mathBlock(`${v}_0=${formatNumber(data.initial_guess)},\\qquad \\varepsilon=${data.tolerance}`)}

      <h4>Derivative Formula</h4>
      ${mathBlock(derivativeRuleLatex)}

      <h4>Newton-Raphson Iteration Formula</h4>
      ${mathBlock(`${v}_{n+1}=${v}_n-\\frac{f(${v}_n)}{f'(${v}_n)}`)}

      ${first ? `
        <h4>First Iteration Substitution</h4>
        <p>At ${mathInline("n=0")}, use the initial estimate ${mathInline(`${v}_0=${formatNumber(first.xn)}`)}.</p>
        ${mathBlock(`f(${v}_0)=${formatNumber(first.fx)}`)}
        ${mathBlock(`f'(${v}_0)=${formatNumber(first.dfx)}`)}
        ${mathBlock(`${v}_1=${formatNumber(first.xn)}-\\frac{${formatNumber(first.fx)}}{${formatNumber(first.dfx)}}=${formatNumber(first.next_x)}`)}

        <h4>First Error</h4>
        ${mathBlock(`|${v}_1-${v}_0|=|${formatNumber(first.next_x)}-${formatNumber(first.xn)}|=${formatNumber(firstError)}`)}
      ` : ""}

      <h4>Final Approximation</h4>
      ${mathBlock(`${v}\\approx ${formatNumber(data.root)}`)}
    </div>
  `;
}

function buildTableHtml(data) {
  const v = data.variable || "x";
  const rows = data.iterations.map((item) => `
    <tr>
      <td>${item.n}</td>
      <td>${formatNumber(item.xn)}</td>
      <td>${formatNumber(item.fx)}</td>
      <td>${formatNumber(item.dfx)}</td>
      <td>${formatNumber(item.next_x)}</td>
      <td>${formatNumber(item.error)}</td>
    </tr>
  `).join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>n</th>
            <th>${v}ₙ</th>
            <th>f(${v}ₙ)</th>
            <th>f'(${v}ₙ)</th>
            <th>${v}ₙ₊₁</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildFigureHtml(canvasId) {
  return `
    <details class="result-details" id="figuresDetails">
      <summary>Figures and Graph</summary>
      <div id="figurePrintBlock">
        <div class="graph-shell">
          <div class="graph-panel-header">
            <div>
              <p class="graph-eyebrow">Visual analysis</p>
              <h4>Newton-Raphson convergence plot</h4>
              <p class="muted graph-intro">This detailed figure follows the current website theme and shows the function curve, tangent-line corrections, iteration points, and the final approximate root.</p>
            </div>
            <div class="graph-legend" aria-label="Graph legend">
              <span><i class="legend-swatch legend-curve"></i>Function curve</span>
              <span><i class="legend-swatch legend-tangent"></i>Tangent lines</span>
              <span><i class="legend-swatch legend-point"></i>Iteration points</span>
              <span><i class="legend-swatch legend-root"></i>Approximate root</span>
            </div>
          </div>
          <div class="graph-toolbar">
            <span class="graph-zoom-label">Zoom</span>
            <button type="button" class="small-action graph-zoom-btn" data-graph-action="zoom-out" data-canvas-id="${canvasId}" aria-label="Zoom out graph">−</button>
            <button type="button" class="small-action graph-zoom-btn" data-graph-action="zoom-in" data-canvas-id="${canvasId}" aria-label="Zoom in graph">+</button>
            <button type="button" class="small-action graph-zoom-btn" data-graph-action="reset" data-canvas-id="${canvasId}">Reset</button>
            
          </div>
          <div class="graph-frame" data-canvas-id="${canvasId}">
            <canvas class="graph-canvas" id="${canvasId}" width="900" height="500"></canvas>
          </div>
          <div class="graph-note-grid">
            <div class="graph-note"><strong>Curve:</strong> the main curve represents ${mathInline('f(x)')}.</div>
            <div class="graph-note"><strong>Tangents:</strong> dashed lines show how Newton-Raphson jumps from one estimate to the next.</div>
            <div class="graph-note"><strong>Iteration points:</strong> highlighted markers show the current points ${mathInline('(x_n,\,f(x_n))')}.</div>
            <div class="graph-note"><strong>Root marker:</strong> the diamond marks the approximate root on the x-axis.</div>
          </div>
        </div>
      </div>
    </details>
  `;
}

function buildPrintPanelHtml() {
  return `
    <div class="print-panel no-print">
      <strong>Print options</strong>
      <div class="print-options">
        <label><input type="checkbox" id="printOutputOnly" checked /> Current output/result</label>
        <label><input type="checkbox" id="printSolution" /> Include solution</label>
        <label><input type="checkbox" id="printFigures" /> Include figures/graph</label>
      </div>
      <div class="result-actions">
        <button type="button" class="action-btn" id="saveHistoryBtn">Save History</button>
        <button type="button" class="action-btn" id="printCurrentBtn">Print Selected</button>
      </div>
    </div>
  `;
}

function triggerSolveEffect() {
  const layer = document.createElement("div");
  layer.className = "solve-effect-layer";
  document.body.appendChild(layer);

  const resultRect = resultCard.getBoundingClientRect();
  const centerX = resultRect.left + resultRect.width * 0.52;
  const centerY = resultRect.top + Math.min(resultRect.height * 0.35, 180);
  const icons = ["🌱", "🍃", "🌿", "✨", "🍀"];

  for (let i = 0; i < 24; i += 1) {
    const particle = document.createElement("span");
    particle.className = i % 3 === 0 ? "solve-sprout" : "solve-leaf";
    particle.textContent = icons[i % icons.length];

    const startX = centerX + (Math.random() - 0.5) * 150;
    const startY = centerY + (Math.random() - 0.5) * 60;
    const travelX = `${(Math.random() - 0.5) * 320}px`;
    const travelY = `${-90 - Math.random() * 170}px`;
    const rotate = `${(Math.random() - 0.5) * 110}deg`;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    particle.style.setProperty("--leaf-x", travelX);
    particle.style.setProperty("--leaf-y", travelY);
    particle.style.setProperty("--leaf-rotate", rotate);
    particle.style.animationDelay = `${Math.random() * 0.18}s`;

    layer.appendChild(particle);
  }

  window.setTimeout(() => layer.remove(), 1800);
}

function renderResult(data) {
  latestResult = data;
  const statusClass = data.converged ? "status-success" : "status-warning";
  const canvasId = `graphCanvas_${Date.now()}`;

  resultCard.innerHTML = `
    <h3>Result</h3>
    <p class="${statusClass}">${escapeHtml(data.message)}</p>
    <p class="answer-pill">Approximate root: ${data.variable || "x"} ≈ ${formatNumber(data.root)}</p>
    ${buildTableHtml(data)}
    <details class="result-details" id="solutionDetails">
      <summary>Solution</summary>
      <div id="solutionPrintBlock">${buildSolutionHtml(data)}</div>
    </details>
    ${buildFigureHtml(canvasId)}
    ${buildPrintPanelHtml()}
  `;

  wireResultButtons();
  initGraphControls(canvasId, data.graph);
  drawGraph(canvasId, data.graph);
  refreshMath(resultCard);
  triggerSolveEffect();
  resultCard.classList.remove("result-success-pop");
  void resultCard.offsetWidth;
  resultCard.classList.add("result-success-pop");
}

function renderError(message) {
  resultCard.innerHTML = `<h3>Result</h3><p class="status-error">${escapeHtml(message)}</p><p class="muted">Please check your function, derivative, variable, initial guess, tolerance, and maximum iterations.</p>`;
}

function wireResultButtons() {
  const saveBtn = document.getElementById("saveHistoryBtn");
  const printBtn = document.getElementById("printCurrentBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveLatestToHistory);
  if (printBtn) printBtn.addEventListener("click", () => printData(latestResult, getCurrentPrintOptions()));
}

function getCurrentPrintOptions() {
  return {
    output: document.getElementById("printOutputOnly")?.checked ?? true,
    solution: document.getElementById("printSolution")?.checked ?? false,
    figures: document.getElementById("printFigures")?.checked ?? false,
  };
}

function saveLatestToHistory() {
  if (!latestResult) return;
  const history = getHistory();
  history.unshift(resultToSavedItem(latestResult));
  setHistory(history.slice(0, 20));
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    historyCard.innerHTML = `<h3>Saved Solution History</h3><p class="muted">Saved results will appear here after clicking Save History.</p>`;
    return;
  }

  const options = history.map((item, index) => `<option value="${item.id}">${index + 1}. ${escapeHtml(item.title)} (${escapeHtml(item.savedAt)})</option>`).join("");
  historyCard.innerHTML = `
    <h3>Saved Solution History</h3>
    <select class="history-select" id="historySelect">${options}</select>
    <div class="history-actions">
      <button type="button" class="action-btn" id="loadHistoryBtn">Load Selected</button>
      <button type="button" class="action-btn" id="printHistoryBtn">Print Selected History</button>
      <button type="button" class="action-btn" id="clearHistoryBtn">Clear History</button>
    </div>
    <div class="print-panel">
      <strong>Print selected history options</strong>
      <div class="print-options">
        <label><input type="checkbox" id="historyPrintOutput" checked /> Current output/result</label>
        <label><input type="checkbox" id="historyPrintSolution" /> Include solution</label>
        <label><input type="checkbox" id="historyPrintFigures" /> Include figures/graph</label>
      </div>
    </div>
    <p class="muted">You can load or print any saved solution from this list.</p>
  `;

  document.getElementById("loadHistoryBtn").addEventListener("click", () => {
    const selected = getSelectedHistoryItem();
    if (selected) renderResult(selected.data);
  });

  document.getElementById("printHistoryBtn").addEventListener("click", () => {
    const selected = getSelectedHistoryItem();
    if (!selected) return;
    printData(selected.data, {
      output: document.getElementById("historyPrintOutput").checked,
      solution: document.getElementById("historyPrintSolution").checked,
      figures: document.getElementById("historyPrintFigures").checked,
    });
  });

  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Clear all saved solutions?")) {
      setHistory([]);
      renderHistory();
    }
  });
}

function getSelectedHistoryItem() {
  const select = document.getElementById("historySelect");
  const history = getHistory();
  return history.find((item) => item.id === select.value);
}

function initGraphControls(canvasId, graph) {
  graphRegistry.set(canvasId, { graph, zoom: 1, hoverPointer: null, dragState: null });
  updateGraphCanvasSize(canvasId);

  document.querySelectorAll(`.graph-zoom-btn[data-canvas-id="${canvasId}"]`).forEach((button) => {
    button.addEventListener("click", () => {
      adjustGraphZoom(canvasId, button.dataset.graphAction);
    });
  });

  const frame = document.querySelector(`.graph-frame[data-canvas-id="${canvasId}"]`);
  const canvas = document.getElementById(canvasId);

  if (frame) {
    frame.addEventListener("wheel", (event) => {
      // Normal wheel movement scrolls the zoomed graph.
      // Hold CTRL while using the wheel if you want wheel-based zoom.
      if (!event.ctrlKey) return;

      event.preventDefault();
      if (event.deltaY < 0) adjustGraphZoom(canvasId, "zoom-in");
      else adjustGraphZoom(canvasId, "zoom-out");
    }, { passive: false });

    frame.addEventListener("pointerdown", (event) => {
      const entry = graphRegistry.get(canvasId);
      if (!entry || entry.zoom <= 1.01) return;
      entry.dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: frame.scrollLeft,
        scrollTop: frame.scrollTop,
      };
      frame.classList.add("is-panning");
      frame.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    frame.addEventListener("pointermove", (event) => {
      const entry = graphRegistry.get(canvasId);
      if (!entry?.dragState) return;
      frame.scrollLeft = entry.dragState.scrollLeft - (event.clientX - entry.dragState.startX);
      frame.scrollTop = entry.dragState.scrollTop - (event.clientY - entry.dragState.startY);
    });

    const stopPan = (event) => {
      const entry = graphRegistry.get(canvasId);
      if (!entry?.dragState) return;
      if (event?.pointerId !== undefined && entry.dragState.pointerId !== event.pointerId) return;
      entry.dragState = null;
      frame.classList.remove("is-panning");
      try { frame.releasePointerCapture(event.pointerId); } catch (error) {}
    };

    frame.addEventListener("pointerup", stopPan);
    frame.addEventListener("pointercancel", stopPan);
    frame.addEventListener("pointerleave", stopPan);
  }

  if (canvas) {
    canvas.addEventListener("mousemove", (event) => {
      const entry = graphRegistry.get(canvasId);
      if (!entry) return;
      entry.hoverPointer = getCanvasPointer(event, canvas);
      drawGraph(canvasId, entry.graph);
    });

    canvas.addEventListener("mouseleave", () => {
      const entry = graphRegistry.get(canvasId);
      if (!entry) return;
      entry.hoverPointer = null;
      drawGraph(canvasId, entry.graph);
    });
  }
}

function adjustGraphZoom(canvasId, action) {
  const entry = graphRegistry.get(canvasId);
  if (!entry) return;
  if (action === "zoom-in") entry.zoom = Math.min(entry.zoom * 1.25, 8);
  else if (action === "zoom-out") entry.zoom = Math.max(entry.zoom / 1.25, 1);
  else entry.zoom = 1;
  updateGraphCanvasSize(canvasId);
  drawGraph(canvasId, entry.graph);
}

function updateGraphCanvasSize(canvasId) {
  const entry = graphRegistry.get(canvasId);
  const canvas = document.getElementById(canvasId);
  const frame = document.querySelector(`.graph-frame[data-canvas-id="${canvasId}"]`);
  if (!entry || !canvas) return;

  const baseWidth = 900;
  const baseHeight = 500;

  if (entry.zoom <= 1.01) {
    canvas.style.width = "100%";
    canvas.style.height = "";
    frame?.classList.remove("zoomed");
    return;
  }

  canvas.style.width = `${Math.round(baseWidth * entry.zoom)}px`;
  canvas.style.height = `${Math.round(baseHeight * entry.zoom)}px`;
  frame?.classList.add("zoomed");
}

function drawGraph(canvasId, graph) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !graph || !graph.points || graph.points.length < 2) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const margin = { top: 84, right: 34, bottom: 62, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const styles = getComputedStyle(document.body);
  const palette = {
    bgStart: styles.getPropertyValue("--graph-bg-start").trim() || "#071329",
    bgEnd: styles.getPropertyValue("--graph-bg-end").trim() || "#0b1d46",
    glow: styles.getPropertyValue("--graph-bg-glow").trim() || "rgba(80, 200, 255, 0.16)",
    grid: styles.getPropertyValue("--graph-grid").trim() || "rgba(255,255,255,0.10)",
    axis: styles.getPropertyValue("--graph-axis").trim() || "rgba(255,255,255,0.45)",
    label: styles.getPropertyValue("--graph-label").trim() || "rgba(255,255,255,0.9)",
    curve: styles.getPropertyValue("--graph-curve").trim() || "#36a7ff",
    tangent: styles.getPropertyValue("--graph-tangent").trim() || "rgba(255, 184, 61, 0.95)",
    point: styles.getPropertyValue("--graph-point").trim() || "#ff9822",
    root: styles.getPropertyValue("--graph-root").trim() || "#63df52",
    rootStroke: styles.getPropertyValue("--graph-root-stroke").trim() || "#b5ff8a"
  };
  const entry = graphRegistry.get(canvasId);
  const zoom = entry?.zoom || 1;

  const allX = graph.points.map((p) => p.x);
  const allY = graph.points.map((p) => p.y);
  graph.tangents.forEach((t) => {
    allX.push(t.x1, t.x2, t.x0, t.next_x);
    allY.push(t.y1, t.y2, t.y0, 0);
  });
  allX.push(graph.root);
  allY.push(0);

  let minX = Math.min(...allX), maxX = Math.max(...allX);
  let minY = Math.min(...allY), maxY = Math.max(...allY);
  if (maxX === minX) { maxX += 1; minX -= 1; }
  if (maxY === minY) { maxY += 1; minY -= 1; }
  const padX = (maxX - minX) * 0.12;
  const padY = (maxY - minY) * 0.18;
  minX -= padX; maxX += padX; minY -= padY; maxY += padY;

  if (zoom > 1) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const halfSpanX = (maxX - minX) / (2 * zoom);
    const halfSpanY = (maxY - minY) / (2 * zoom);
    minX = cx - halfSpanX;
    maxX = cx + halfSpanX;
    minY = cy - halfSpanY;
    maxY = cy + halfSpanY;
  }

  const sx = (x) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const sy = (y) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, palette.bgStart);
  bg.addColorStop(0.55, palette.bgEnd);
  bg.addColorStop(1, palette.bgStart);
  ctx.fillStyle = bg;
  roundRectPath(ctx, 0, 0, width, height, 24);
  ctx.fill();

  const glow = ctx.createRadialGradient(width * 0.78, height * 0.18, 10, width * 0.78, height * 0.18, width * 0.55);
  glow.addColorStop(0, palette.glow);
  glow.addColorStop(1, "rgba(80, 200, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const x = margin.left + (plotWidth * i) / 8;
    ctx.beginPath(); ctx.moveTo(x, margin.top); ctx.lineTo(x, margin.top + plotHeight); ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const y = margin.top + (plotHeight * i) / 6;
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + plotWidth, y); ctx.stroke();
  }
  ctx.restore();

  // axes
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1.5;
  const axisY = sy(0);
  if (axisY >= margin.top && axisY <= margin.top + plotHeight) {
    ctx.beginPath(); ctx.moveTo(margin.left, axisY); ctx.lineTo(margin.left + plotWidth, axisY); ctx.stroke();
  }
  const axisX = sx(0);
  if (axisX >= margin.left && axisX <= margin.left + plotWidth) {
    ctx.beginPath(); ctx.moveTo(axisX, margin.top); ctx.lineTo(axisX, margin.top + plotHeight); ctx.stroke();
  }

  // tick labels
  ctx.fillStyle = palette.label;
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  for (let i = 0; i <= 8; i++) {
    const value = minX + ((maxX - minX) * i) / 8;
    const x = margin.left + (plotWidth * i) / 8;
    ctx.fillText(trimTick(value), x, height - 22);
  }
  ctx.textAlign = "right";
  for (let i = 0; i <= 6; i++) {
    const value = maxY - ((maxY - minY) * i) / 6;
    const y = margin.top + (plotHeight * i) / 6;
    ctx.fillText(trimTick(value), margin.left - 12, y + 4);
  }

  // titles
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "700 24px Arial";
  ctx.fillText("Newton-Raphson Plot", 28, 34);
  ctx.font = "15px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`Function curve, tangent corrections, and convergence points • Zoom ${zoom.toFixed(2)}×`, 28, 58);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = "bold 17px Arial";
  ctx.fillText("x", margin.left + plotWidth / 2, height - 8);
  ctx.save();
  ctx.translate(24, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("f(x)", 0, 0);
  ctx.restore();

  // function curve
  ctx.strokeStyle = palette.curve;
  ctx.lineWidth = 4;
  ctx.beginPath();
  graph.points.forEach((p, index) => {
    const x = sx(p.x);
    const y = sy(p.y);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // tangent lines and iteration path
  graph.tangents.forEach((t, index) => {
    ctx.save();
    ctx.strokeStyle = palette.tangent;
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(t.x1), sy(t.y1));
    ctx.lineTo(sx(t.x2), sy(t.y2));
    ctx.stroke();
    ctx.restore();

    // current point
    drawPoint(ctx, sx(t.x0), sy(t.y0), palette.point, 7);
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "left";
    const label = `x${typeof t.iteration === "number" ? t.iteration : index}`;
    ctx.fillText(label, sx(t.x0) + 8, sy(t.y0) - 12);

    // guide to x-axis intercept
    ctx.save();
    ctx.strokeStyle = "rgba(110, 224, 98, 0.45)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(sx(t.next_x), sy(0));
    ctx.lineTo(sx(t.next_x), sy(Math.min(maxY, t.y0)));
    ctx.stroke();
    ctx.restore();
  });

  // root diamond
  drawDiamond(ctx, sx(graph.root), sy(0), 11, palette.root, palette.rootStroke);
  ctx.fillStyle = "#dbffd1";
  ctx.font = "bold 15px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Root ≈ ${formatNumber(graph.root)}`, sx(graph.root) + 14, sy(0) - 10);

  const hoverDatum = entry?.hoverPointer ? getNearestGraphDatum(entry.hoverPointer, graph, sx, sy) : null;
  if (hoverDatum) {
    drawHoverMarker(ctx, hoverDatum, palette);
    drawGraphTooltip(ctx, hoverDatum, width, height, palette);
  }
}

function getCanvasPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function getNearestGraphDatum(pointer, graph, sx, sy) {
  let best = null;

  const consider = (candidate, threshold) => {
    const distance = Math.hypot(pointer.x - candidate.px, pointer.y - candidate.py);
    if (distance > threshold) return;
    if (!best || distance < best.distance) {
      best = { ...candidate, distance };
    }
  };

  graph.points.forEach((p) => {
    consider({ type: "curve", x: p.x, y: p.y, px: sx(p.x), py: sy(p.y) }, 22);
  });

  graph.tangents.forEach((t, index) => {
    const iter = typeof t.iteration === "number" ? t.iteration : index;
    consider({ type: "iteration", iteration: iter, x: t.x0, y: t.y0, px: sx(t.x0), py: sy(t.y0) }, 18);
  });

  consider({ type: "root", x: graph.root, y: 0, px: sx(graph.root), py: sy(0) }, 18);

  return best;
}

function drawHoverMarker(ctx, datum, palette) {
  if (datum.type === "root") {
    drawDiamond(ctx, datum.px, datum.py, 13, palette.root, "#ffffff");
    return;
  }

  drawPoint(ctx, datum.px, datum.py, datum.type === "iteration" ? palette.point : "#ffffff", datum.type === "iteration" ? 8 : 5);
  ctx.save();
  ctx.strokeStyle = datum.type === "iteration" ? "#ffffff" : palette.curve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(datum.px, datum.py, datum.type === "iteration" ? 11 : 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGraphTooltip(ctx, datum, width, height, palette) {
  const title = datum.type === "root"
    ? "Approximate root"
    : datum.type === "iteration"
      ? `Iteration x${datum.iteration}`
      : "Curve point";

  const lines = datum.type === "root"
    ? [`x ≈ ${formatNumber(datum.x)}`, `f(x) = ${formatNumber(datum.y)}`]
    : [`x = ${formatNumber(datum.x)}`, `f(x) = ${formatNumber(datum.y)}`];

  ctx.save();
  ctx.font = "bold 14px Arial";
  const titleWidth = ctx.measureText(title).width;
  ctx.font = "13px Arial";
  const lineWidths = lines.map((line) => ctx.measureText(line).width);
  const boxWidth = Math.max(titleWidth, ...lineWidths) + 24;
  const boxHeight = 66;

  let boxX = datum.px + 14;
  let boxY = datum.py - boxHeight - 16;
  if (boxX + boxWidth > width - 16) boxX = datum.px - boxWidth - 14;
  if (boxX < 16) boxX = 16;
  if (boxY < 16) boxY = datum.py + 16;
  if (boxY + boxHeight > height - 16) boxY = height - boxHeight - 16;

  const fill = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
  fill.addColorStop(0, "rgba(9, 28, 63, 0.96)");
  fill.addColorStop(1, "rgba(23, 59, 124, 0.92)");
  ctx.fillStyle = fill;
  ctx.strokeStyle = "rgba(196, 232, 255, 0.88)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.fillText(title, boxX + 12, boxY + 20);
  ctx.font = "13px Arial";
  ctx.fillStyle = "#d8edff";
  ctx.fillText(lines[0], boxX + 12, boxY + 40);
  ctx.fillText(lines[1], boxX + 12, boxY + 57);
  ctx.restore();
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawDiamond(ctx, x, y, size, fillColor, strokeColor) {
  ctx.save();
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function trimTick(value) {
  const rounded = Math.abs(value) < 1e-9 ? 0 : value;
  if (Math.abs(rounded) >= 1000 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 0.01)) {
    return rounded.toExponential(1);
  }
  return Number(rounded.toFixed(2)).toString();
}

function drawPoint(ctx, x, y, color, radius = 4) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

async function waitForMathInElement(element) {
  if (window.MathJax && window.MathJax.typesetPromise && element) {
    try {
      await window.MathJax.typesetPromise([element]);
    } catch (error) {
      console.error("MathJax render error:", error);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function capturePrintableSection(element, title) {
  if (!element) return "";

  await waitForMathInElement(element);

  if (typeof html2canvas === "undefined") {
    throw new Error("html2canvas is not loaded yet. Please check your internet connection and try again.");
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: 1100,
    scrollX: 0,
    scrollY: 0,
  });

  const imageData = canvas.toDataURL("image/png");

  return `
    <section class="print-section">
      <h2>${escapeHtml(title)}</h2>
      <img src="${imageData}" alt="${escapeHtml(title)}" />
    </section>
  `;
}

function buildPrintableOutputBlock(data) {
  const v = data.variable || "x";
  const statusClass = data.converged ? "status-success" : "status-warning";

  return `
    <section class="capture-unit print-capture-card" data-title="Current Output / Result">
      <h2>Current Output / Result</h2>
      <p class="${statusClass}">${escapeHtml(data.message)}</p>
      <div class="print-meta-grid">
        <p><strong>Function</strong><br>${mathInline(`f(${v})=${data.symbolic?.latex_function || escapeHtml(data.function)}`)}</p>
        <p><strong>Derivative</strong><br>${mathInline(`f'(${v})=${data.symbolic?.latex_derivative || escapeHtml(data.derivative)}`)}</p>
        <p><strong>Initial Guess</strong><br>${formatNumber(data.initial_guess)}</p>
        <p><strong>Tolerance</strong><br>${escapeHtml(data.tolerance)}</p>
      </div>
      <p class="answer-pill">Approximate root: ${v} ≈ ${formatNumber(data.root)}</p>
      ${buildTableHtml(data)}
    </section>
  `;
}

function buildPrintableSolutionBlock(data) {
  return `
    <section class="capture-unit print-capture-card" data-title="Solution">
      <h2>Solution</h2>
      ${buildSolutionHtml(data)}
    </section>
  `;
}

function buildPrintableFigureBlock(data, canvasId) {
  return `
    <section class="capture-unit print-capture-card" data-title="Figures and Graph">
      <h2>Figures and Graph</h2>
      <p class="muted">Function curve and Newton-Raphson tangent-line approximations.</p>
      <canvas class="graph-canvas print-graph-canvas" id="${canvasId}" width="900" height="420"></canvas>
    </section>
  `;
}

async function buildImageBasedPrintableHtml(data, options) {
  const captureRoot = document.createElement("div");
  captureRoot.className = "print-capture-root";
  captureRoot.style.position = "fixed";
  captureRoot.style.left = "-12000px";
  captureRoot.style.top = "0";
  captureRoot.style.width = "980px";
  captureRoot.style.background = "#ffffff";
  captureRoot.style.padding = "24px";
  captureRoot.style.zIndex = "-1";

  const figureCanvasId = `printGraphCanvas_${Date.now()}`;

  captureRoot.innerHTML = `
    ${options.output ? buildPrintableOutputBlock(data) : ""}
    ${options.solution ? buildPrintableSolutionBlock(data) : ""}
    ${options.figures ? buildPrintableFigureBlock(data, figureCanvasId) : ""}
  `;

  document.body.appendChild(captureRoot);

  if (options.figures && data.graph) {
    drawGraph(figureCanvasId, data.graph);
  }

  await waitForMathInElement(captureRoot);

  const sections = Array.from(captureRoot.querySelectorAll(".capture-unit"));
  let printableHtml = "";

  for (const section of sections) {
    printableHtml += await capturePrintableSection(section, section.dataset.title || "Printable Section");
  }

  captureRoot.remove();
  return printableHtml;
}

function openImagePrintPreview(printableHtml) {
  const win = window.open("", "_blank", "width=1100,height=820");

  if (!win) {
    alert("Please allow pop-ups so the print page can open.");
    return;
  }

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Newton-Raphson Printable Result</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#06130b;background:#f6faef;line-height:1.55}
        .print-toolbar{position:sticky;top:0;z-index:10;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:16px 24px;background:#06130b;color:white;box-shadow:0 10px 28px rgba(0,0,0,.18)}
        .print-toolbar strong{color:#c3e65a}
        .toolbar-actions{display:flex;gap:10px;flex-wrap:wrap}
        button{border:0;border-radius:999px;padding:10px 16px;background:#c3e65a;color:#06130b;font-weight:900;cursor:pointer}
        button.secondary{background:transparent;color:white;border:1px solid rgba(255,255,255,.45)}
        .page{max-width:980px;margin:28px auto;background:white;border:1px solid #d9e3d2;border-radius:24px;padding:34px;box-shadow:0 18px 50px rgba(6,19,11,.12)}
        h1,h2{color:#0f2b1b;line-height:1.15}
        h1{margin-top:0;font-size:2.15rem}
        .meta{padding:16px 18px;background:#eef8d7;border-radius:16px;margin:18px 0;border:1px solid #c8dda9}
        .print-hint{padding:12px 14px;border-radius:14px;background:#fbfdf8;border:1px dashed #a7ca82;color:#4a645a;margin:12px 0 22px}
        .print-section{break-inside:avoid;margin-top:28px;background:white;border:1px solid #d9e3d2;border-radius:18px;padding:18px}
        .print-section h2{margin:0 0 14px;font-size:1.4rem}
        .print-section img{display:block;width:100%;height:auto;border:1px solid #d9e3d2;border-radius:14px;background:white}
        @page{size:A4;margin:14mm}
        @media print{body{background:white}.print-toolbar,.print-hint{display:none!important}.page{box-shadow:none;border:0;margin:0;max-width:none;padding:0}.print-section{page-break-inside:avoid;border:0;padding:0;margin-top:18px}button{display:none!important}}
        @media(max-width:720px){.print-toolbar{display:block}.toolbar-actions{margin-top:10px}.page{margin:12px;padding:18px;border-radius:18px}}
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div><strong>Print Preview</strong> — Newton-Raphson PIT Result</div>
        <div class="toolbar-actions">
          <button onclick="window.print()">Print / Save as PDF</button>
          <button class="secondary" onclick="window.close()">Close</button>
        </div>
      </div>
      <main class="page">
        <h1>Newton-Raphson Root Finding</h1>
        <div class="meta">
          <strong>Raniel P. Beronilla</strong><br>
          BS Computer Engineering - 2B<br>
          Numerical Methods PIT
        </div>
        <p class="print-hint">These sections were captured as images, so equations, tables, and graphs print exactly as they appear on screen. To make a PDF, click <strong>Print / Save as PDF</strong>, then choose <strong>Save as PDF</strong> as the printer/destination.</p>
        ${printableHtml}
      </main>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
}

async function printData(data, options) {
  if (!data) return;

  try {
    const printableHtml = await buildImageBasedPrintableHtml(data, options);

    if (!printableHtml.trim()) {
      alert("Please choose at least one print option.");
      return;
    }

    openImagePrintPreview(printableHtml);
  } catch (error) {
    console.error("Image-based print error:", error);
    alert(error.message || "There was a problem preparing the print preview.");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

if (calculatorForm) {
  calculatorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    resultCard.innerHTML = `<h3>Result</h3><p class="muted">Calculating...</p>`;
    const formData = new FormData(calculatorForm);
    const payload = {
      variable: formData.get("variable"),
      function: formData.get("function"),
      derivative: formData.get("derivative"),
      initial_guess: formData.get("initial_guess"),
      tolerance: formData.get("tolerance"),
      max_iterations: formData.get("max_iterations"),
    };
    try {
      const response = await fetch("/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        renderError(data.error || "Something went wrong.");
        return;
      }
      renderResult(data);
    } catch {
      renderError("Unable to connect to the calculator server.");
    }
  });
}

renderHistory();


/* -------------------------------------------------------------------------
   Improved print/PDF preview
   This replaces the older screenshot/html2canvas printing approach. The print
   page now uses normal HTML + MathJax, so equations remain sharp and readable.
   The graph only is converted to a PNG because canvas drawings do not always
   survive when moved to another window.
------------------------------------------------------------------------- */
function printMathBlock(latex) {
  return `<div class="print-math-block">\\[${latex}\\]</div>`;
}

function printMathInline(latex) {
  return `\\(${latex}\\)`;
}

function graphToImageData(data) {
  if (!data || !data.graph) return "";

  const canvasId = `printGraphImage_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const canvas = document.createElement("canvas");
  canvas.id = canvasId;
  canvas.width = 900;
  canvas.height = 420;
  canvas.className = "graph-canvas print-graph-canvas";
  canvas.style.position = "fixed";
  canvas.style.left = "-12000px";
  canvas.style.top = "0";
  canvas.style.background = "#ffffff";
  document.body.appendChild(canvas);

  try {
    drawGraph(canvasId, data.graph);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Graph image conversion error:", error);
    return "";
  } finally {
    canvas.remove();
  }
}

function buildPrintableTable(data) {
  const v = data.variable || "x";
  const rows = (data.iterations || []).map((item) => `
    <tr>
      <td>${item.n}</td>
      <td>${formatNumber(item.xn)}</td>
      <td>${formatNumber(item.fx)}</td>
      <td>${formatNumber(item.dfx)}</td>
      <td>${formatNumber(item.next_x)}</td>
      <td>${formatNumber(item.error)}</td>
    </tr>
  `).join("");

  return `
    <div class="table-wrap print-table-wrap">
      <table>
        <thead>
          <tr>
            <th>n</th>
            <th>${v}<sub>n</sub></th>
            <th>f(${v}<sub>n</sub>)</th>
            <th>f′(${v}<sub>n</sub>)</th>
            <th>${v}<sub>n+1</sub></th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildPrintableResultSection(data) {
  const v = data.variable || "x";
  const statusClass = data.converged ? "print-success" : "print-warning";
  const functionLatex = data.symbolic?.latex_function || escapeHtml(data.function);
  const derivativeLatex = data.symbolic?.latex_derivative || escapeHtml(data.derivative);

  return `
    <section class="print-section">
      <h2>Current Output / Result</h2>
      <p class="${statusClass}">${escapeHtml(data.message)}</p>
      <div class="print-meta-grid">
        <div><strong>Function</strong>${printMathBlock(`f(${v})=${functionLatex}`)}</div>
        <div><strong>Derivative</strong>${printMathBlock(`f'(${v})=${derivativeLatex}`)}</div>
        <div><strong>Initial Guess</strong><p>${v}<sub>0</sub> = ${formatNumber(data.initial_guess)}</p></div>
        <div><strong>Tolerance</strong><p>ε = ${escapeHtml(data.tolerance)}</p></div>
      </div>
      <p class="answer-pill">Approximate root: ${v} ≈ ${formatNumber(data.root)}</p>
      ${buildPrintableTable(data)}
    </section>
  `;
}

function buildPrintableSolutionSection(data) {
  const first = (data.iterations || [])[0];
  const firstError = first ? Math.abs(first.next_x - first.xn) : 0;
  const v = data.variable || "x";
  const functionLatex = data.symbolic?.latex_function || escapeHtml(data.function);
  const derivativeLatex = data.symbolic?.latex_derivative || escapeHtml(data.derivative);
  const derivativeRuleLatex = data.symbolic?.latex_rule || `\\frac{d}{d${v}}\\left(${functionLatex}\\right)=${derivativeLatex}`;

  return `
    <section class="print-section">
      <h2>Solution</h2>

      <div class="print-solution-box">
        <h3>Given</h3>
        ${printMathBlock(`f(${v})=${functionLatex}`)}
        ${printMathBlock(`f'(${v})=${derivativeLatex}`)}
        ${printMathBlock(`${v}_0=${formatNumber(data.initial_guess)},\\qquad \\varepsilon=${escapeHtml(data.tolerance)}`)}

        <h3>Derivative Formula</h3>
        ${printMathBlock(derivativeRuleLatex)}

        <h3>Newton-Raphson Iteration Formula</h3>
        ${printMathBlock(`${v}_{n+1}=${v}_n-\\frac{f(${v}_n)}{f'(${v}_n)}`)}

        ${first ? `
          <h3>First Iteration Substitution</h3>
          <p>At ${printMathInline("n=0")}, use the initial estimate ${printMathInline(`${v}_0=${formatNumber(first.xn)}`)}.</p>
          ${printMathBlock(`f(${v}_0)=${formatNumber(first.fx)}`)}
          ${printMathBlock(`f'(${v}_0)=${formatNumber(first.dfx)}`)}
          ${printMathBlock(`${v}_1=${formatNumber(first.xn)}-\\frac{${formatNumber(first.fx)}}{${formatNumber(first.dfx)}}=${formatNumber(first.next_x)}`)}

          <h3>First Error</h3>
          ${printMathBlock(`|${v}_1-${v}_0|=|${formatNumber(first.next_x)}-${formatNumber(first.xn)}|=${formatNumber(firstError)}`)}
        ` : ""}

        <h3>Final Approximation</h3>
        ${printMathBlock(`${v}\\approx ${formatNumber(data.root)}`)}
      </div>
    </section>
  `;
}

function buildPrintableFigureSection(data) {
  const imageData = graphToImageData(data);

  return `
    <section class="print-section">
      <h2>Figures and Graph</h2>
      <p class="muted">Function curve and Newton-Raphson tangent-line approximations.</p>
      ${imageData
        ? `<img class="print-graph-image" src="${imageData}" alt="Newton-Raphson graph" />`
        : `<p class="print-warning">No graph is available for this result.</p>`
      }
    </section>
  `;
}

function buildNormalPrintableHtml(data, options) {
  let sections = "";

  if (options.output) sections += buildPrintableResultSection(data);
  if (options.solution) sections += buildPrintableSolutionSection(data);
  if (options.figures) sections += buildPrintableFigureSection(data);

  return sections;
}

function openNormalPrintPreview(printableHtml) {
  const win = window.open("", "_blank", "width=1100,height=820");

  if (!win) {
    alert("Please allow pop-ups so the print page can open.");
    return;
  }

  win.document.open();
  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Newton-Raphson Printable Result</title>
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [["\\\\(", "\\\\)"], ["$", "$"]],
            displayMath: [["\\\\[", "\\\\]"]]
          },
          svg: { fontCache: "global" },
          startup: { typeset: false }
        };
      <\/script>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"><\/script>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #06130b;
          background: #f4f8ee;
          line-height: 1.55;
        }
        .print-toolbar {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          padding: 16px 24px;
          background: #06130b;
          color: white;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
        }
        .print-toolbar strong { color: #c3e65a; }
        .toolbar-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        button {
          border: 0;
          border-radius: 999px;
          padding: 10px 16px;
          background: #c3e65a;
          color: #06130b;
          font-weight: 900;
          cursor: pointer;
        }
        button.secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.45);
        }
        .page {
          width: min(980px, calc(100% - 32px));
          margin: 28px auto;
          background: white;
          border: 1px solid #d9e3d2;
          border-radius: 24px;
          padding: 34px;
          box-shadow: 0 18px 50px rgba(6, 19, 11, 0.12);
        }
        h1, h2, h3 { color: #0f2b1b; line-height: 1.15; }
        h1 { margin: 0; font-size: 2.15rem; }
        h2 { font-size: 1.5rem; margin: 0 0 16px; }
        h3 { font-size: 1rem; margin: 22px 0 8px; }
        .meta {
          margin: 18px 0;
          padding: 16px 18px;
          background: #eef8d7;
          border: 1px solid #c8dda9;
          border-radius: 16px;
        }
        .print-hint {
          margin: 12px 0 22px;
          padding: 12px 14px;
          background: #fbfdf8;
          border: 1px dashed #a7ca82;
          border-radius: 14px;
          color: #4a645a;
        }
        .print-section {
          margin-top: 24px;
          padding: 22px;
          border: 1px solid #d9e3d2;
          border-radius: 18px;
          background: #ffffff;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .print-success { color: #17652f; font-weight: 900; }
        .print-warning { color: #a16207; font-weight: 900; }
        .muted { color: #4a645a; }
        .print-meta-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 16px 0;
        }
        .print-meta-grid > div {
          background: #f3f8ed;
          border: 1px solid #d9e3d2;
          border-radius: 14px;
          padding: 12px;
          min-height: 84px;
        }
        .print-math-block {
          overflow-x: auto;
          padding: 4px 0;
        }
        .print-solution-box {
          background: #f1f8e8;
          border: 1px solid #bfdca1;
          border-radius: 18px;
          padding: 18px;
        }
        .answer-pill {
          display: inline-flex;
          margin: 10px 0 18px;
          padding: 10px 18px;
          border-radius: 999px;
          background: #e7f7ca;
          border: 1px solid rgba(93, 138, 84, 0.35);
          font-weight: 900;
        }
        .table-wrap { overflow-x: auto; border-radius: 14px; border: 1px solid #d9e3d2; }
        table { width: 100%; border-collapse: collapse; min-width: 720px; }
        th { background: #06130b; color: white; padding: 11px; text-align: center; }
        td { padding: 9px 11px; text-align: center; border-bottom: 1px solid #d9e3d2; }
        tbody tr:nth-child(even) { background: #f5faef; }
        .print-graph-image {
          display: block;
          width: 100%;
          height: auto;
          margin-top: 14px;
          border: 1px solid #d9e3d2;
          border-radius: 14px;
          background: white;
        }
        @page { size: A4; margin: 14mm; }
        @media print {
          body { background: white; }
          .print-toolbar, .print-hint { display: none !important; }
          .page { width: 100%; margin: 0; padding: 0; border: 0; box-shadow: none; border-radius: 0; }
          .print-section { border: 0; padding: 0; margin-top: 18px; }
          .print-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .print-toolbar { display: block; }
          .toolbar-actions { margin-top: 10px; }
          .page { padding: 18px; border-radius: 18px; }
          .print-meta-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="print-toolbar">
        <div><strong>Print Preview</strong> — Newton-Raphson PIT Result</div>
        <div class="toolbar-actions">
          <button id="printNowBtn">Print / Save as PDF</button>
          <button class="secondary" onclick="window.close()">Close</button>
        </div>
      </div>
      <main class="page">
        <h1>Newton-Raphson Root Finding</h1>
        <div class="meta">
          <strong>Raniel P. Beronilla</strong><br />
          BS Computer Engineering - 2B<br />
          Numerical Methods PIT
        </div>
        <p class="print-hint">
          Click <strong>Print / Save as PDF</strong>, then choose <strong>Save as PDF</strong>
          as the printer/destination if you want a PDF copy.
        </p>
        ${printableHtml}
      </main>
      <script>
        async function typesetThenPrint() {
          if (window.MathJax && window.MathJax.typesetPromise) {
            await window.MathJax.typesetPromise();
          }
          window.print();
        }
        document.getElementById("printNowBtn").addEventListener("click", typesetThenPrint);
        window.addEventListener("load", async () => {
          if (window.MathJax && window.MathJax.typesetPromise) {
            await window.MathJax.typesetPromise();
          }
        });
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
}

async function printData(data, options) {
  if (!data) return;

  const printableHtml = buildNormalPrintableHtml(data, options);

  if (!printableHtml.trim()) {
    alert("Please choose at least one print option.");
    return;
  }

  openNormalPrintPreview(printableHtml);
}


/* Hanging page theme changer */
const themeFlipBtn = document.getElementById("themeFlipBtn");
const THEME_KEY = "nr_selected_palette_theme";
const themeOrder = ["theme-bamboo", "theme-moss", "theme-teal", "theme-sage"];

function applyTheme(themeName) {
  document.body.classList.remove(...themeOrder);
  document.body.classList.add(themeName);
  localStorage.setItem(THEME_KEY, themeName);
  redrawAllGraphs();
}

function redrawAllGraphs() {
  graphRegistry.forEach((entry, canvasId) => {
    drawGraph(canvasId, entry.graph);
  });
}

function showThemeBloom() {
  const oldBloom = document.querySelector(".theme-bloom-effect");
  if (oldBloom) oldBloom.remove();

  const bloom = document.createElement("div");
  bloom.className = "theme-bloom-effect";
  bloom.innerHTML = `
    <span class="bloom-stem"></span>
    <span class="bloom-leaf leaf-1"></span>
    <span class="bloom-leaf leaf-2"></span>
    <span class="bloom-leaf leaf-3"></span>
    <span class="bloom-fruit"></span>
    <span class="bloom-spark spark-1"></span>
    <span class="bloom-spark spark-2"></span>
    <span class="bloom-spark spark-3"></span>
  `;

  document.body.appendChild(bloom);
  window.setTimeout(() => bloom.remove(), 3600);
}

function nextThemeName() {
  const current = themeOrder.find((theme) => document.body.classList.contains(theme)) || "theme-bamboo";
  const index = themeOrder.indexOf(current);
  return themeOrder[(index + 1) % themeOrder.length];
}

applyTheme(localStorage.getItem(THEME_KEY) || "theme-bamboo");

if (themeFlipBtn) {
  themeFlipBtn.addEventListener("click", () => {
    if (themeFlipBtn.dataset.busy === "true") return;

    themeFlipBtn.dataset.busy = "true";
    const nextTheme = nextThemeName();

    themeFlipBtn.classList.add("is-flipping");
    applyTheme(nextTheme);
    showThemeBloom();

    setTimeout(() => {
      themeFlipBtn.classList.remove("is-flipping");
      themeFlipBtn.dataset.busy = "false";
    }, 650);
  });
}

/* Detailed discussion side-page drawer */
const discussionOpenBtn = document.getElementById("discussionOpenBtn");
const discussionOverlay = document.getElementById("discussionOverlay");
const discussionCloseBtn = document.getElementById("discussionCloseBtn");
const discussionBackdrop = document.getElementById("discussionBackdrop");

let discussionHeaderTimer = null;

function openDiscussionDrawer() {
  if (!discussionOverlay) return;

  const discussionDrawer = document.getElementById("discussionDrawer");

  if (discussionHeaderTimer) {
    clearTimeout(discussionHeaderTimer);
    discussionHeaderTimer = null;
  }

  if (discussionDrawer) {
    discussionDrawer.classList.remove("header-compact");
  }

  discussionOverlay.classList.add("open");
  discussionOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("discussion-open");
  if (discussionOpenBtn) discussionOpenBtn.setAttribute("aria-expanded", "true");
  refreshMath(discussionOverlay);

  discussionHeaderTimer = setTimeout(() => {
    if (discussionOverlay.classList.contains("open") && discussionDrawer) {
      discussionDrawer.classList.add("header-compact");
    }
  }, 5000);
}

function closeDiscussionDrawer() {
  if (!discussionOverlay) return;

  const discussionDrawer = document.getElementById("discussionDrawer");

  if (discussionHeaderTimer) {
    clearTimeout(discussionHeaderTimer);
    discussionHeaderTimer = null;
  }

  if (discussionDrawer) {
    discussionDrawer.classList.remove("header-compact");
  }

  discussionOverlay.classList.remove("open");
  discussionOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("discussion-open");
  if (discussionOpenBtn) discussionOpenBtn.setAttribute("aria-expanded", "false");
}

if (discussionOpenBtn) {
  discussionOpenBtn.addEventListener("click", openDiscussionDrawer);
}

if (discussionCloseBtn) {
  discussionCloseBtn.addEventListener("click", closeDiscussionDrawer);
}

if (discussionBackdrop) {
  discussionBackdrop.addEventListener("click", closeDiscussionDrawer);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && discussionOverlay?.classList.contains("open")) {
    closeDiscussionDrawer();
  }
});
