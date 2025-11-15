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
// CLEAN RAW PDF TEXT  (IMPORTANT FIX HERE!!)
// -------------------------
function cleanRawPDF(raw) {

    // Remove airport table content
    raw = raw.replace(/AIR ALGERIE[\s\S]*?Total records[\s\S]*?\d+/gi, " ");

    // 🔥 FIX PDF.js broken text (join separated uppercase letters)
    // Example: "C P  B O U T A L E B" → "CP BOUTALEB"
    raw = raw.replace(/(?:\b[A-Z]\s)+(?:[A-Z]\b)/g, m => m.replace(/\s+/g, ""));

    // Normalize spaces
    raw = raw.replace(/\s+/g, " ").trim();

    return raw;
}


// -------------------------
// EXTRACT FLIGHTS (CZL - XXX ####)
// -------------------------
function extractFlights(cleaned) {
    let flights = [...cleaned.matchAll(/CZL\s*-\s*\w+\s+(\d{3,4})/g)];
    return flights.map(m => ({
        number: m[1],   // 6190, 6194, 6027, etc.
        index: m.index  // position in text
    }));
}


// -------------------------
// EXTRACT CREW LINES
// -------------------------
function extractCrewLines(cleaned) {

    // Restore line breaks artificially
    cleaned = cleaned.replace(/(CP|FO|PC|CC|FA|FE)\s+/g, "\n$1 ");

    let lines = cleaned.split("\n");

    // Crew lines detected by rank code only
    let crew = lines
        .map(l => l.trim())
        .filter(l => /^(CP|FO|PC|CC|FA|FE)\b/.test(l));

    return crew;
}


// -------------------------
// ASSIGN CREW TO NEAREST CZL ABOVE
// -------------------------
function groupCrewByFlight(flights, crewLines, cleaned) {

    let positionedCrew = crewLines.map(cl => {
        let idx = cleaned.indexOf(cl);
        return { idx, text: cl };
    });

    let groups = {};
    flights.forEach(f => { groups[f.number] = []; });

    for (let c of positionedCrew) {
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
// BUILD AH BLOCKS
// -------------------------
function buildAHBlocks(groups) {
    let blocks = [];

    for (let fn of Object.keys(groups)) {
        let sep = fn.length === 3 ? "-----" : "------";

        blocks.push("");
        blocks.push(`AH${fn}`);
        blocks.push(sep);

        for (let crew of groups[fn]) {
            blocks.push(crew);
        }
    }

    return blocks;
}


// -------------------------
// MAIN FUNCTION
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
// COPY BUTTON
// -------------------------
function copyResult() {
    const text = document.getElementById("resultBox").value;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}
