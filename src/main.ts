import { Editor, MarkdownView, Plugin, PluginSettingTab, Setting, App } from "obsidian";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

interface Settings {
  bullets: string[];
}

const DEFAULT_SETTINGS: Settings = {
  bullets: ["\\> "],
};

const NATIVE_BULLETS = ['-', '*', '+'];

export default class CustomBulletsPlugin extends Plugin {
  settings!: Settings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));

    // Hook directly into CodeMirror with highest precedence so we run
    // before Obsidian's own Enter handler.
    this.registerEditorExtension(
      Prec.highest(
        keymap.of([
          {
            key: "Enter",
            run: () => this.handleEnter(),
          },
        ])
      )
    );
  }

  // Returns true if we handled the event (consume it), false to let Obsidian's default run.
  // TODO: Handle cases if pressed enter inside text (for now you can workaround this by using Shift+Enter)
  handleEnter(): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return false;

    const editor: Editor = view.editor;
    const cursor = editor.getCursor();
    const text = editor.getLine(cursor.line);

    const matched = this.settings.bullets.find(bullet => text.startsWith(bullet));
    if (!matched) return false;

    const suffix = text.slice(matched.length);

    if (NATIVE_BULLETS.contains(matched)) {
      if (suffix !== suffix.trimStart()) return false; // Handle cases 
    }

    if (suffix.trim() === '') {
      // Empty prefix line - clear it and insert a normal newline.
      editor.setLine(cursor.line, '');

    } else {
      // Has content — continue prefix on next line.
      const pos = { line: cursor.line, ch: text.length };
      editor.replaceRange("\n" + matched, pos);

      editor.setCursor({ line: cursor.line + 1, ch: matched.length });
    }

    return true; // Consume obsidian's logic for Enter
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class SettingTab extends PluginSettingTab {
  plugin: CustomBulletsPlugin;

  constructor(app: App, plugin: CustomBulletsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    const bullets = this.plugin.settings.bullets; // alias

    containerEl.empty();

    // containerEl.createEl("h2", { text: this.plugin.manifest.name });
    const descEl = containerEl.createEl("p", { cls: "setting-item-description" });
    descEl.innerHTML = 
    `
    Lines starting with these prefixes are treated as custom list bullets and follow standard list behavior:
    pressing Enter after filling in the bullet inserts a new one on the next line, while pressing Enter on an empty bullet line removes the prefix.<br>
    Whitespaces (␣) should be declared explicitly.
    `;

    const listContainer = containerEl.createDiv({ cls: "auto-continue-list" });

    let addBtn: HTMLButtonElement;
    let errorText: HTMLSpanElement;

    let input: HTMLInputElement;
    let errorNum: number = 0;

    const checkError = () => {
      // Number of errors caught
      errorNum = 0;
      
      // Show error based on the precedence (lowest -> highest) - which REALLY sucks from UX standpoint so TODO: Do it properly
      // TODO: make as a separate boolean flag function for cohesiveness

      const inputs = listContainer.querySelectorAll('input');
      inputs.forEach((input, i) => {

        const bullet = visual2space(input.value);

        /* Check if bullet is empty */
        if (bullet.trim().length === 0) { // if trimmed bullet is empty

          if (bullet.length !== 0) { // but untrimmed isnt
            errorText.textContent = "Cannot have whitespaces as bullets";
          }

          input.style.borderColor = "var(--text-error)";
          errorNum++;
        }

        /* TODO: Check if redundant */
        // if ([...inputs.values()].some(input => input.value === bullet)) { // Compare other inputs' values with current
        //   errorText.textContent = `'${bullet} is already specified.`;
          
        //   input.style.borderColor = "var(--text-error)";
        //   errorNum++;
        // }

        /* Check if bullet uses native syntax */
        // if bullet is native and contains whitespaces after it
        if (NATIVE_BULLETS.contains(bullet.trim())) { // trimmed bullet is native
          if (bullet.length !== 1) { // and being untrimmed it is not a singleton
            errorText.textContent = `Cannot use Obsidian's native bullets' syntax '${space2visual(bullet)}'`;
            
            input.style.borderColor = "var(--text-error)";
            errorNum++;
          }
        }
      });      

      if (errorNum !== 0) {
        errorText.style.display = "inline";
      }
    }

    const space2visual = (value: string) => value.replace(/ /g, "␣");
    const visual2space = (value: string) => value.replace(/␣/g, " ");

    const render = () => {
      listContainer.empty(); // reset view (listContainer.innerHTML = '')

      bullets.forEach((bullet, i) => {
        const row = listContainer.createDiv({ cls: "auto-continue-row" });

        input = row.createEl("input", { type: "text", value: space2visual(bullet) });
        input.style.cssText = "flex:1; font-family:monospace; padding:4px 8px;";
        
        if (bullets.length === 1 && i == 0) {
          input.placeholder = "e.g. '\\>␣' or '-'";
        }

        input.addEventListener("input", (event) => {
          const input = event.target as HTMLInputElement;

          if (input.style.borderColor) {
            input.style.borderColor = '';

            if (errorNum > 0) errorNum--;

            if (!errorNum) { // if errorNum == 0;
              errorText.style.display = "none";
            }
          }

          const pos = input.selectionStart ?? input.value.length;
          input.value = space2visual(input.value);

          // input.value = space2visual(visual2space(input.value)); // also looks
          // input.setSelectionRange(pos, pos); // I am not sure why we need this
        });

        /* input.addEventListener("blur", (event) => {
          checkError();
        }); */

        input.addEventListener("change", async (event) => {
          const input = event.target as HTMLInputElement;

          checkError()

          if (errorNum !== 0) return;

          // Save to bullets
          bullets[i] = visual2space(input.value);
          await this.plugin.saveSettings();
        });

        input.addEventListener("keydown", event => {
          if (event.key === "Enter") {
            input.blur();

            // need to just focus but not use enter on focused
            setTimeout(() => addBtn.focus(), 0);
          }
        });

        const btn = row.createEl("button", { text: "Remove" });
        btn.addEventListener("click", async (event) => {
          const input = event.target as HTMLInputElement;

          if (input.style.borderColor) {
            errorNum--;
          }

          if (errorNum === 0) { // if errorNum == 0;
            errorText.textContent = "Fill in empty fields first"; // TODO: can drastically modify content switch logic
            errorText.style.display = "none";
          }

          bullets.splice(i, 1);
          await this.plugin.saveSettings();
          render();
        });
      });
    };

    render();

    new Setting(containerEl).addButton(btn => {
        addBtn = btn.setButtonText("+ Add prefix").setCta().buttonEl;

        errorText = document.createElement("span");
        errorText.textContent = "Fill in empty fields first";
        errorText.style.cssText = "color:var(--text-error); font-size:var(--font-smaller); margin-right:8px; display: none";
        addBtn.before(errorText);

        btn.onClick(async () => {
          console.log(errorNum);

          checkError();

          if (errorNum !== 0) {
            return;
          }

          bullets.push('');
          await this.plugin.saveSettings();
          render();

          input.focus();
        });
      }
    );

    const style = containerEl.createEl("style");
    style.textContent = `
      .auto-continue-list { margin-bottom: 12px; }
      .auto-continue-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    `;
  }
}

