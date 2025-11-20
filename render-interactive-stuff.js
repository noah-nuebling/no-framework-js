
import { observe, listen, observeMultiple, qs, wrapInCustomElement } from "./mini-framework.js";

// Interactive Components

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
    </div>
  `;

  html = wrapInCustomElement(html, {
      mounted() {
          this.count = initialCount;

          observe(this, 'count', count => {
              qs(this, '.count').textContent = count;
          })

          listen(qs(this, '.increment'), 'click', () => { this.count++; });
          listen(qs(this, '.decrement'), 'click', () => { this.count--; });
          listen(qs(this, '.reset'),     'click', () => { this.count = initialCount; });
      }
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
    mounted() {

        listen(qs(this, '.card'), 'mouseenter', () => {
            qs(this, '.card').style.transform = 'scale(1.05) translateY(-5px)';
            qs(this, '.card').style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
      });

        listen(qs(this, '.card'), 'mouseleave', () => {
            qs(this, '.card').style.transform = 'scale(1) translateY(0)';
            qs(this, '.card').style.boxShadow = 'none';
      });
    }
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
        background: #f5f5f5;
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
        mounted() {

            const switchEl = qs(this, '.switch');

            let isActive = initialState;

            listen(switchEl, 'click', () => {
                isActive = !isActive;
                switchEl.classList.toggle('active', isActive);
            });
        }
    });

  return html;
}

// Main render function
export function renderInteractiveStuff() {

  let html = `
    <h1 style="text-align: center; color: #333;">Interactive Components Demo</h1>
    <div style="display: grid; gap: 20px; margin-top: 30px;">
      ${Counter({ initialCount: 0, color: '#4a90e2' })}
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
    </div>
  `;
  html = wrapInCustomElement(html, { mounted() {

      observe(qs(this, '.counter-container').parentNode, 'count', count => { /* .parentNode is a bit sloppy */
          console.log(`Count changed to: ${count}`);
      })

  }})
  return html;
}