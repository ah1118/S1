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
        // Just concatenate all text with spaces – we'll parse it ourselves
        text += content.items.map(it => it.str).join(" ") + " ";
    }

    return text;
}


// -------------------------
// PROCESS ONE CZL BLOCK  (string, not lines)
// EXACT PYTHON LOGIC
// -------------------------
function processBlockString(blockStr) {
    // 1) Find flight number after "CZL" (3–4 digits)
    const flightMatch = blockStr.match(/CZL[\s\S]*?\b(\d{3,4})\b/);
    if (!flightMatch) return []; // no flight number → ignore

    const digit = flightMatch[1];

    // 2) Find crew segments with '#'
    // pattern: (CP|FO|PC|CC|FA|FE) ... #
    const crewRegex = /\b(CP|FO|PC|CC|FA|FE)\b([\s\S]*?)#/g;
    const tempBlock = [];
    let m;

    while ((m = crewRegex.exec(blockStr)) !== null) {
        // m[1] = rank (CP/FO/...)
        // m[2] = text until '#'
        let crewText = (m[1] + m[2]).replace(/\s+/g, " ").trim();
        tempBlock.push(crewText);
    }

    if (!tempBlock.length) return []; // no crew with # → ignore, like Python

    const sep = digit.length === 3 ? "-----" : "------";

    return [
        "",
        `AH${digit}`,
        sep,
        ...tempBlock
    ];
}


// -------------------------
// SPLIT RAW INTO CZL BLOCKS (EXACT PYTHON IDEA)
// -------------------------
function extractAllBlocks(raw) {
    const results = [];

    // Find every occurrence of "CZL" in the raw text
    const czlMatches = [...raw.matchAll(/CZL/g)];
    if (!czlMatches.length) return results;

    for (let i = 0; i < czlMatches.length; i++) {
        const start = czlMatches[i].index;
        const end = (i + 1 < czlMatches.length) ? czlMatches[i + 1].index : raw.length;
        const blockStr = raw.slice(start, end);

        const blockLines = processBlockString(blockStr);
        if (blockLines.length) {
            results.push(...blockLines);
        }
    }

    return results;
}


// -------------------------
// MAIN PROCESSOR
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) {
        alert("Select a PDF first!");
        return;
    }

    let raw = await readPDF(file);

    // Normalize spaces a bit (optional)
    raw = raw.replace(/[ ]{2,}/g, " ").trim();

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
