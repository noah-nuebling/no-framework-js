
import {observe, listen, qs, wrapInCustomElement, getOutlet} from "./mini-framework.js";
import { mflog } from "./utils.js";
import { List } from "./SimpleList.js"

// Interactive Components

function UnnecessaryChild(msg, innerHTML) {

    /// Child component that does nothing
    ///     - To test order of connectedCallback() invocations.

    let html = `<!-- Hello hello --> ${innerHTML}`

    html = wrapInCustomElement(html, {
        connected() {
        },
        dbgname: `${UnnecessaryChild.name}:${msg}`,
    })

    return html;
}

function Counter({ initialCount = 0, color = '#4a90e2' }) {
  let html = `
    <style> @scope {
      .counter-container {
        padding: 20px;
        background: ${color};
        border-radius: 8px;
        color: white;
        text-align: center;
      }
      .count { font-size: 48px; font-weight: bold; margin: 10px 0; }
      button {
        padding: 10px 20px;
        margin: 5px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        border-radius: 4px;
        background: rgba(255,255,255,0.3);
        color: white;
      }
      button:hover { background: rgba(255,255,255,0.5); }
    } </style>
    <div class="counter-container">
      <div class="count">${initialCount}</div>
      <button class="increment">+</button>
      <button class="decrement">-</button>
      <button class="reset">Reset</button>
      ${UnnecessaryChild('outer', UnnecessaryChild('inner', `<p>Hi there.</p>`))}
    </div>
  `;

  html = wrapInCustomElement(html, {
      connected() {
          /** @typedef {{count: number}} Counter */
          this.count = initialCount;

          observe(this, 'count', count => { qs(this, '.count').textContent = count; }, true)

          listen(qs(this, '.increment'), 'click', () => { this.count++; }, false);
          listen(qs(this, '.decrement'), 'click', () => { this.count--; }, false);
          listen(qs(this, '.reset'),     'click', () => { this.count = initialCount; }, false);
      },
      dbgname: Counter.name,
  });

  return html;
}

function AnimatedCard({ title, description, color = '#e74c3c' }) {
  let html = `
    <style> @scope {
      .card {
        padding: 20px;
        background: ${color};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        color: white;
      }
      h3 { margin: 0 0 10px 0; font-size: 24px; }
      p { margin: 0; opacity: 0.9; }
    } </style>
    <div class="card">
      <h3>${title}</h3>
      <p>${description}</p>
    </div>
  `;

    html = wrapInCustomElement(html, {
        connected() {

            let card = qs(this, ".card");

            listen(card, 'mouseenter', () => {
                card.style.transform = 'scale(1.05) translateY(-5px)';
                card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
            }, false);

            listen(card, 'mouseleave', () => {
                card.style.transform = 'scale(1) translateY(0)';
                card.style.boxShadow = 'none';
            }, false);
        },
        dbgname: AnimatedCard.name,
    });

  return html;
}

function ToggleSwitch({ label = 'Toggle', initialState = false }) {
  let html = `
    <style> @scope {
      .toggle-container {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background-color: oklch(0.823 0 89.876 / 0.12);
        border-radius: 8px;
      }
      .switch {
        width: 50px;
        height: 26px;
        background: #ccc;
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: background 0.3s;
      }
      .switch.active { background: #2ecc71; }
      .slider {
        width: 22px;
        height: 22px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.3s;
      }
      .switch.active .slider { transform: translateX(24px); }
      label { font-size: 16px; color: #333; }
    } </style>
    <div class="toggle-container">
        <div class="switch ${initialState ? 'active' : ''}">
            <div class="slider"></div>
        </div>
        <label>${label}</label>
    </div>
  `;
    html = wrapInCustomElement(html, {
        connected() {

            const switchEl = qs(this, '.switch');

            let isActive = initialState;

            listen(switchEl, 'click', () => {
                isActive = !isActive;
                switchEl.classList.toggle('active', isActive);
            }, false);
        },
        dbgname: ToggleSwitch.name,
    });
    
  return html;
}

// Main render function
export function renderInteractiveStuff() {

    let html = `
        <h1 style="text-align: center; color: #333;">Interactive Components Demo</h1>
        <div style="display: grid; gap: 20px; margin: 30px 30px 400px 30px;">
        ${Counter({ initialCount: 0, color: '#4a90e2' }).outlet('first-counter')}
        ${Counter({ initialCount: 100, color: '#9b59b6' })}
        ${AnimatedCard({
            title: 'Hover me!',
            description: 'This card animates on hover',
            color: '#e74c3c'
        })}
        ${AnimatedCard({
            title: 'Interactive Card',
            description: 'Built with vanilla JS',
            color: '#f39c12'
        })}
        ${ToggleSwitch({ label: 'Dark Mode', initialState: false })}
        ${ToggleSwitch({ label: 'Notifications', initialState: true })}
        <hr>
        <label for="pet-select">Choose a pet:</label>
        <select name="pets" id="pet-select">
            ${List((item) => {
                return `<option value=${item.id}>${item.label}</option>`
            }).outlet('petlist')}
        </select>
        </div>
    `;
    html = wrapInCustomElement(html, {
        connected() {

            let counter = /**@type{Counter}*/getOutlet(this, 'first-counter');
            mflog(`Initial count: ${counter.count}`);
            observe(counter, 'count', count => {
                mflog(`Observed count: ${count}`);
            }, true)

            let model = {}
            model.pets = [
                { id: "",           label: "-Please choose an option--" },
                { id: "dog",        label: "Dog" },
                { id: "cat",        label: "Cat" },
                { id: "hamster",    label: "Hamster" },
                { id: "parrot",     label: "Parrot" },
                { id: "goldfish",   label: "Goldfish" },
                { id: "spider",     label: "Spider" },
            ]
            observe(model, 'pets', () => {
                mflog(`observe pets fired!`);
                model.pets = List.wrapArrayInObservableProxy(model.pets);
                getOutlet('petlist').items = model.pets
            }, true);

            let state = 0;
            let removedAnimal = {id: 'orangutan', label: "Orangutan"};
            setInterval(() => {
                if (state === 0) {
                    model.pets.push(removedAnimal);
                    mflog(`pushed: ${model.pets.map(x => x.id)}`);
                }
                if (state === 2) {
                    removedAnimal = model.pets.pop();
                    mflog(`pppped: ${model.pets.map(x => x.id)}`);
                }
                if (state === 1) {
                    let popped = model.pets.pop();
                    mflog(`popped: ${popped.id}`);
                    model.pets.unshift(popped);
                }
                state = (state+1) % 3;
            }, 1000);
            setTimeout(() => {
                mflog(`model.pets.push`)

            }, 1000);



        },
        dbgname: renderInteractiveStuff.name
    })
    return html;
}