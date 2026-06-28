import { Editor, MarkdownView, Plugin, PluginSettingTab, Setting, App, setIcon } from "obsidian";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";

interface Settings {
  bullets: string[];
}

const DEFAULT_SETTINGS: Settings = {
  bullets: ["\\> ", '-'],
};

const NATIVE_BULLETS = ['-', '*', '+'];
const INVISIBLE = ['‎']

export default class CustomBulletsPlugin extends Plugin {
  settings!: Settings;

  async loadSettings() {
    this.settings = Object.assign({} /* empty object */, await this.loadData() ?? DEFAULT_SETTINGS);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    await this.loadSettings();

    this.addSettingTab(new SettingTab(this.app, this));

    // Hook directly into CodeMirror with highest precedence so we run
    // before Obsidian's own Enter handler
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

  // Mimic native new line  behaviour + our additional logic
  // Returns true if we handled the event (consume it), false to let Obsidian's default run.
  handleEnter(): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return false;

    const editor: Editor = view.editor;
    const cursor = editor.getCursor();

    if (cursor.ch === 0) { // ignore custom logic on ch 0
      return false;
    }

    const lineText = editor.getLine(cursor.line);

    const caught = this.settings.bullets.find(bullet => lineText.startsWith(bullet));
    if (!caught) return false; // didn't catch any of the bullets, end our custom logic

    const text = lineText.slice(caught.length); // get suffix (text minus the bullet)

    // Check for native bullet syntax
    // (if bullet syntax symbol is native and it has trailing spaces we bail) TODO: learn what bail means
    if (NATIVE_BULLETS.contains(caught)) {
      if (text !== text.trimStart()) return false; 
    }

    // If line text is native separator syntax ('---') and caught is '-'
    if (caught === '-' && /--+/.test(text)) return false;

    // if text is empty we clear the line
    if (text.trim() === '') {
      editor.setLine(cursor.line, '');
    } 
    else {
      const remaining = lineText.slice(cursor.ch); // text after cursor's pos to append on next line 

      // it has content, append new line with the bullet symbol
      const pos = { line: cursor.line, ch: lineText.length };
      editor.replaceRange("\n" + caught + remaining, pos);

      editor.setLine(cursor.line, lineText.slice(0, cursor.ch)); // set line with line text up to cursor's pos
      
      editor.setCursor({ line: cursor.line + 1, ch: caught.length/*  + remaining.length */});
    }

    return true; // Consume obsidian's logic for Enter
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
    containerEl.empty(); // empty to get ready for new render

    // set style
    const style = containerEl.createEl("style");
    style.textContent = `
      .cb-list { margin-bottom: 12px; }
      .cb-list-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    `;

    const space2visual = (value: string) => value.replace(/ /g, "␣").replace(/‎/g, "∅");
    const visual2space = (value: string) => value.replace(/␣/g, " ").replace(/∅/g, "‎");

    const cachedBullets = this.plugin.settings.bullets; // alias

    const descEl = containerEl.createEl("p", { cls: "cb-setting-description" });
    descEl.innerHTML = 
    `
    Lines starting with these prefixes are treated as custom list bullets and follow standard list behavior:
    pressing Enter after filling in the bullet inserts a new one on the next line, while pressing Enter on an empty bullet line removes the prefix.<br>
    Whitespaces (␣) should be declared explicitly.
    `;

    const listContainer = containerEl.createDiv({ cls: "cb-list" });

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

    // Render updated view
    const render = () => {
      listContainer.empty(); // reset view (listContainer.innerHTML = '')

      // for each cached bullet
      cachedBullets.forEach((bullet, i) => {

        const row = listContainer.createDiv({ cls: "cb-list-row" });

        // temp
        if (false) {
        // const reorderHandle = row.createEl("span", {
        //   cls: "drag-handle",
        //   attr: { draggable: "true" }
        // });
        // setIcon(reorderHandle, "grip-vertical");

        // reorderHandle.addEventListener("dragstart", (e) => {
        //   e.dataTransfer?.setData("text/plain", String(i));
        //   e.dataTransfer!.effectAllowed = "move";
        //   row.classList.add("is-dragging");
        // });

        // reorderHandle.addEventListener("dragend", () => {
        //   row.classList.remove("is-dragging");
        // });

        // row.addEventListener("dragover", (e) => {
        //   e.preventDefault(); // without this, "drop" never fires, browsers block it by default
        //   row.classList.add("drag-over");
        // });

        // row.addEventListener("dragleave", () => {
        //   row.classList.remove("drag-over");
        // });

        // row.addEventListener("drop", (e) => {
        //   e.preventDefault();
        //   row.classList.remove("drag-over");

        //   const fromIndex = Number(e.dataTransfer?.getData("text/plain"));
        //   const toIndex = i;
        //   if (fromIndex === toIndex || Number.isNaN(fromIndex)) return;

        //   const newBullets = [...bullets];
        //   const [moved] = newBullets.splice(fromIndex, 1);
        //   newBullets.splice(toIndex, 0, moved);

        //   // onReorder(newBullets);
        //   render();
        // });
        }
        
        input = row.createEl("input", { type: "text", value: space2visual(bullet) });
        input.style.cssText = "flex:1; font-family:monospace; padding:4px 8px;";
        
        if (cachedBullets.length === 0) {
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

          input.value = space2visual(input.value);

          // input.value = space2visual(visual2space(input.value)); // also looks

          // I am not sure why we need this
          // const pos = input.selectionStart ?? input.value.length;
          // input.setSelectionRange(pos, pos);
        });

        /* input.addEventListener("blur", (event) => {
          checkError();
        }); */

        input.addEventListener("change", async (event) => {
          const input = event.target as HTMLInputElement;

          checkError()

          if (errorNum !== 0) return;

          // Save to bullets
          cachedBullets[i] = visual2space(input.value);
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

          cachedBullets.splice(i, 1);
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

          cachedBullets.push('');
          await this.plugin.saveSettings();
          render();

          input.focus();
        });
      }
    );
  }
}