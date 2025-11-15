// Get TODAY or TOMORROW 18:00 rule
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


// Read PDF fully
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Join items but preserve some spacing
        let pageText = content.items.map(it => it.str).join(" ");
        text += pageText + "\n";
    }

    return text;
}


// Process each block (converted from Python logic)
function processBlock(blockLines) {
    let temp = [];
    let digit = null;

    for (let line of blockLines) {
        // Detect flight number
        let m = line.match(/\b\d{3,4}\b/);
        if (line.includes("CZL") && m) {
            digit = m[0];
        }

        // Extract CP, FO, CC, FA, FE
        if (line.includes("#")) {
            let crew = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (crew) {
                let sub = line.substring(crew.index).split("#")[0].trim();
                temp.push(sub);
            }
        }
    }

    if (!digit || temp.length === 0) return [];

    let sep = digit.length === 3 ? "-----" : "------";

    return [
        "",
        `AH${digit}`,
        sep,
        ...temp
    ];
}


// MAIN PDF PROCESSOR
async function processPDF() {
    let file = document.getElementById("pdfInput").files[0];
    if (!file) {
        alert("Select a PDF file first!");
        return;
    }

    let raw = await readPDF(file);
    let lines = raw.split(/\n+/);

    let results = [];
    let block = [];
    let inside = false;

    for (let line of lines) {
        if (line.includes("CZL")) {
            if (block.length) {
                results.push(...processBlock(block));
                block = [];
            }
            inside = true;
        }

        if (inside) block.push(line);
    }

    if (block.length) {
        results.push(...processBlock(block));
    }

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

    let finalText = [...header, ...results, ...footer].join("\n").trim();

    document.getElementById("resultBox").value = finalText;
}


// Copy to clipboard
function copyResult() {
    const text = document.getElementById("resultBox").value;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}
