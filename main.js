var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => CustomBulletsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var DEFAULT_SETTINGS = {
  bullets: ["\\> "]
};
var NATIVE_BULLETS = ["-", "*", "+"];
var CustomBulletsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SettingTab(this.app, this));
    this.registerEditorExtension(
      import_state.Prec.highest(
        import_view.keymap.of([
          {
            key: "Enter",
            run: () => this.handleEnter()
          }
        ])
      )
    );
  }
  // Returns true if we handled the event (consume it), false to let Obsidian's default run.
  // TODO: Handle cases if pressed enter inside text (for now you can workaround this by using Shift+Enter)
  handleEnter() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) return false;
    const editor = view.editor;
    const cursor = editor.getCursor();
    const text = editor.getLine(cursor.line);
    const matched = this.settings.bullets.find((bullet) => text.startsWith(bullet));
    if (!matched) return false;
    const suffix = text.slice(matched.length);
    if (NATIVE_BULLETS.contains(matched)) {
      if (suffix !== suffix.trimStart()) return false;
    }
    if (suffix.trim() === "") {
      editor.setLine(cursor.line, "");
    } else {
      const pos = { line: cursor.line, ch: text.length };
      editor.replaceRange("\n" + matched, pos);
      editor.setCursor({ line: cursor.line + 1, ch: matched.length });
    }
    return true;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var SettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const bullets = this.plugin.settings.bullets;
    containerEl.empty();
    const descEl = containerEl.createEl("p", { cls: "setting-item-description" });
    descEl.innerHTML = `
    Lines starting with these prefixes are treated as custom list bullets and follow standard list behavior:
    pressing Enter after filling in the bullet inserts a new one on the next line, while pressing Enter on an empty bullet line removes the prefix.<br>
    Whitespaces (\u2423) should be declared explicitly.
    `;
    const listContainer = containerEl.createDiv({ cls: "auto-continue-list" });
    let addBtn;
    let errorText;
    let input;
    let errorNum = 0;
    const checkError = () => {
      errorNum = 0;
      const inputs = listContainer.querySelectorAll("input");
      inputs.forEach((input2, i) => {
        const bullet = visual2space(input2.value);
        if (bullet.trim().length === 0) {
          if (bullet.length !== 0) {
            errorText.textContent = "Cannot have whitespaces as bullets";
          }
          input2.style.borderColor = "var(--text-error)";
          errorNum++;
        }
        if (NATIVE_BULLETS.contains(bullet.trim())) {
          if (bullet.length !== 1) {
            errorText.textContent = `Cannot use Obsidian's native bullets' syntax '${space2visual(bullet)}'`;
            input2.style.borderColor = "var(--text-error)";
            errorNum++;
          }
        }
      });
      if (errorNum !== 0) {
        errorText.style.display = "inline";
      }
    };
    const space2visual = (value) => value.replace(/ /g, "\u2423").replace(/‎/g, "\u2205");
    const visual2space = (value) => {
      return value.replace(/␣/g, " ").replace(/∅/g, "\u200E");
    };
    const render = () => {
      listContainer.empty();
      bullets.forEach((bullet, i) => {
        const row = listContainer.createDiv({ cls: "auto-continue-row" });
        input = row.createEl("input", { type: "text", value: space2visual(bullet) });
        input.style.cssText = "flex:1; font-family:monospace; padding:4px 8px;";
        if (bullets.length === 1 && i == 0) {
          input.placeholder = "e.g. '\\>\u2423' or '-'";
        }
        input.addEventListener("input", (event) => {
          var _a;
          const input2 = event.target;
          if (input2.style.borderColor) {
            input2.style.borderColor = "";
            if (errorNum > 0) errorNum--;
            if (!errorNum) {
              errorText.style.display = "none";
            }
          }
          const pos = (_a = input2.selectionStart) != null ? _a : input2.value.length;
          input2.value = space2visual(input2.value);
        });
        input.addEventListener("change", async (event) => {
          const input2 = event.target;
          checkError();
          if (errorNum !== 0) return;
          bullets[i] = visual2space(input2.value);
          await this.plugin.saveSettings();
        });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            input.blur();
            setTimeout(() => addBtn.focus(), 0);
          }
        });
        const btn = row.createEl("button", { text: "Remove" });
        btn.addEventListener("click", async (event) => {
          const input2 = event.target;
          if (input2.style.borderColor) {
            errorNum--;
          }
          if (errorNum === 0) {
            errorText.textContent = "Fill in empty fields first";
            errorText.style.display = "none";
          }
          bullets.splice(i, 1);
          await this.plugin.saveSettings();
          render();
        });
      });
    };
    render();
    new import_obsidian.Setting(containerEl).addButton(
      (btn) => {
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
          bullets.push("");
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
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEVkaXRvciwgTWFya2Rvd25WaWV3LCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsga2V5bWFwIH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcbmltcG9ydCB7IFByZWMgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcblxuaW50ZXJmYWNlIFNldHRpbmdzIHtcbiAgYnVsbGV0czogc3RyaW5nW107XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNldHRpbmdzID0ge1xuICBidWxsZXRzOiBbXCJcXFxcPiBcIl0sXG59O1xuXG5jb25zdCBOQVRJVkVfQlVMTEVUUyA9IFsnLScsICcqJywgJysnXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ3VzdG9tQnVsbGV0c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzITogU2V0dGluZ3M7XG5cbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAvLyBIb29rIGRpcmVjdGx5IGludG8gQ29kZU1pcnJvciB3aXRoIGhpZ2hlc3QgcHJlY2VkZW5jZSBzbyB3ZSBydW5cbiAgICAvLyBiZWZvcmUgT2JzaWRpYW4ncyBvd24gRW50ZXIgaGFuZGxlci5cbiAgICB0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFxuICAgICAgUHJlYy5oaWdoZXN0KFxuICAgICAgICBrZXltYXAub2YoW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGtleTogXCJFbnRlclwiLFxuICAgICAgICAgICAgcnVuOiAoKSA9PiB0aGlzLmhhbmRsZUVudGVyKCksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSlcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIHdlIGhhbmRsZWQgdGhlIGV2ZW50IChjb25zdW1lIGl0KSwgZmFsc2UgdG8gbGV0IE9ic2lkaWFuJ3MgZGVmYXVsdCBydW4uXG4gIC8vIFRPRE86IEhhbmRsZSBjYXNlcyBpZiBwcmVzc2VkIGVudGVyIGluc2lkZSB0ZXh0IChmb3Igbm93IHlvdSBjYW4gd29ya2Fyb3VuZCB0aGlzIGJ5IHVzaW5nIFNoaWZ0K0VudGVyKVxuICBoYW5kbGVFbnRlcigpOiBib29sZWFuIHtcbiAgICBjb25zdCB2aWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICBpZiAoIXZpZXcpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGVkaXRvcjogRWRpdG9yID0gdmlldy5lZGl0b3I7XG4gICAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICAgIGNvbnN0IHRleHQgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XG5cbiAgICBjb25zdCBtYXRjaGVkID0gdGhpcy5zZXR0aW5ncy5idWxsZXRzLmZpbmQoYnVsbGV0ID0+IHRleHQuc3RhcnRzV2l0aChidWxsZXQpKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBmYWxzZTtcblxuXG4gICAgLy9kZXZcbiAgICAvLyBjb25zdCBzcGFjZTJ2aXN1YWwgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZSgvIC9nLCBcIlx1MjQyM1wiKS5yZXBsYWNlKC9cdTIwMEUvZywgXCJcdTIyMDVcIik7XG4gICAgLy8gY29uc29sZS5sb2coc3BhY2UydmlzdWFsKG1hdGNoZWQpKTtcblxuICAgIGNvbnN0IHN1ZmZpeCA9IHRleHQuc2xpY2UobWF0Y2hlZC5sZW5ndGgpO1xuXG4gICAgaWYgKE5BVElWRV9CVUxMRVRTLmNvbnRhaW5zKG1hdGNoZWQpKSB7XG4gICAgICBpZiAoc3VmZml4ICE9PSBzdWZmaXgudHJpbVN0YXJ0KCkpIHJldHVybiBmYWxzZTsgLy8gSGFuZGxlIGNhc2VzIFxuICAgIH1cblxuICAgIGlmIChzdWZmaXgudHJpbSgpID09PSAnJykge1xuICAgICAgLy8gRW1wdHkgcHJlZml4IGxpbmUgLSBjbGVhciBpdCBhbmQgaW5zZXJ0IGEgbm9ybWFsIG5ld2xpbmUuXG4gICAgICBlZGl0b3Iuc2V0TGluZShjdXJzb3IubGluZSwgJycpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhhcyBjb250ZW50IFx1MjAxNCBjb250aW51ZSBwcmVmaXggb24gbmV4dCBsaW5lLlxuICAgICAgY29uc3QgcG9zID0geyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IHRleHQubGVuZ3RoIH07XG4gICAgICBlZGl0b3IucmVwbGFjZVJhbmdlKFwiXFxuXCIgKyBtYXRjaGVkLCBwb3MpO1xuXG4gICAgICBlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogY3Vyc29yLmxpbmUgKyAxLCBjaDogbWF0Y2hlZC5sZW5ndGggfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIENvbnN1bWUgb2JzaWRpYW4ncyBsb2dpYyBmb3IgRW50ZXJcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG59XG5cbmNsYXNzIFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBDdXN0b21CdWxsZXRzUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEN1c3RvbUJ1bGxldHNQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG5cbiAgICBjb25zdCBidWxsZXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYnVsbGV0czsgLy8gYWxpYXNcblxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICAvLyBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5wbHVnaW4ubWFuaWZlc3QubmFtZSB9KTtcbiAgICBjb25zdCBkZXNjRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIgfSk7XG4gICAgZGVzY0VsLmlubmVySFRNTCA9IFxuICAgIGBcbiAgICBMaW5lcyBzdGFydGluZyB3aXRoIHRoZXNlIHByZWZpeGVzIGFyZSB0cmVhdGVkIGFzIGN1c3RvbSBsaXN0IGJ1bGxldHMgYW5kIGZvbGxvdyBzdGFuZGFyZCBsaXN0IGJlaGF2aW9yOlxuICAgIHByZXNzaW5nIEVudGVyIGFmdGVyIGZpbGxpbmcgaW4gdGhlIGJ1bGxldCBpbnNlcnRzIGEgbmV3IG9uZSBvbiB0aGUgbmV4dCBsaW5lLCB3aGlsZSBwcmVzc2luZyBFbnRlciBvbiBhbiBlbXB0eSBidWxsZXQgbGluZSByZW1vdmVzIHRoZSBwcmVmaXguPGJyPlxuICAgIFdoaXRlc3BhY2VzIChcdTI0MjMpIHNob3VsZCBiZSBkZWNsYXJlZCBleHBsaWNpdGx5LlxuICAgIGA7XG5cbiAgICBjb25zdCBsaXN0Q29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcImF1dG8tY29udGludWUtbGlzdFwiIH0pO1xuXG4gICAgbGV0IGFkZEJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgbGV0IGVycm9yVGV4dDogSFRNTFNwYW5FbGVtZW50O1xuXG4gICAgbGV0IGlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xuICAgIGxldCBlcnJvck51bTogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0IGNoZWNrRXJyb3IgPSAoKSA9PiB7XG4gICAgICAvLyBOdW1iZXIgb2YgZXJyb3JzIGNhdWdodFxuICAgICAgZXJyb3JOdW0gPSAwO1xuICAgICAgXG4gICAgICAvLyBTaG93IGVycm9yIGJhc2VkIG9uIHRoZSBwcmVjZWRlbmNlIChsb3dlc3QgLT4gaGlnaGVzdCkgLSB3aGljaCBSRUFMTFkgc3Vja3MgZnJvbSBVWCBzdGFuZHBvaW50IHNvIFRPRE86IERvIGl0IHByb3Blcmx5XG4gICAgICAvLyBUT0RPOiBtYWtlIGFzIGEgc2VwYXJhdGUgYm9vbGVhbiBmbGFnIGZ1bmN0aW9uIGZvciBjb2hlc2l2ZW5lc3NcblxuICAgICAgY29uc3QgaW5wdXRzID0gbGlzdENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpO1xuICAgICAgaW5wdXRzLmZvckVhY2goKGlucHV0LCBpKSA9PiB7XG5cbiAgICAgICAgY29uc3QgYnVsbGV0ID0gdmlzdWFsMnNwYWNlKGlucHV0LnZhbHVlKTtcblxuICAgICAgICAvKiBDaGVjayBpZiBidWxsZXQgaXMgZW1wdHkgKi9cbiAgICAgICAgaWYgKGJ1bGxldC50cmltKCkubGVuZ3RoID09PSAwKSB7IC8vIGlmIHRyaW1tZWQgYnVsbGV0IGlzIGVtcHR5XG5cbiAgICAgICAgICBpZiAoYnVsbGV0Lmxlbmd0aCAhPT0gMCkgeyAvLyBidXQgdW50cmltbWVkIGlzbnRcbiAgICAgICAgICAgIGVycm9yVGV4dC50ZXh0Q29udGVudCA9IFwiQ2Fubm90IGhhdmUgd2hpdGVzcGFjZXMgYXMgYnVsbGV0c1wiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS10ZXh0LWVycm9yKVwiO1xuICAgICAgICAgIGVycm9yTnVtKys7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBUT0RPOiBDaGVjayBpZiByZWR1bmRhbnQgKi9cbiAgICAgICAgLy8gaWYgKFsuLi5pbnB1dHMudmFsdWVzKCldLnNvbWUoaW5wdXQgPT4gaW5wdXQudmFsdWUgPT09IGJ1bGxldCkpIHsgLy8gQ29tcGFyZSBvdGhlciBpbnB1dHMnIHZhbHVlcyB3aXRoIGN1cnJlbnRcbiAgICAgICAgLy8gICBlcnJvclRleHQudGV4dENvbnRlbnQgPSBgJyR7YnVsbGV0fSBpcyBhbHJlYWR5IHNwZWNpZmllZC5gO1xuICAgICAgICAgIFxuICAgICAgICAvLyAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS10ZXh0LWVycm9yKVwiO1xuICAgICAgICAvLyAgIGVycm9yTnVtKys7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvKiBDaGVjayBpZiBidWxsZXQgdXNlcyBuYXRpdmUgc3ludGF4ICovXG4gICAgICAgIC8vIGlmIGJ1bGxldCBpcyBuYXRpdmUgYW5kIGNvbnRhaW5zIHdoaXRlc3BhY2VzIGFmdGVyIGl0XG4gICAgICAgIGlmIChOQVRJVkVfQlVMTEVUUy5jb250YWlucyhidWxsZXQudHJpbSgpKSkgeyAvLyB0cmltbWVkIGJ1bGxldCBpcyBuYXRpdmVcbiAgICAgICAgICBpZiAoYnVsbGV0Lmxlbmd0aCAhPT0gMSkgeyAvLyBhbmQgYmVpbmcgdW50cmltbWVkIGl0IGlzIG5vdCBhIHNpbmdsZXRvblxuICAgICAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gYENhbm5vdCB1c2UgT2JzaWRpYW4ncyBuYXRpdmUgYnVsbGV0cycgc3ludGF4ICcke3NwYWNlMnZpc3VhbChidWxsZXQpfSdgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpbnB1dC5zdHlsZS5ib3JkZXJDb2xvciA9IFwidmFyKC0tdGV4dC1lcnJvcilcIjtcbiAgICAgICAgICAgIGVycm9yTnVtKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTsgICAgICBcblxuICAgICAgaWYgKGVycm9yTnVtICE9PSAwKSB7XG4gICAgICAgIGVycm9yVGV4dC5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmVcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzcGFjZTJ2aXN1YWwgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZSgvIC9nLCBcIlx1MjQyM1wiKS5yZXBsYWNlKC9cdTIwMEUvZywgXCJcdTIyMDVcIik7XG4gICAgY29uc3QgdmlzdWFsMnNwYWNlID0gKHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHZhbHVlLnJlcGxhY2UoL1x1MjQyMy9nLCBcIiBcIikucmVwbGFjZSgvXHUyMjA1L2csIFwiXHUyMDBFXCIpKSAvLyBkZXZcbiAgICAgIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9cdTI0MjMvZywgXCIgXCIpLnJlcGxhY2UoL1x1MjIwNS9nLCBcIlx1MjAwRVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCByZW5kZXIgPSAoKSA9PiB7XG4gICAgICBsaXN0Q29udGFpbmVyLmVtcHR5KCk7IC8vIHJlc2V0IHZpZXcgKGxpc3RDb250YWluZXIuaW5uZXJIVE1MID0gJycpXG5cbiAgICAgIGJ1bGxldHMuZm9yRWFjaCgoYnVsbGV0LCBpKSA9PiB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGxpc3RDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcImF1dG8tY29udGludWUtcm93XCIgfSk7XG5cbiAgICAgICAgaW5wdXQgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwidGV4dFwiLCB2YWx1ZTogc3BhY2UydmlzdWFsKGJ1bGxldCkgfSk7XG4gICAgICAgIGlucHV0LnN0eWxlLmNzc1RleHQgPSBcImZsZXg6MTsgZm9udC1mYW1pbHk6bW9ub3NwYWNlOyBwYWRkaW5nOjRweCA4cHg7XCI7XG4gICAgICAgIFxuICAgICAgICBpZiAoYnVsbGV0cy5sZW5ndGggPT09IDEgJiYgaSA9PSAwKSB7XG4gICAgICAgICAgaW5wdXQucGxhY2Vob2xkZXIgPSBcImUuZy4gJ1xcXFw+XHUyNDIzJyBvciAnLSdcIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgICAgICAgaWYgKGlucHV0LnN0eWxlLmJvcmRlckNvbG9yKSB7XG4gICAgICAgICAgICBpbnB1dC5zdHlsZS5ib3JkZXJDb2xvciA9ICcnO1xuXG4gICAgICAgICAgICBpZiAoZXJyb3JOdW0gPiAwKSBlcnJvck51bS0tO1xuXG4gICAgICAgICAgICBpZiAoIWVycm9yTnVtKSB7IC8vIGlmIGVycm9yTnVtID09IDA7XG4gICAgICAgICAgICAgIGVycm9yVGV4dC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgcG9zID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQgPz8gaW5wdXQudmFsdWUubGVuZ3RoO1xuICAgICAgICAgIGlucHV0LnZhbHVlID0gc3BhY2UydmlzdWFsKGlucHV0LnZhbHVlKTtcblxuICAgICAgICAgIC8vIGlucHV0LnZhbHVlID0gc3BhY2UydmlzdWFsKHZpc3VhbDJzcGFjZShpbnB1dC52YWx1ZSkpOyAvLyBhbHNvIGxvb2tzXG4gICAgICAgICAgLy8gaW5wdXQuc2V0U2VsZWN0aW9uUmFuZ2UocG9zLCBwb3MpOyAvLyBJIGFtIG5vdCBzdXJlIHdoeSB3ZSBuZWVkIHRoaXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY2hlY2tFcnJvcigpO1xuICAgICAgICB9KTsgKi9cblxuICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICAgICAgICBjaGVja0Vycm9yKClcblxuICAgICAgICAgIGlmIChlcnJvck51bSAhPT0gMCkgcmV0dXJuO1xuXG4gICAgICAgICAgLy8gU2F2ZSB0byBidWxsZXRzXG4gICAgICAgICAgYnVsbGV0c1tpXSA9IHZpc3VhbDJzcGFjZShpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ZW50ID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgICAgIGlucHV0LmJsdXIoKTtcblxuICAgICAgICAgICAgLy8gbmVlZCB0byBqdXN0IGZvY3VzIGJ1dCBub3QgdXNlIGVudGVyIG9uIGZvY3VzZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gYWRkQnRuLmZvY3VzKCksIDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJSZW1vdmVcIiB9KTtcbiAgICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgICAgICAgaWYgKGlucHV0LnN0eWxlLmJvcmRlckNvbG9yKSB7XG4gICAgICAgICAgICBlcnJvck51bS0tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlcnJvck51bSA9PT0gMCkgeyAvLyBpZiBlcnJvck51bSA9PSAwO1xuICAgICAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gXCJGaWxsIGluIGVtcHR5IGZpZWxkcyBmaXJzdFwiOyAvLyBUT0RPOiBjYW4gZHJhc3RpY2FsbHkgbW9kaWZ5IGNvbnRlbnQgc3dpdGNoIGxvZ2ljXG4gICAgICAgICAgICBlcnJvclRleHQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1bGxldHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZW5kZXIoKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5hZGRCdXR0b24oYnRuID0+IHtcbiAgICAgICAgYWRkQnRuID0gYnRuLnNldEJ1dHRvblRleHQoXCIrIEFkZCBwcmVmaXhcIikuc2V0Q3RhKCkuYnV0dG9uRWw7XG5cbiAgICAgICAgZXJyb3JUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgIGVycm9yVGV4dC50ZXh0Q29udGVudCA9IFwiRmlsbCBpbiBlbXB0eSBmaWVsZHMgZmlyc3RcIjtcbiAgICAgICAgZXJyb3JUZXh0LnN0eWxlLmNzc1RleHQgPSBcImNvbG9yOnZhcigtLXRleHQtZXJyb3IpOyBmb250LXNpemU6dmFyKC0tZm9udC1zbWFsbGVyKTsgbWFyZ2luLXJpZ2h0OjhweDsgZGlzcGxheTogbm9uZVwiO1xuICAgICAgICBhZGRCdG4uYmVmb3JlKGVycm9yVGV4dCk7XG5cbiAgICAgICAgYnRuLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTnVtKTtcblxuICAgICAgICAgIGNoZWNrRXJyb3IoKTtcblxuICAgICAgICAgIGlmIChlcnJvck51bSAhPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGJ1bGxldHMucHVzaCgnJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgcmVuZGVyKCk7XG5cbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3Qgc3R5bGUgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInN0eWxlXCIpO1xuICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxuICAgICAgLmF1dG8tY29udGludWUtbGlzdCB7IG1hcmdpbi1ib3R0b206IDEycHg7IH1cbiAgICAgIC5hdXRvLWNvbnRpbnVlLXJvdyB7IGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBnYXA6OHB4OyBtYXJnaW4tYm90dG9tOjhweDsgfVxuICAgIGA7XG4gIH1cbn0iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUE2RTtBQUM3RSxrQkFBdUI7QUFDdkIsbUJBQXFCO0FBTXJCLElBQU0sbUJBQTZCO0FBQUEsRUFDakMsU0FBUyxDQUFDLE1BQU07QUFDbEI7QUFFQSxJQUFNLGlCQUFpQixDQUFDLEtBQUssS0FBSyxHQUFHO0FBRXJDLElBQXFCLHNCQUFyQixjQUFpRCx1QkFBTztBQUFBLEVBR3RELE1BQU0sU0FBUztBQUNiLFVBQU0sS0FBSyxhQUFhO0FBQ3hCLFNBQUssY0FBYyxJQUFJLFdBQVcsS0FBSyxLQUFLLElBQUksQ0FBQztBQUlqRCxTQUFLO0FBQUEsTUFDSCxrQkFBSztBQUFBLFFBQ0gsbUJBQU8sR0FBRztBQUFBLFVBQ1I7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLEtBQUssTUFBTSxLQUFLLFlBQVk7QUFBQSxVQUM5QjtBQUFBLFFBQ0YsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUE7QUFBQSxFQUlBLGNBQXVCO0FBQ3JCLFVBQU0sT0FBTyxLQUFLLElBQUksVUFBVSxvQkFBb0IsNEJBQVk7QUFDaEUsUUFBSSxDQUFDLEtBQU0sUUFBTztBQUVsQixVQUFNLFNBQWlCLEtB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
