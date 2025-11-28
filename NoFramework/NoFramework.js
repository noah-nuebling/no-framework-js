// Implementation of the `Idea - quote-unquote-framework` (See our notes repo, [Nov 2025])

import { dedent, mflog } from "../utils.js"; // TODO: Organize these internal helpers.

// NoFramework coding guideline:
//      Don't use setTimeout() in the framework code! -> It forces the user to also use setTimeout() to wait for our updates.

// MARK: Sugar for finding elements in the DOM

    export function qs(...args) {
        if (args.length >= 2) return args[0].querySelector(args[1]);
        else                 return document.querySelector(args[0]);
    };

     /* outlet() is meant for components since you can't define ids/classes on the <mf-custom-element> root node directly from the outside.
        Usage:
            - Give the component an identifier in your declarative UI:
                let html = `...<htmlstuff>${ MyComponent().outlet('my-component-id') }</htmlstuff>...`
            - After the component has been rendered in the DOM, get a reference, so you can observe its properties etc.
                let myComponent = getOutlet('my-component-id')
            [Nov 2025]
        TODO:
            -> Maybe move this into the `Idea - quote-unquote-framework` doc.
        TODO: 'polluting the global name space' is usually not done in JS. (Says Claude) Component libraries would have to rename this to avoid conflicts. Maybe shouldn't do this at all, and just make outlet() a regular function.
                ... Or just give it a namespace prefix – mf_outlet – like is done in objc.
    */
    String.prototype.outlet = function (id) {
        return `<div class="outlet ${id}" style="display: contents">${this}</div>`
    }

    export function getOutlet(...args) {
        if (args.length >= 2) return qs(args[0],  `.${args[1]} > *`); /// TODO: (This kinda sucks for querying nested components) (But if implementation is simple, users feel confident switching back to qs() for complex cases?)
        else                  return qs(document, `.${args[0]} > *`);
    }

// MARK: wrapInCustomElement – primitive for adding javascript to components.

    let inits = {};
    let instanceCounter = 0;

    export function wrapInCustomElement(innerHtml, { init, dbgname }) {

        let id = `${instanceCounter++}`;

        inits[id] = init;

        if (!window.customElements.get('mf-custom-element')) {

            window.customElements.define('mf-custom-element', class extends HTMLElement {
                constructor() {
                    
                    super();                    
                    window.customElements.upgrade(this); // Make children's constructor()s run first. Thanks to https://stackoverflow.com/a/72150717. Shame on merchant of complexity @annevk in GitHub for making this complicated for everyone and being condescending about it. [Nov 2025]
                    
                    mflog(`mf-custom-element constructor(): ${this.dataset.dbgname} (${this.dataset.instanceid})`);
                    
                    let id = this.dataset.instanceid;
                    if (!inits[id]) throw error_wrapInCustomElement_footgun1(this);  // FOOTGUN PROTECTION
                    inits[id].call(this);
                    delete inits[id];
                }
            });
        }

        return `
            <mf-custom-element 
                data-dbgname="${dbgname}" 
                data-instanceid="${id}" 
                style="display: contents"
            >
                ${innerHtml}
            </mf-custom-element>`;
    }


