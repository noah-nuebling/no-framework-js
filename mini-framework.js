// Implementation of the `Idea - quote-unquote-framework` (See our notes repo, [Nov 2025])

// Helper functions (~30 lines total)
export const qs = (...args) => {
    if (args.length >= 2) return args[0].querySelector(args[1]);
    else                 return document.querySelector(args[0]);
};
export const listen = function (obj, eventname, callback) { obj.addEventListener(eventname, callback) }

const instanceCallbacks = new Map();
let instanceCounter = 0;
let xComponentIsInitialized = false;

export function wrapInCustomElement(innerHtml, { mounted }) {
    const id = `inst-${instanceCounter++}`;
    instanceCallbacks.set(id, mounted);

    if (!xComponentIsInitialized) {
        class CustomElement extends HTMLElement {
            connectedCallback() {
                const id = this.dataset.instanceId;
                if (id && instanceCallbacks.has(id)) {
                    instanceCallbacks.get(id).call(this);
                    instanceCallbacks.delete(id);
                }
            }
        }
        customElements.define('x-component', CustomElement);
        xComponentIsInitialized = true;
    }

    return `<x-component data-instance-id="${id}">${innerHtml}</x-component>`;
}

export const observe = function (obj, prop, callback, triggerImmediately = true) {

    const callbacksKey = `__observers_${prop}__`;

    if (!obj[callbacksKey]) {
        // First time observing this property
        let value = obj[prop];
        obj[callbacksKey] = [];

        Object.defineProperty(obj, prop, {
            get: () => value,
            set: (newVal) => {
                value = newVal;
                obj[callbacksKey].forEach(cb => cb(newVal));
            },
        });
    }

    obj[callbacksKey].push(callback);

    if (triggerImmediately) callback(obj[prop]);
}

export function observeMultiple(objsAndProps, callback, triggerImmediately = true) {
    objsAndProps.forEach(x => observe(x[0], x[1], callback, false));
    if (triggerImmediately) callback();
}