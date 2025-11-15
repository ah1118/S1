pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";

// ---------------------
// SMART PDF TEXT READER
// ---------------------
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let finalText = "";

    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();

        // group text by Y position
        const lines = {};
        content.items.forEach((item) => {
            const y = Math.round(item.transform[5]);
            if (!lines[y]) lines[y] = [];
            lines[y].push(item.str);
        });

        // sort top → bottom
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
// PARSE CZL BLOCKS EXACTLY LIKE PYTHON DID
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
        // extract flight number (3-4 digits)
        if (line.includes("CZL -")) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) flightNo = m[0];
        }

        // extract only crew lines with "#"
        if (line.includes("#")) {
            const m = line.match(/\b(CP|FO|PC|CC|FA)\b/);
            if (!m) continue;
            let clean = line.slice(m.index).split("#")[0].trim();
            crew.push(clean);
        }
    }

    if (!flightNo || crew.length === 0) return [];

    const sep = flightNo.length === 3 ? "-----" : "------";
    return [
        "",
        `AH${flightNo}`,
        sep,
        ...crew
    ];
}

// -------------------------
// MAIN FUNCTION
// -------------------------
async function processPDF() {
    const file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Select a PDF!");

    const raw = await readPDF(file);
    document.getElementById("resultBox").value = raw; // TEMP: show raw text

    const blocks = extractBlocks(raw);

    const header = [
        "DEAR ON DUTY",
        "PLEASE PROCEED WITH RESERVING SEATS FOR S1 AS LISTED BELOW FOR 15NOV25",
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
function copyResult() {
    navigator.clipboard.writeText(
        document.getElementById("resultBox").value
    );
    alert("Copied!");
}

async function processAndCopy() {
    await processPDF();   // 1) Process normally
    copyResult();         // 2) Auto-copy output
}
