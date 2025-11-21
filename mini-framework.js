// Implementation of the `Idea - quote-unquote-framework` (See our notes repo, [Nov 2025])

export const qs = (...args) => {
    if (args.length >= 2) return args[0].querySelector(args[1]);
    else                 return document.querySelector(args[0]);
};
export const listen = function (obj, eventname, callback) { obj.addEventListener(eventname, callback) }

 /* outlet() is meant for components since you can't define ids/classes on the <mf-component> root node directly from the outside.
    Usage: 
        - Give the component an identifier `<htmlstuff>${MyComponent().outlet('my-component-id')}</htmlstuff>`
        - Later, get a reference to the <mf-component> root node of MyComponent() using getOutlet('my-component-id')
        [Nov 2025] 
    TODO: 
        -> Maybe move this into the `Idea - quote-unquote-framework` doc.
*/
String.prototype.outlet = function (id) {
    return `<div class="outlet ${id}" style="display: contents">${this}</div>`
}

export const getOutlet = (root, id) => {
    return qs(root, `.outlet.${id} > *`)
}

const instanceCallbacks = new Map();
let instanceCounter = 0;
let xComponentIsInitialized = false;

export function wrapInCustomElement(innerHtml, { mounted }) {
    const id = `${instanceCounter++}`;
    instanceCallbacks.set(id, mounted);

    if (!xComponentIsInitialized) {
        class CustomElement extends HTMLElement {
            connectedCallback() {
                const id = this.dataset.id; // Retrieve data-id=...
                if (id && instanceCallbacks.has(id)) {
                    instanceCallbacks.get(id).call(this);
                    instanceCallbacks.delete(id);
                }
            }
        }
        customElements.define('mf-component', CustomElement);
        xComponentIsInitialized = true;
    }

    return `<mf-component data-id="${id}">${innerHtml}</mf-component>`;
}

export const observe = function (obj, prop, callback, triggerImmediately = true) {

    if (!obj[`__mf-observers_${prop}__`]) { // First time observing this property
        obj[`__mf-observers_${prop}__`] = [];

        let value = obj[prop];
        Object.defineProperty(obj, prop, {
            get: () => value,
            set: (newVal) => {
                value = newVal;
                obj[`__mf-observers_${prop}__`].forEach(cb => cb(newVal));
            },
        });
    }

    obj[`__mf-observers_${prop}__`].push(callback);

    if (triggerImmediately) callback(obj[prop]);
}

export function observeMultiple(objsAndProps, callback, triggerImmediately = true) {
    objsAndProps.forEach(x => observe(x[0], x[1], callback, false));
    if (triggerImmediately) callback();
}