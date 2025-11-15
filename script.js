// -------------------------
// PDF.js worker
// -------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";


// -------------------------
// DATE FUNCTION
// -------------------------
function getDateForParagraph() {
    const now = new Date();
    const d = new Date();

    if (now.getHours() >= 18) {
        d.setDate(d.getDate() + 1);
    }

    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = months[d.getMonth()];
    const yy = d.getFullYear().toString().slice(2);

    return `${dd}${mm}${yy}`;
}


// -------------------------
// READ PDF (PDF.js)
// -------------------------
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(" ") + " ";
    }

    return text;
}


// -------------------------
// REBUILD LINES – SUPER IMPORTANT
// -------------------------
function rebuildLines(raw) {

    // newline before CZL flight lines (ONLY valid ones)
    raw = raw.replace(/(?=CZL\s*-\s*[A-Z]{3}\s+\d{3,4}\b)/g, "\n");

    // newline before crew prefixes
    raw = raw.replace(/\s+(?=(CP|FO|PC|CC|FA|FE)\b)/g, "\n");

    raw = raw.replace(/[ ]{2,}/g, " "); // normalize spaces

    return raw.trim();
}


// -------------------------
// PROCESS ONE BLOCK (Python logic)
// -------------------------
function processBlock(blockLines) {
    let tempBlock = [];
    let digit = null;

    for (let line of blockLines) {

        // detect flight number only on VALID CZL flight line
        if (/CZL\s*-\s*[A-Z]{3}\s+\d{3,4}\b/.test(line)) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) digit = m[0];
        }

        // crew with #
        if (line.includes("#")) {
            const km = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (km) {
                const cleaned = line.slice(km.index).split("#")[0].trim();
                tempBlock.push(cleaned);
            }
        }
    }

    if (digit && tempBlock.length > 0) {
        const sep = digit.length === 3 ? "-----" : "------";
        return ["", `AH${digit}`, sep, ...tempBlock];
    }

    return [];
}


// -------------------------
// EXTRACT ALL BLOCKS (Python logic)
// -------------------------
function extractAllBlocks(raw) {
    const lines = raw.split(/\r?\n/);

    let results = [];
    let block = [];
    let inside = false;

    for (let line of lines) {

        // VALID CZL HEADER (prevents fake flights)
        const isFlightLine = /CZL\s*-\s*[A-Z]{3}\s+\d{3,4}\b/.test(line);

        if (isFlightLine) {
            if (block.length > 0) {
                results.push(...processBlock(block));
                block = [];
            }
            inside = true;
        }

        if (inside) block.push(line);
    }

    if (block.length > 0) {
        results.push(...processBlock(block));
    }

    return results;
}


// -------------------------
// MAIN PROCESSOR
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Select a PDF first!");

    let raw = await readPDF(file);

    // FIX broken PDF.js structure
    raw = rebuildLines(raw);

    // Extract blocks identical to Python
    const results = extractAllBlocks(raw);

    const header = [
        "DEAR ON DUTY",
        `PLEASE PROCEED WITH RESERVING SEATS FOR S1 AS LISTED BELOW FOR ${getDateForParagraph()}`
    ];

    const footer = [
        "",
        "KIND REGARDS",
        "OPS CZL TEAM",
        "BOUTOUT"
    ];

    const finalText = [...header, ...results, ...footer].join("\n").trim();

    document.getElementById("resultBox").value = finalText;
}


// -------------------------
// COPY BUTTON
// -------------------------
function copyResult() {
    const text = document.getElementById("resultBox").value;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}
