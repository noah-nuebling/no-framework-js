## NoFramework Demo (Written in collaboration with Claude 4.5 Opus based on the code in this repo [Jan 2026])

**Problem:** Modern web frameworks solve real problems—components, state management, reactivity — but come with 1000s of dependencies that inevitably break, slow compilation, 'magic' that is hard to reason about, and bad performance.

**Solution:** Use Vanilla JS! Modern web-tech gives you everything you need. Here I'll demonstrate what you can do with ~150 lines of convenience wrappers (The 'NoFramework.js')

### Components: HTML, CSS and JS in one place

**Stage 1: Just HTML**

In the simplest case, 'Components' can just be functions that return an HTML string.

```javascript
function TextField({ label, placeholder }) {
  return `
    <div class="field">
      <label>${label}</label>
      <input type="text" placeholder="${placeholder}">
    </div>
  `;
}

// ... Later: Use the TextField component
document.body.innerHTML = `
  <h1>User Profile</h1>
  ${TextField({ label: "First Name", placeholder: "John" })}
  ${TextField({ label: "Last Name", placeholder: "Doe" })}
  ${TextField({ label: "Email", placeholder: "john@example.com" })}
  <button>Save</button>
`;
```

*Caveat – LSP Support:*

When using WebStorm, you'll get perfect HTML / CSS syntax highlighting and autocomplete in the \`template literals\`. 
In VSCode it's not as easy. But if this approach becomes more popular I'm sure someone will write a great plugin. [Jan 2026]

**Stage 2: HTML with style**

To add CSS to your component, just include `<style> @scope { ... } </style>` inside the HTML string.

Now you have localized CSS in your HTML – ala TailwindCSS.

`@scope` is a native feature that is supported on all modern browsers. 

```javascript
function TextField({ label, placeholder }) {
  return `
    <style>@scope {
      .field { margin-bottom: 12px; }
      label { font-weight: bold; display: block; margin-bottom: 4px; }
      input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    }</style>

    <div class="field">
      <label>${label}</label>
      <input type="text" placeholder="${placeholder}">
    </div>
  `;
}
```

Arguably this is even better than TailwindCSS since you can add linebreaks and comments, and dont have to learn another abstraction layer over CSS.

**Stage 3: Make it interactive**

Now we have HTML and CSS in the component. 
Let's add the final puzzle piece: JavaScript

This can be achieved with CustomElements – another native browser technology. 

The 'NoFramework' provides a simple convenience wrapper which can be used like this:

```javascript
import { customElement, qs } from "./NoFramework.js";

function TextField({ label, placeholder, onChange }) {
  return customElement({
    innerHTML: `
    <style>@scope {
      .field { margin-bottom: 12px; }
      label { font-weight: bold; display: block; margin-bottom: 4px; }
      input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
      input:focus { border-color: blue; outline: none; }
    }</style>

    <div class="field">
      <label>${label}</label>
      <input type="text" placeholder="${placeholder}">
    </div>
    `,
    init() { // This JavaScript runs after the component is mounted to the DOM!
      const input = this.querySelector('input');
      input.addEventListener('input', (e) => {
        console.log(`The input changed to ${input.value}!`);
      });
    }
  });
}
```

Inside `init()`, you can access the component's children, attach event listeners and more.

### State Management: Two-Way Bindings Aren't Scary

The evil React propaganda machine wants you to believe that state management 
is hard and only React can solve it – but that's not true!

Think of your app in two parts:
- **Model**: The interesting data your user wants to inspect or edit
- **DOM**: The user-friendly interface for inspecting and editing that data

'State management' is mostly just keeping these two in sync:
1. Update the DOM when the model changes
2. Update the model when the user interacts with the DOM

You can solve this with three vanilla JS primitives:
- `document.querySelector()` – find DOM elements
- `addEventListener()` – run code when the user interacts
- `Object.defineProperty()` (or `Proxy`) – run code when your model changes

NoFramework just wraps these as `qs()`, `listen()`, and `observe()`:

