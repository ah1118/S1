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

        // Items already contain newlines in this PDF, so just join
        text += content.items.map(it => it.str).join(" ") + "\n";
    }

    console.log("RAW PDF TEXT:\n", text);
    return text;
}


// -------------------------
// PROCESS ONE CZL BLOCK  (same as Python process_block)
// -------------------------
function processBlock(blockLines) {
    let tempBlock = [];
    let digit = null;

    for (let line of blockLines) {
        // 1) find flight number on CZL line (3 or 4 digits)
        if (line.includes("CZL")) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) digit = m[0];
        }

        // 2) crew lines that contain '#'
        if (line.includes("#")) {
            const km = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (km) {
                const start = km.index;
                const lineFromKeyword = line.slice(start);
                const cleaned = lineFromKeyword.split("#")[0].trim();
                tempBlock.push(cleaned);
            }
        }
    }

    if (digit && tempBlock.length > 0) {
        const sep = digit.length === 3 ? "-----" : "------";
        const out = [];
        out.push("");                // blank line before AH
        out.push(`AH${digit}`);
        out.push(sep);
        for (let c of tempBlock) out.push(c);
        return out;
    } else {
        return [];
    }
}


// -------------------------
// PROCESS WHOLE RAW TEXT (same as Python copy_lines logic)
// -------------------------
function extractAllBlocks(raw) {
    const lines = raw.split(/\r?\n/);

    const results = [];
    let block = [];
    let insideBlock = false;

    for (let line of lines) {
        if (line.includes("CZL")) {
            if (block.length > 0) {
                results.push(...processBlock(block));
                block = [];
            }
            insideBlock = true;
        }
        if (insideBlock) {
            block.push(line);
        }
    }

    if (block.length > 0) {
        results.push(...processBlock(block));
    }

    return results;
}


// -------------------------
// MAIN FUNCTION
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) {
        alert("Select a PDF first!");
        return;
    }

    const raw = await readPDF(file);

    // We do NOT remove "AIR ALGERIE..." etc.
    // We just look for lines containing "CZL" exactly like Python.
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
