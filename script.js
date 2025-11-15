// -------------------------
// DATE FUNCTION
// -------------------------
function getDateForParagraph() {
    let now = new Date();
    let d = new Date();

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
// READ PDF FULLY
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
// CLEAN RAW PDF TEXT
// -------------------------
function cleanRawPDF(raw) {

    // Remove garbage airport tables
    raw = raw.replace(/AIR ALGERIE[\s\S]*?records\s*:\s*\d+/gi, " ");

    // Normalize spaces
    raw = raw.replace(/\s+/g, " ").trim();

    return raw;
}


// -------------------------
// Extract crew segments
// -------------------------
function splitIntoCrewEntries(cleaned) {
    // Insert newline before crew codes
    cleaned = cleaned.replace(/(CP|FO|PC|CC|FA|FE)\s+/g, "\n$1 ");

    // Split by newline
    let lines = cleaned.split("\n");

    // Keep only crew lines
    let crew = lines.filter(l => /^(CP|FO|PC|CC|FA|FE)\b/.test(l.trim()));

    return crew;
}


// -------------------------
// Extract flight segments
// -------------------------
function extractFlights(cleaned) {
    // Find all occurrences like: CZL - XXX ####
    let flights = [...cleaned.matchAll(/CZL\s*-\s*\w+\s+(\d{3,4})/g)]
        .map(m => m[1]);

    return flights;
}


// -------------------------
// Build AH blocks
// -------------------------
function buildAHBlocks(flightNumbers, crewLines) {
    let blocks = [];

    let crewIndex = 0;

    for (let fn of flightNumbers) {
        let sep = fn.length === 3 ? "-----" : "------";

        let block = ["", `AH${fn}`, sep];

        // Add crew lines sequentially
        while (crewIndex < crewLines.length) {
            let l = crewLines[crewIndex];

            // Stop when next flight appears in raw order
            // (We already mapped flights sequentially)
            if (/CZL\s*-\s*\w+\s+/.test(l)) break;

            block.push(l);
            crewIndex++;
        }

        blocks.push(...block);
    }

    return blocks;
}


// -------------------------
// MAIN PROCESSOR
// -------------------------
async function processPDF() {
    let file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Select a PDF first!");

    let raw = await readPDF(file);
    let cleaned = cleanRawPDF(raw);

    let crewLines = splitIntoCrewEntries(cleaned);
    let flightNumbers = extractFlights(cleaned);

    let blocks = buildAHBlocks(flightNumbers, crewLines);

    let header = [
        "DEAR ON DUTY",
        `PLEASE PROCEED WITH RESERVING SEATS FOR S1 AS LISTED BELOW FOR ${getDateForParagraph()}`
    ];

    let footer = [
        "",
        "KIND REGARDS",
        "OPS CZL TEAM",
        "BOUTOUT"
    ];

    let finalText = [...header, ...blocks, ...footer].join("\n").trim();

    document.getElementById("resultBox").value = finalText;
}


// -------------------------
// COPY TO CLIPBOARD
// -------------------------
function copyResult() {
    const text = document.getElementById("resultBox").value;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}