```javascript
import { qs, listen, observe, observeMultiple } from "./NoFramework.js";

// Your app state — just plain objects
const model = {
  firstName: 'John',
  lastName: 'Doe',
  fullName: ''
};

// Render the view
document.body.innerHTML = `
  <input class="first-name" value="${model.firstName}" placeholder="First Name">
  <input class="last-name" value="${model.lastName}" placeholder="Last Name">
  <div class="full-name">${model.fullName}</div>
`;

// Bind Model <-> View

// View <- Model
observe(() => qs('.first-name').value = model.firstName, [model, 'firstName']);
observe(() => qs('.last-name').value = model.lastName,   [model, 'lastName']);

// Model <- View
listen(() => model.firstName = qs('.first-name').value, [qs('.first-name'), 'input']);
listen(() => model.lastName = qs('.last-name').value,   [qs('.last-name'), 'input']);

// Complex Case: Derived State

// Derived State <- State
observeMultiple(
    () => model.fullName = `${model.firstName} ${model.lastName}`, 
    [[model, 'firstName'], [model, 'lastName']]
);

// View <- Derived State
observe(() => qs('.full-name').textContent = model.fullName, [model, 'fullName']);
```

That's it. No virtual DOM. No diffing. It's fast, debuggable, and predictable.
It may be a bit more code than React, but it's easy to write and reason about.

### Hot Reloading – Iterating Fast

Hot reloading is admittedly a great feature of frameworks like React. 

You can achieve a similar experience by 
1. Auto-reloading the page when your source code changes.
1. Using `window.localStorage` to persist state between reloads.

NoFramework.js provides `persistentModel()` – a convenience wrapper around `window.localStorage`:

```javascript

import { persistentModel } from './NoFramework.js'

// Wrap your state-objects in `persistentModel()` to persist their state between page-reloads.
const settingsModel = persistentModel('settings', { theme: 'dark' });
const uiModel       = persistentModel('ui',       { isOpen: false });

// Now you can do DOM <-> model bindings like usual:

// Bind Model <- DOM
listen(() => uiModel.isOpen = !uiModel.isOpen, [qs('.toggle-button'), 'click']);

// Bind DOM <- Model
observe(() => qs('.dropdown').classList.toggle('open', uiModel.isOpen), [uiModel, 'isOpen']);

// -> After a reload, the .dropdown will still be open!
```