// MARK: 'Reactive' primitives for UI <-> model syncing

    export function listen(obj, eventname, callback, triggerImmediately = false) {
        obj.addEventListener(eventname, () => callback())
        if (triggerImmediately) callback();
    }

    export function observe(obj, prop, callback, triggerImmediately = true) {

        // FOOTGUN PROTECTION
        {

            // Check types and stuff
            //      Just adding errors for problems I actually find myself making.
            if (!(callback instanceof Function)) throw error_observe_notafunction(callback);
            if (!obj)                            throw error_observe_nilobj(obj);
            
            //  Catch footgun of trying to observe a computed property, like `HTMLSelectElement.value`
            //      TODO: This validation could lead to conflicts if a component-library uses something other than `__MFObservationCallbacks_${prop}` 
            //          – maybe this validation should be looser? Or specific to HTMLSelectElement.value?
            if (!obj[`__MFObservationCallbacks_${prop}`])
            {
                // Look up the propertyDescriptor of obj.prop in the prototype-chain
                let desc;
                for (let o = obj; o; o = Object.getPrototypeOf(o)) {
                    if (Object.getOwnPropertyDescriptor(o, prop)) {
                        desc = Object.getOwnPropertyDescriptor(o, prop);
                        break;
                    }
                }

                // Check if there's already a getter/setter for obj.prop
                if (desc && (desc.get || desc.set))  throw error_observe_footgun1(obj, prop); // Not sure if this should be an Error or a Warning. I think we might be breaking things by overriding existing setters without calling the original setter from the override??

            }
        }
        // Defer recursive calls to prevent theoretical stale-state bugs
        //      Prevents edge-case issue where observation callback for a new value runs before the observation callback for the older value finishes (and then when it finishes, it may reset some state to be outdated.)
        //      Weird edge case with this solution: If you observe multiple properties with the same callback function, this will prevent recursive re-entering of that function, but not in all cases if you wrap the callback function in a closure like () => cb(). [Nov 2025]
        //          ... I don't see a general solution. Maybe just pray that this doesn't happen in practice? Maybe turn this into a 'nonReenteringWrapper()` helper function that users can use if they ever have such problems?
        //      TODO: Is there a solution without weird edge-cases? Is this even worth having in the codebase or can users just handle this problem themselves? Does this bug even ever happen in practice?
        //      Alternative idea: You could defer all observation callbacks triggered by other observation callbacks. But that would also be unintuitive for the common case I think? Because the user might have to wait for updates with setTimeout();
        {
            if (0) {
                
                // Defer re-enterings
                let rawCallback = callback;
                rawCallback.__MFRecursionTracker = 0;
                callback = newValue => {

                    if (__MFRecursionTracker > 1000) throw error_observe_infinite(obj, prop);

                    if (rawCallback.__MFRecursionTracker > 0) { /// TODO: Maybe update the internal prefixes from MF -> NF (NoFramework) or whatever we'll end up calling this.
                        rawCallback.__MFRecursionTracker += 1;
                        return;
                    }

                    rawCallback.__MFRecursionTracker += 1;
                    rawCallback(newValue);
                    rawCallback.__MFRecursionTracker -= 1;

                    if (rawCallback.__MFRecursionTracker > 0) {
                        rawCallback(obj[prop]);
                        rawCallback.__MFRecursionTracker = 0;
                    }
                }
            }
            if (1) {
                // Monitor how much re-entering actually happens in practise, and whether it causes bugs.
                
                let rawCallback = callback;
                rawCallback.__MFRecursionTracker = 0;
                callback = newValue => {
                    if (rawCallback.__MFRecursionTracker > 0) throw new Error(`Recursion in observe() callback!`); // TODO: Remove. This is for testing / gathering data
                    rawCallback.__MFRecursionTracker += 1;
                    rawCallback(newValue);
                    rawCallback.__MFRecursionTracker -=1;
                };
            }
        }

        // Core logic
        {
            if (!obj[`__MFObservationCallbacks_${prop}`]) { // First time observing this property
                obj[`__MFObservationCallbacks_${prop}`] = [];

                let value = obj[prop];

                Object.defineProperty(obj, prop, {
                    get: () => value,
                    set: (newVal) => {
                        if (value === newVal) return;
                        value = newVal;
                        for (let callback of obj[`__MFObservationCallbacks_${prop}`]) callback(newVal);
                    },
                });
            }

            obj[`__MFObservationCallbacks_${prop}`].push(callback);

            if (triggerImmediately) callback(obj[prop]);
        }
    }

    export function observeMultiple (
        /** @type {[any, string][]} */  objsAndProps, 
        /** @type {() => void} */       callback,
        /** @type {boolean} */          triggerImmediately = true
    ) {
        for (let x of objsAndProps) observe(x[0], x[1], callback, false);
        if (triggerImmediately) callback();
    }

    /**
        There is no 'observeMultiple()' or 'combineCallbacks()' primitive. Instead you can just use this pattern:

            {
                observe(obj,     'prop1', cb, false), // Pass false for triggerImmediately to prevent cb() from being called multiple times.
                observe(obj,     'prop2', cb, false),
                listen(pickerEl, 'input', cb, false),
                cb();
                function cb() {
                    mflog(`prop1 or prop2 or pickerEl changed!`);
                }
            }

            -> Super clean and easy.

            TODO: Maybe add this to `Idea - quote-unquote-framework`

            Update: [Nov 2025]
                Maybe observeMultiple() sugar is good after all. It just doesn't allow combining listen() with observe(), but 
                    That's probably never need in practice. (listen() could always update one piece of model state, and then 
                    you can observe that model state together with other states.)

                That would shorten the above code to:
                {
                    listen(pickerEl, 'input', () => obj.pickerState = pickerEl.value);
                    observeMultiple([[obj, 'prop1'], [obj, 'prop2'], [obj, 'pickerState']], {
                        mflog(`prop1 or prop2 or pickerState changed!`);
                    });
                }

        Discussion of triggerImmediately arg:
            The user will usually want `triggerImmediately = true` for observe(), but not when using it in combineCallbacks().
            The user will usually want `triggerImmediately = false` for listen(),
            -> We're not using default values to reduce footguns and keep consistency. (Not sure if that's the right choice)
            -> Update: TODO: Reconsider: Actually, I think you *never* need the triggerImmediately arg on listen(), since you'd never
                initialize the model from the DOM. You'd initialize the DOM from the model. And you observe() the model.
                And triggerImmediately automates initialization when you do that.
                -> Only reason to have triggerImmediately on listen() is for consistency with observe();
                TODO: Reconsider: Is it really good to have a wrapper around addEventListener()? Similar observe()/listen() API is nice, but the wrapper doesn't do anything.
    */



