const PASSWORD = "1061993";

const entered = prompt("Enter password:");

if (entered !== PASSWORD) {
    document.body.innerHTML = "<h2>Access denied</h2>";
    throw new Error("Unauthorized");
}
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";

// ------------------------------------------
// DYNAMIC DATE (GMT+1) -> 15NOV25
// Rule:
// - If GMT+1 hour == 0 (after midnight) => use today
// - Else (01..23) => use tomorrow
// ------------------------------------------
function getCZLDateGMT1() {
    const now = new Date();

    // Convert local time to UTC first, then add +1 hour
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const gmt1 = new Date(utcMs + 1 * 60 * 60 * 1000);

    const hour = gmt1.getHours();

    // Choose date according to rule
    const d = new Date(gmt1);
    if (hour !== 0) {
        d.setDate(d.getDate() + 1); // before midnight -> tomorrow
    }

    // Format DDMMMYY (e.g., 15NOV25)
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const mon = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);

    return `${day}${mon}${year}`;
}

// ---------------------
// SMART PDF TEXT READER
// ---------------------
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let finalText = "";

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();

        const lines = {};
        content.items.forEach((item) => {
            const y = Math.round(item.transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item.str);
        });

        const sortedY = Object.keys(lines).sort((a, b) => b - a);

        sortedY.forEach((y) => {
            const line = lines[y].join(" ").replace(/\s+/g, " ").trim();
            finalText += line + "\n";
        });

        finalText += "\n=== PAGE BREAK ===\n\n";
    }

    return finalText;
}

// ------------------------------------------
// PARSE CZL BLOCKS
// ------------------------------------------
function extractBlocks(text) {
    const lines = text.split(/\r?\n/);
    const results = [];
    let block = [];

    for (let line of lines) {
        if (line.includes("CZL -")) {
            if (block.length > 0) {
                const parsed = processBlock(block);
                if (parsed.length) results.push(...parsed);
                block = [];
            }
        }
        block.push(line);
    }

    if (block.length) {
        const parsed = processBlock(block);
        if (parsed.length) results.push(...parsed);
    }

    return results;
}

// -------------------------
// PROCESS ONE FLIGHT BLOCK
// -------------------------
function processBlock(blockLines) {
    let flightNo = null;
    let crew = [];

    for (let line of blockLines) {
        if (line.includes("CZL -")) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) flightNo = m[0];
        }

        if (line.includes("#")) {
            const m = line.match(/\b(CP|FO|PC|CC|FA)\b/);
            if (!m) continue;
            let clean = line.slice(m.index).split("#")[0].trim();
            crew.push(clean);
        }
    }

    if (!flightNo || crew.length === 0) return [];

    const sep = flightNo.length === 3 ? "-----" : "------";
    return ["", `AH${flightNo}`, sep, ...crew];
}

// -------------------------
// MAIN PROCESS FUNCTION
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) return;

    const raw = await readPDF(file);
    document.getElementById("resultBox").value = raw;

    const blocks = extractBlocks(raw);

    const dynamicDate = getCZLDateGMT1();

    const header = [
        "DEAR ON DUTY",
        `PLEASE PROCEED WITH RESERVING SEATS FOR S1 AS LISTED BELOW FOR ${dynamicDate}`,
        ""
    ];

    const footer = [
        "",
        "KIND REGARDS",
        "OPS CZL TEAM",
        "BOUTOUT"
    ];

    const finalOut = [...header, ...blocks, ...footer].join("\n");
    document.getElementById("resultBox").value = finalOut;
}

// -------------------------
// BUTTON FEEDBACK (new)
// -------------------------
function flashCopiedOnButton() {
    const btn = document.querySelector(".success-btn");
    const old = btn.innerText;

    btn.innerText = "Copied ✓";
    btn.style.background = "#16a34a";

    setTimeout(() => {
        btn.innerText = old;
        btn.style.background = "#22c55e";
    }, 1200);
}

// -------------------------
// PROCESS + COPY (one button)
// -------------------------
async function processAndCopy() {
    await processPDF();

    navigator.clipboard.writeText(
        document.getElementById("resultBox").value
    );

    flashCopiedOnButton();
}
