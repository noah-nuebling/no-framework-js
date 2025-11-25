

export function mflog(s) {
    console.log(s);
}

/**@param {string} s */
export function dedent(s) {

    let lines = s.split('\n')

    let smallestIndent = Infinity;
    for (let line of lines) {
        let indent = line.search(/[^ ]/)
        if (indent !== -1) {
            smallestIndent = Math.min(smallestIndent, indent);
        }
    }

    if (smallestIndent !== Infinity) {
        for (let i of lines.keys()) {
            lines[i] = lines[i].substring(smallestIndent, undefined);
            lines[i] = lines[i].trimEnd(); // Turn blank lines into '' emptystring.
        }
    }

    if (lines.at(0)  === '') lines = lines.slice(1, undefined)
    if (lines.at(-1) === '') lines = lines.slice(undefined, -1)

    let result = lines.join('\n')

    return result;
}