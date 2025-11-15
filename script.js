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

    // Remove airport tables entirely
    raw = raw.replace(/AIR ALGERIE[\s\S]*?Total records[\s\S]*?\d+/gi, " ");

    // Normalize spaces
    raw = raw.replace(/\s+/g, " ").trim();

    return raw;
}


// -------------------------
// Extract CZL flights (in order)
// -------------------------
function extractFlights(cleaned) {
    let flights = [...cleaned.matchAll(/CZL\s*-\s*\w+\s+(\d{3,4})/g)];
    return flights.map(m => ({
        number: m[1],
        index: m.index  // position in text
    }));
}


// -------------------------
// Extract crew lines
// -------------------------
function extractCrewLines(cleaned) {
    // Insert newlines before crew codes
    cleaned = cleaned.replace(/(CP|FO|PC|CC|FA|FE)\s+/g, "\n$1 ");

    let lines = cleaned.split("\n");

    // Keep ONLY crew lines containing #
    let crew = lines
        .map(l => l.trim())
        .filter(l => /^(CP|FO|PC|CC|FA|FE)\b/.test(l) && l.includes("#"))
        .map(l => l.split("#")[0].trim()); // remove "after #"

    return crew;
}


// -------------------------
// Group crew to closest CZL ABOVE (Python logic)
// -------------------------
function groupCrewByFlight(flights, crewLines, cleaned) {

    // Assign each crew line the index of its appearance in the raw text
    let positionedCrew = crewLines.map(cl => {
        let idx = cleaned.indexOf(cl);
        return { idx, text: cl };
    });

    let groups = {};

    flights.forEach(f => { groups[f.number] = []; });

    for (let c of positionedCrew) {

        // Find the nearest CZL ABOVE this crew line
        let closest = null;
        let closestDist = Infinity;

        for (let f of flights) {
            if (f.index < c.idx) {  
                let dist = c.idx - f.index;
                if (dist < closestDist) {
                    closestDist = dist;
                    closest = f.number;
                }
            }
        }

        if (closest) {
            groups[closest].push(c.text);
        }
    }

    return groups;
}


// -------------------------
// Build final AH blocks
// -------------------------
function buildAHBlocks(groups) {
    let blocks = [];

    for (let fn of Object.keys(groups)) {
        let sep = fn.length === 3 ? "-----" : "------";

        blocks.push(""); // blank line
        blocks.push(`AH${fn}`);
        blocks.push(sep);

        for (let crew of groups[fn]) {
            blocks.push(crew);
        }
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

    let flights = extractFlights(cleaned);
    let crewLines = extractCrewLines(cleaned);

    let grouped = groupCrewByFlight(flights, crewLines, cleaned);
    let blocks = buildAHBlocks(grouped);

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