// MARK: Errors

function error_observe_infinite(obj, prop) {
    return new Error(dedent(`
        observe():
        There seems to be an infinite recursion in the observation of property '${prop}' on object '${obj}'.

        Note: 
            With a 'normal' infinite recursion, you'd get a stack overflow, but our 
            re-entering-prevention code (See __MFRecursionTracker) prevents stack overflow.
            So we throw this error instead, for hopefully better UX than just infinite-looping.
            (Idk does that freeze up the browser?) (Didn't test) [Nov 2025]
    `));
}

function error_observe_notafunction(callback) {
    return new Error(dedent(`
        observe():
        The 'callback' argument (${callback}) is not a function.
    `))
}

function error_observe_footgun1(obj, prop) {
    
    return new Error(dedent(`
        observe():
        Property '${prop}' on object '${obj}' already has a getter/setter and may not be observable.
        
        Tip: For HTMLElements, you may have to listen() for 'input', 'change', etc. instead of observing properties such as 'value' directly.
    `));

}

function error_observe_nilobj(obj) {

    // TODO: Should observe() just be 'null safe' and do nothing when you pass it null just like Objective-C?
    //      Maybe that only works in an environment where *everything* works that way and users have that expectation? Not sure how JS works there.

    return new Error(dedent(`
        The object passed to observe() is ${obj}
    `));
}

