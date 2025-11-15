// -------------------------
// PDF.js Worker
// -------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";


// -------------------------
// DATE GENERATOR
// -------------------------
function getDateForParagraph() {
    const now = new Date();
    const d = new Date();

    if (now.getHours() >= 18) {
        d.setDate(d.getDate() + 1);
    }

    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    let dd = String(d.getDate()).padStart(2, "0");
    let mm = months[d.getMonth()];
    let yy = d.getFullYear().toString().slice(2);

    return `${dd}${mm}${yy}`;
}


// -------------------------
// READ PDF AS RAW TEXT
// -------------------------
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(" ") + "\n";
    }

    return text;
}


// -------------------------
// PROCESS ONE CZL BLOCK (Python logic)
// -------------------------
function processBlock(blockLines) {
    let tempBlock = [];
    let digit = null;

    for (let line of blockLines) {

        if (line.includes("CZL")) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) digit = m[0];
        }

        if (line.includes("#")) {
            const m = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (m) {
                const start = m.index;
                const extracted = line.slice(start).split("#")[0].trim();
                tempBlock.push(extracted);
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
// PROCESS RAW PDF TEXT
// -------------------------
function extractAllBlocks(raw) {
    let lines = raw.split(/\r?\n/);

    let results = [];
    let block = [];
    let inside = false;

    for (let line of lines) {
        if (line.includes("CZL")) {
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
// MAIN PROCESS
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Please select PDF");

    const raw = await readPDF(file);

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
// COPY
// -------------------------
function copyResult() {
    navigator.clipboard.writeText(
        document.getElementById("resultBox").value
    );
    alert("Copied!");
}
