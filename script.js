function processPythonStyle(rawText) {

    const lines = rawText.split(/\r?\n/);

    let results = [];
    let block = [];
    let insideBlock = false;

    for (let line of lines) {

        if (line.includes("CZL -")) {  // start of block
            if (block.length > 0) {
                results.push(...processBlock(block));
                block = [];
            }
            insideBlock = true;
        }

        if (insideBlock) {
            block.push(line);
        }
    }

    // last block
    if (block.length > 0) {
        results.push(...processBlock(block));
    }

    return results;
}

// SAME LOGIC AS PYTHON process_block()
function processBlock(blockLines) {
    let tempBlock = [];
    let digit = null;

    for (let line of blockLines) {

        // FIND 3–4 DIGIT FLIGHT NUMBER ON CZL LINE
        if (line.includes("CZL -")) {
            const m = line.match(/\b\d{3,4}\b/);
            if (m) digit = m[0];
        }

        // CREW LINE MUST CONTAIN #
        if (line.includes("#")) {
            const km = line.match(/\b(CP|FO|PC|CC|FA|FE)\b/);
            if (km) {
                const start = km.index;
                const sliced = line.slice(start);
                const cleaned = sliced.split("#")[0].trim();
                tempBlock.push(cleaned);
            }
        }
    }

    if (digit && tempBlock.length > 0) {
        const sep = digit.length === 3 ? "-----" : "------";

        return [
            "",
            `AH${digit}`,
            sep,
            ...tempBlock
        ];
    }

    return [];
}


// MAIN WRAPPER FOR BUTTON
function buildFinalOutput() {
    const raw = document.getElementById("rawInput").value;

    let blocks = processPythonStyle(raw);

    let header = [
        "DEAR ON DUTY",
        `PLEASE PROCEED WITH RESERVING SEATS FOR S1 AS LISTED BELOW FOR ${getDateForParagraph()}`,
        ""
    ];

    let footer = [
        "",
        "KIND REGARDS",
        "OPS CZL TEAM",
        "BOUTOUT"
    ];

    const finalText = [...header, ...blocks, ...footer].join("\n").trim();

    document.getElementById("resultBox").value = finalText;
}