function error_wrapInCustomElement_footgun1(this_) {

    return new Error(dedent( // TODO: Clean up the terminology. Maybe shorten this.
        `
        
        No initialization closure found for mf-custom-element instance with id ${this_.dataset.instanceid}. (dbgname: ${this_.dataset.dbgname})

        ---

        This can happen if you try to add the HTML string returned 
        by ${wrapInCustomElement.name} to the DOM more than once.
        The first time that the HTML string is added to the DOM, 
        the browser parses it into an HTMLElement object, and then the initialization 
        closure that was passed to ${wrapInCustomElement.name} runs
        to initialize that object. 
        After that, the initialization closure is deleted to avoid memory leaks.

        When the same HTML string is added to the DOM a second time, 
        a new object is instantiated and it would need 
        the initialization closure to run again to become initialized.
        However, the initialization closure will already have been deleted. 
        That's the situation that triggers this error.
        
        ---

        Common trigger: 'document.body.innerHTML += newHTML'. 
        -> This deletes all the HTMLElement objects from document.body 
            before recreating them from the (innerHTML+newHTML) string. 
        
        But there are easy solutions in this case:

        Instead of '.innerHTML +=', you can use: 
            document.body.insertAdjacentHTML('beforeend', newHTML);
        or 
            document.body.appendChild(newHTML_renderedToObjects)
        
        This lets you manipulate the document.body without having 
        all the objects from the old HTML string be re-rendered.
        
        Or recreate the HTML string 'properly' by calling wrapInCustomElement() again, instead of reusing the old HTML string:
            Bad: 
                
                let counterContainer.innerHTML = CounterComponent({ initialCount: 10 }); // Create the component and add it to the DOM
                
                let storedCounterHTML = counterContainer.innerHTML; // Store the component's *HTML string*
                counterContainer.innerHTML = '';                    // Remove the component from the DOM.
                
                counterContainer.innerHTML = storedCounterHTML;     // Later, add the old HTML string back to the DOM. Causes this error!
            Good: 
                let counterContainer.innerHTML = CounterComponent({ initialCount: 10 }); // Create the component and add it to the DOM
                
                let storedCount = counterContainer.firstChild.count; // Store the component's *state*.
                counterContainer.innerHTML = '';                     // Remove the component from the DOM.
                
                counterContainer.innerHTML = CounterComponent({ initialCount: storedCount }); // Recreate a fresh component from the stored state.
                                                                                              // (The CounterComponent() function calls wrapInCustomElement again and passes it a fresh initialization closure.) 
                    
        ---
        
        General principle:
        The HTML strings returned by ${wrapInCustomElement.name} are single use!
        They can only be rendered once.
        Either manipulate the DOM objects directly 
        ('document.body.appendChild()' etc.)
        Or run the original code that generated the HTML string
        (and called ${wrapInCustomElement.name}) again before adding that string. 
        You can't remove an HTML string from the DOM, then store it/manipulate it and add it 
        back later.
        
        Discussion: 
        It's maybe a bit annoying, but I think it allows to keep the rest of the NoFramework.js 
        API more simple and practical.
        
        I think it'll be fine in practice. 
        Relating this to AppKit/UIKit, it the restriction here 
        is analogous to not allowing views to be serialized as interface builder files and 
        back by the user. Which is something you never do.
        It's just a bit easier to do this accidentally in webdev due to APIs like .innerHTML,
        But I don't think it's ever necessary.

        Alternative solutions:
            We do the instance-specific initialization closures so that when you have a
            MyComponent(a, b, c) function, you can use a, b, and c in the initialization 
            closure that MyComponent passes to ${wrapInCustomElement.name}.
            
            If you made the initialization functions component-function-specific, then you could just store 
            them globally and not worry about leaking too much memory, but then if you capture
            a, b, or c in the closure, that's a footgun, because a, b, and c will only 
            be captured the first time that MyComponent() is called.
            You would then probably have people define the initialization closure outside of 
            the main MyComponent() function to avoid this accidental capturing of the args.
            But that makes everything less local and more annoying to write in 
            the common case. Feels like the cost isn't worth it.

            You could also maybe just not have arguments for the component functions to 
            avoid the footgun. I'm not sure how you would warn people if they're
            'doing it wrong' though and it might also be an annoying restriction in practice.

            You could keep the instance-specific initialization closures and just store them
            globally and mark them as 'has run already' and give the user a 'flush' function
            if they take up too much memory. But then the same problems can appear after they've
            flushed things. Not sure how this would play out in practice.

            Everything kinda seems worse than what we currently have:
            Instance-specific initialization closures that auto-cleanup 
            after they are run. And when the instance is added to the DOM 
            a second time we can easily detect that and immediately throw 
            an informative error.

            ... More ideas:

            Don't make MyComponent() functions return HTML, make them return rendered HTMLElement objects instead. 
                -> They would store their data and not need to be re-initialized.
                However, then you wouldn't have the nice mixing of writing plain HTML with 
                components interpolated in between.
                You'd have to write everything as a DSL of nested component-functions.
                Also you loose the nice 'progressive complexity' where simple components can 
                just be functions that return HTML strings and nothing else.
                
                The DSL of nested function-calls approach also works fine. That's kinda what SwiftUI is and how I plan to
                    write AppKit code in the future. Maybe it's worth it? 
                    But the simplest way and most expressive way to write simple layouts for the browser is just HTML+CSS, 
                    and its nice  to be able to start with that and then just mix in components freely, without having 
                    to convert everything to a JS DSL.

            Just leak all the closures.
                Maybe the memory use is so negligible that it never matters. 
                (I haven't tested this.)
                ... But with the virtual scrolling we implemented in FastList(), we could leak millions of items very easily – I don't think that's good.

        ---

        "The real issue is that when the browser re-parses the HTML string, it creates a new object that needs the now-deleted closure"
        ...  
    `)); 
}