Then use any live-reload server (Python's `livereload`, `browser-sync`, VS Code Live Server). When files change, the page reloads, but state in `persistentModel` survives in `window.localStorage`.

If you store transient state like the scroll position or dropdown state in a `persistentModel`, you can continue exactly where you left off before the reload.

(CAVEAT: I haven't implemented / tested `persistentModel()`, yet [Jan 2026])

## Philosophy

Frameworks like React are fancy and magical and had some genuine workflow advantages.
But they have lots of disadvantages as well: From NPM hell and projects breaking regularly, to big code sizes and slow load times which are then mitigated by SSR and JS minification, to unnecessary rerenders being hard to avoid and making sites less responsive. The costs aren't always immediately obvious but they are significant.

Since native web-technologies can afford most of the workflow advantages of heavy frameworks now, with none of the downsides,
I think it's a great idea to learn the fundamentals and build vanilla!

When you actually understand what's going on under the hood it will
free you to write things you could've never imagined before!

### "But This Won't Scale to Complex Apps"

A common objection: "Sure, vanilla JS works for simple stuff, but for anything complex you need React."

Consider: People built Photoshop, Microsoft Office, and entire operating systems with imperative UI code (UIKit, AppKit, Win32). The idea that a web app is "too complex" to write without "reactivity" doesn't hold up.

Yes, you *can* mess up state synchronization with manual bindings, but even if that does happen the bug is usually immediately visible in the UI and easy to track down.

React's solution trades this problem for arguably more complex ones - now  everything is veiled in a layer of implicit behavior and magic, that you'll have to understand when things update less or more frequently than you expected. (`useMemo`, `useEffect`, ...)

Does it really make it easier to build great software?

**Reality check:** If manual state management is so error-prone, we'd expect apps built without "reactivity" to be riddled with stale UI bugs. But think about the native apps you use daily—are they? Final Cut Pro, Figma's desktop app, VS Code, your browser itself. These don't use React-style virtual DOM diffing, yet they don't have noticeably worse UI consistency than React apps. If anything, the opposite is often true.

**The AppKit/UIKit Analogy**

Consider: The NoFramework is a (more simple) way to write the same patterns that professional native apps used for decades:


| Pattern | AppKit/UIKit | NoFramework |
|---------|--------------|-------------|
| Declaring view hierarchies | Interface Builder (XIB/Storyboard) | HTML/CSS in template strings |
| Loading view hierarchies | `NSViewController` | `customElement()` |
| Post-load initialization | `viewDidLoad`, `awakeFromNib`, etc. | `init()` |
| References into view hierarchies | `@IBOutlet` | `qs()` (querySelector) |
| Reacting to user input | Target-Action | `listen()` |
| Syncing state | KVO, Cocoa Bindings, imperative updates | `observe()` |

Apps like Final Cut Pro, Logic, and Xcode itself were built with this model.

If these patterns scaled to professional desktop applications, they can handle your web app.

---

Caveat: This Demo tries to make a strong case against React and for using Vanilla. But – I'VE NEVER ACTUALLY USED REACT. I've used Vue and Nuxt and had plenty of problems with NPM hell, slow compilations, and other complexities that come from the frameworks. But all the talk about `useEffect` etc is generated by Claude and I cannot verify it. I've also never built a real project with the NoFramework approach.

---

Caveat: Some of the APIs implemented in the NoFramework.js file don't exactly match the APIs described in the 'Demo' above – this repo is a sort of playground / proof of concept at this point [Jan 2026]

---

# Notes / Old Readme from when this repo was called javascript-playground-nov-2025 instead of no-framework-js

Writing simple web stuff with 'NoFramework'
Also see `Idea - quote-unquote-framework` in our public notes repo.

Couldn't get any of the VSCode plugins for inline-HTML autocomplete to work properly - In Webstorm this all works super well out of the box. (
This is very useful for the quote-unquote-framework) [Nov 2025] 

Running:

- Open Chrome like this:
    open -a /Applications/Google\ Chrome.app/ --args --allow-file-access-from-files
- Then just open index.html

Update: [Dec 2025]

    - This Reddit thread sounds like **there is interest** in something like NoFramework:
        https://www.reddit.com/r/AskProgramming/comments/1puhkhg/why_is_the_modern_web_so_slow/

    - Recently been thinking: Biggest downside to current NoFramework is **no hot reloading**
        - Experience: For the MMF website I did layout debugging + design directly in the browser thanks to hot-reloading + inline CSS (tailwind) 
            -> Very valuable!
        - Doubts: How easy is this to implement on top of NoFramework? Do you need a "components are a function of state"-type component system with shadow DOM and stuff to make this work? Is this where the React/Vue model really starts making sense?
        -> SOLUTION:
            After thinking it through – You can get very ergonomic hot-reloading-like experience on top of NoFramework! There are two parts to the solution:
                1. Simple persistentModel() helper, that wraps window.localStorage
                2. Dev server that reloads when any files change (e.g. Python's `livereload`)
            
            -> More details: See Claude's summary titled 
                "Hot Reloading for Minimal Web Component Framework" 
                at the end of this conversation: https://claude.ai/share/ddce4efb-81b6-4fcd-8fbb-89972786632d
            
            TODO: Test this in Test_StuffInteractive.js

    - Recently heard Adam Wathan (Tailwind creator) talk about something similar - a framework that uses web components to give you much of the same ergonomics of react. i think he said it only made economical sense to sell it and keep it closed source. Was only listening with one ear. [Dec 25 2025]


[Jan 2026] Comments here are full of people recommending WebComponents over React:
https://m.youtube.com/watch?v=AmrBpxAtPrI

---
