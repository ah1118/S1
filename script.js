// -------------------------
// PDF.js WORKER (MANDATORY)
// -------------------------
pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js";


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

    console.log("RAW PDF TEXT:", text);   // Debug
    return text;
}


// -------------------------
// CLEAN RAW PDF TEXT (IMPORTANT FIX)
// -------------------------
function cleanRawPDF(raw) {

    raw = raw.replace(/AIR ALGERIE[\s\S]*?Total records[\s\S]*?\d+/gi, " ");

    // FIX PDF.js BROKEN TEXT:
    // Example: "C P  B O U T A L E B" → "CP BOUTALEB"
    raw = raw.replace(/(?:\b[A-Z]\s)+(?:[A-Z]\b)/g,
        m => m.replace(/\s+/g, "")
    );

    raw = raw.replace(/\s+/g, " ").trim();

    console.log("CLEANED TEXT:", raw); // Debug
    return raw;
}


// -------------------------
// EXTRACT FLIGHTS (CZL - XXX ####)
// -------------------------
function extractFlights(cleaned) {
    let flights = [...cleaned.matchAll(/CZL\s*-\s*\w+\s+(\d{3,4})/g)];

    console.log("FLIGHTS FOUND:", flights);

    return flights.map(m => ({
        number: m[1],
        index: m.index
    }));
}


// -------------------------
// EXTRACT CREW LINES
// -------------------------
function extractCrewLines(cleaned) {

    cleaned = cleaned.replace(/(CP|FO|PC|CC|FA|FE)\s+/g, "\n$1 ");

    let lines = cleaned.split("\n");

    let crew = lines
        .map(l => l.trim())
        .filter(l => /^(CP|FO|PC|CC|FA|FE)\b/.test(l));

    console.log("CREW LINES:", crew);

    return crew;
}


// -------------------------
// ASSIGN CREW TO NEAREST CZL ABOVE
// -------------------------
function groupCrewByFlight(flights, crewLines, cleaned) {

    let positionedCrew = crewLines.map(cl => {
        return {
            text: cl,
            idx: cleaned.indexOf(cl)
        };
    });

    let groups = {};
    flights.forEach(f => (groups[f.number] = []));

    for (let c of positionedCrew) {

        let closest = null;
        let minDist = Infinity;

        for (let f of flights) {
            if (f.index < c.idx) {
                let d = c.idx - f.index;
                if (d < minDist) {
                    minDist = d;
                    closest = f.number;
                }
            }
        }

        if (closest) groups[closest].push(c.text);
    }

    console.log("GROUPED CREW:", groups);

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

        for (let c of groups[fn]) {
            blocks.push(c);
        }
    }

    return blocks;
}


// -------------------------
// PROCESS PDF
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
    let text = document.getElementById("resultBox").value;
    navigator.clipboard.writeText(text);
    alert("Copied!");
}
