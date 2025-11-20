
function niceShadow() {
    return `box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;`
}

function Card(title, body) {

    let html = `
        <div>
            <style> @scope {
                :scope {
                    background-color: white;
                    color: black;
                    
                    padding: 4px 20px 7px 20px;
                    margin:  0px 20px 20px 20px;
                    border-radius: 15px;
                    
                    ${niceShadow()}
                    
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }
                h3 {
                    margin-bottom: -5px;
                }
            }</style>
            <h3>${title}</h3>
            <p>${body}</p>
        </div>
    `
    return html;
}

export function renderComponentStuff() {

    return `
        <div style="margin-top: 40px">
            ${Card("Doggos", "Woooff Wofooff lorem ipsum")}
            ${Card("Kitties", "Scratch meowfs")}
            ${Card("Froggies", "Quack Queeck. I'm actually a duck.")}
        </div>
    `
}