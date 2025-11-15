// Get correct date (today or tomorrow after 18:00)
function getDateForParagraph() {
    let now = new Date();
    let today = new Date();

    let hours = now.getHours();
    if (hours >= 18) {
        today.setDate(today.getDate() + 1);
    }

    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    let dd = String(today.getDate()).padStart(2, "0");
    let mm = months[today.getMonth()];
    let yy = String(today.getFullYear()).slice(2);

    return `${dd}${mm}${yy}`;
}

// Reads PDF → returns all text
async function readPDF(file) {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        let page = await pdf.getPage(i);
        let content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
    }

    return text;
}

// Extract block like Python version
function processBlock(blockLines) {
    let temp = [];
    let digit = null;

    for (let line of blockLines) {
        if (line.includes("CZL")) {
            let m = line.match(/\b\d{3,4}\b/);
            if (m) digit = m[0];
        }

        if (line.includes("#")) {
            let m = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (m) {
                let cut = line.substring(m.index).split("#")[0].trim();
                temp.push(cut);
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

// MAIN HANDLER
async function processPDF() {
    let file = document.getElementById("pdfInput").files[0];
    if (!file) {
        alert("Select a PDF first!");
        return;
    }

    let pdfText = await readPDF(file);
    let lines = pdfText.split("\n");

    let results = [];
    let block = [];
    let insideBlock = false;

    for (let line of lines) {
        if (line.includes("CZL")) {
            if (block.length) {
                results.push(...processBlock(block));
                block = [];
            }
            insideBlock = true;
        }
        if (insideBlock) block.push(line);
    }

    if (block.length) results.push(...processBlock(block));

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

    document.getElementById("box").value = finalText;
}

// Copy result
function copyText() {
    let txt = document.getElementById("box").value;
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    alert("Copied!");
}
