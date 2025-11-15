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

        text += content.items.map(it => it.str).join(" ") + "\n";
    }

    return text;
}


// -------------------------
// CLEAN & SPLIT CREW LINES
// -------------------------
function extractCrewLines(raw) {

    // Remove entire flight info segments EXCEPT crew codes
    raw = raw.replace(/CZL\s*-[^-]*?J/g, " "); // remove route + aircraft + schedule

    // Normalize spaces
    raw = raw.replace(/\s+/g, " ");

    // Insert NEWLINE before crew codes
    raw = raw.replace(/(CP|FO|PC|CC|FA|FE)\s+/g, "\n$1 ");

    let lines = raw.split("\n");

    // Keep only CLEAN crew lines
    return lines
        .map(l => l.trim())
        .filter(l => /^(CP|FO|PC|CC|FA|FE)\b/.test(l));
}


// -------------------------
// DETECT AH BLOCKS
// -------------------------
function detectBlocks(raw, crewLines) {
    let results = [];

    // Find ALL flight numbers (3 or 4 digits)
    let nums = raw.match(/\b\d{3,4}\b/g) || [];

    // Unique them
    nums = [...new Set(nums)];

    nums.forEach(num => {
        let sep = num.length === 3 ? "-----" : "------";
        let block = [``, `AH${num}`, sep];

        // Add all crew lines that belong to this block
        crewLines.forEach(line => {
            // Very important: each crew belongs to nearest AH flight number
            // → Best simple rule: include all crew until next AH appears
            // Since PDF.js merges, we include ALL — Python also did this
            block.push(line);
        });

        results.push(...block);
        crewLines = []; // reset for next AH
    });

    return results;
}


// -------------------------
// MAIN PROCESSING
// -------------------------
async function processPDF() {
    let file = document.getElementById("pdfInput").files[0];
    if (!file) return alert("Select a PDF first!");

    let raw = await readPDF(file);

    let crewLines = extractCrewLines(raw);
    let blocks = detectBlocks(raw, crewLines);

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
