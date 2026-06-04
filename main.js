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
  // TODO: Handle cases if pressed enter inside text (for now you can workaround this by using)
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
    const space2visual = (value) => value.replace(/ /g, "\u2423");
    const visual2space = (value) => value.replace(/␣/g, " ");
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEVkaXRvciwgTWFya2Rvd25WaWV3LCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsga2V5bWFwIH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcbmltcG9ydCB7IFByZWMgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcblxuaW50ZXJmYWNlIFNldHRpbmdzIHtcbiAgYnVsbGV0czogc3RyaW5nW107XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNldHRpbmdzID0ge1xuICBidWxsZXRzOiBbXCJcXFxcPiBcIl0sXG59O1xuXG5jb25zdCBOQVRJVkVfQlVMTEVUUyA9IFsnLScsICcqJywgJysnXTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQ3VzdG9tQnVsbGV0c1BsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzITogU2V0dGluZ3M7XG5cbiAgYXN5bmMgb25sb2FkKCkge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAvLyBIb29rIGRpcmVjdGx5IGludG8gQ29kZU1pcnJvciB3aXRoIGhpZ2hlc3QgcHJlY2VkZW5jZSBzbyB3ZSBydW5cbiAgICAvLyBiZWZvcmUgT2JzaWRpYW4ncyBvd24gRW50ZXIgaGFuZGxlci5cbiAgICB0aGlzLnJlZ2lzdGVyRWRpdG9yRXh0ZW5zaW9uKFxuICAgICAgUHJlYy5oaWdoZXN0KFxuICAgICAgICBrZXltYXAub2YoW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGtleTogXCJFbnRlclwiLFxuICAgICAgICAgICAgcnVuOiAoKSA9PiB0aGlzLmhhbmRsZUVudGVyKCksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSlcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgLy8gUmV0dXJucyB0cnVlIGlmIHdlIGhhbmRsZWQgdGhlIGV2ZW50IChjb25zdW1lIGl0KSwgZmFsc2UgdG8gbGV0IE9ic2lkaWFuJ3MgZGVmYXVsdCBydW4uXG4gIC8vIFRPRE86IEhhbmRsZSBjYXNlcyBpZiBwcmVzc2VkIGVudGVyIGluc2lkZSB0ZXh0IChmb3Igbm93IHlvdSBjYW4gd29ya2Fyb3VuZCB0aGlzIGJ5IHVzaW5nKVxuICBoYW5kbGVFbnRlcigpOiBib29sZWFuIHtcbiAgICBjb25zdCB2aWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICBpZiAoIXZpZXcpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGVkaXRvcjogRWRpdG9yID0gdmlldy5lZGl0b3I7XG4gICAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICAgIGNvbnN0IHRleHQgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XG5cbiAgICBjb25zdCBtYXRjaGVkID0gdGhpcy5zZXR0aW5ncy5idWxsZXRzLmZpbmQoYnVsbGV0ID0+IHRleHQuc3RhcnRzV2l0aChidWxsZXQpKTtcbiAgICBpZiAoIW1hdGNoZWQpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IHN1ZmZpeCA9IHRleHQuc2xpY2UobWF0Y2hlZC5sZW5ndGgpO1xuXG4gICAgaWYgKE5BVElWRV9CVUxMRVRTLmNvbnRhaW5zKG1hdGNoZWQpKSB7XG4gICAgICBpZiAoc3VmZml4ICE9PSBzdWZmaXgudHJpbVN0YXJ0KCkpIHJldHVybiBmYWxzZTsgLy8gSGFuZGxlIGNhc2VzIFxuICAgIH1cblxuICAgIGlmIChzdWZmaXgudHJpbSgpID09PSAnJykge1xuICAgICAgLy8gRW1wdHkgcHJlZml4IGxpbmUgLSBjbGVhciBpdCBhbmQgaW5zZXJ0IGEgbm9ybWFsIG5ld2xpbmUuXG4gICAgICBlZGl0b3Iuc2V0TGluZShjdXJzb3IubGluZSwgJycpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhhcyBjb250ZW50IFx1MjAxNCBjb250aW51ZSBwcmVmaXggb24gbmV4dCBsaW5lLlxuICAgICAgY29uc3QgcG9zID0geyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IHRleHQubGVuZ3RoIH07XG4gICAgICBlZGl0b3IucmVwbGFjZVJhbmdlKFwiXFxuXCIgKyBtYXRjaGVkLCBwb3MpO1xuXG4gICAgICBlZGl0b3Iuc2V0Q3Vyc29yKHsgbGluZTogY3Vyc29yLmxpbmUgKyAxLCBjaDogbWF0Y2hlZC5sZW5ndGggfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIENvbnN1bWUgb2JzaWRpYW4ncyBsb2dpYyBmb3IgRW50ZXJcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG59XG5cbmNsYXNzIFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcGx1Z2luOiBDdXN0b21CdWxsZXRzUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEN1c3RvbUJ1bGxldHNQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG5cbiAgICBjb25zdCBidWxsZXRzID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYnVsbGV0czsgLy8gYWxpYXNcblxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICAvLyBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogdGhpcy5wbHVnaW4ubWFuaWZlc3QubmFtZSB9KTtcbiAgICBjb25zdCBkZXNjRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2V0dGluZy1pdGVtLWRlc2NyaXB0aW9uXCIgfSk7XG4gICAgZGVzY0VsLmlubmVySFRNTCA9IFxuICAgIGBcbiAgICBMaW5lcyBzdGFydGluZyB3aXRoIHRoZXNlIHByZWZpeGVzIGFyZSB0cmVhdGVkIGFzIGN1c3RvbSBsaXN0IGJ1bGxldHMgYW5kIGZvbGxvdyBzdGFuZGFyZCBsaXN0IGJlaGF2aW9yOlxuICAgIHByZXNzaW5nIEVudGVyIGFmdGVyIGZpbGxpbmcgaW4gdGhlIGJ1bGxldCBpbnNlcnRzIGEgbmV3IG9uZSBvbiB0aGUgbmV4dCBsaW5lLCB3aGlsZSBwcmVzc2luZyBFbnRlciBvbiBhbiBlbXB0eSBidWxsZXQgbGluZSByZW1vdmVzIHRoZSBwcmVmaXguPGJyPlxuICAgIFdoaXRlc3BhY2VzIChcdTI0MjMpIHNob3VsZCBiZSBkZWNsYXJlZCBleHBsaWNpdGx5LlxuICAgIGA7XG5cbiAgICBjb25zdCBsaXN0Q29udGFpbmVyID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcImF1dG8tY29udGludWUtbGlzdFwiIH0pO1xuXG4gICAgbGV0IGFkZEJ0bjogSFRNTEJ1dHRvbkVsZW1lbnQ7XG4gICAgbGV0IGVycm9yVGV4dDogSFRNTFNwYW5FbGVtZW50O1xuXG4gICAgbGV0IGlucHV0OiBIVE1MSW5wdXRFbGVtZW50O1xuICAgIGxldCBlcnJvck51bTogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0IGNoZWNrRXJyb3IgPSAoKSA9PiB7XG4gICAgICAvLyBOdW1iZXIgb2YgZXJyb3JzIGNhdWdodFxuICAgICAgZXJyb3JOdW0gPSAwO1xuICAgICAgXG4gICAgICAvLyBTaG93IGVycm9yIGJhc2VkIG9uIHRoZSBwcmVjZWRlbmNlIChsb3dlc3QgLT4gaGlnaGVzdCkgLSB3aGljaCBSRUFMTFkgc3Vja3MgZnJvbSBVWCBzdGFuZHBvaW50IHNvIFRPRE86IERvIGl0IHByb3Blcmx5XG4gICAgICAvLyBUT0RPOiBtYWtlIGFzIGEgc2VwYXJhdGUgYm9vbGVhbiBmbGFnIGZ1bmN0aW9uIGZvciBjb2hlc2l2ZW5lc3NcblxuICAgICAgY29uc3QgaW5wdXRzID0gbGlzdENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCdpbnB1dCcpO1xuICAgICAgaW5wdXRzLmZvckVhY2goKGlucHV0LCBpKSA9PiB7XG5cbiAgICAgICAgY29uc3QgYnVsbGV0ID0gdmlzdWFsMnNwYWNlKGlucHV0LnZhbHVlKTtcblxuICAgICAgICAvKiBDaGVjayBpZiBidWxsZXQgaXMgZW1wdHkgKi9cbiAgICAgICAgaWYgKGJ1bGxldC50cmltKCkubGVuZ3RoID09PSAwKSB7IC8vIGlmIHRyaW1tZWQgYnVsbGV0IGlzIGVtcHR5XG5cbiAgICAgICAgICBpZiAoYnVsbGV0Lmxlbmd0aCAhPT0gMCkgeyAvLyBidXQgdW50cmltbWVkIGlzbnRcbiAgICAgICAgICAgIGVycm9yVGV4dC50ZXh0Q29udGVudCA9IFwiQ2Fubm90IGhhdmUgd2hpdGVzcGFjZXMgYXMgYnVsbGV0c1wiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS10ZXh0LWVycm9yKVwiO1xuICAgICAgICAgIGVycm9yTnVtKys7XG4gICAgICAgIH1cblxuICAgICAgICAvKiBUT0RPOiBDaGVjayBpZiByZWR1bmRhbnQgKi9cbiAgICAgICAgLy8gaWYgKFsuLi5pbnB1dHMudmFsdWVzKCldLnNvbWUoaW5wdXQgPT4gaW5wdXQudmFsdWUgPT09IGJ1bGxldCkpIHsgLy8gQ29tcGFyZSBvdGhlciBpbnB1dHMnIHZhbHVlcyB3aXRoIGN1cnJlbnRcbiAgICAgICAgLy8gICBlcnJvclRleHQudGV4dENvbnRlbnQgPSBgJyR7YnVsbGV0fSBpcyBhbHJlYWR5IHNwZWNpZmllZC5gO1xuICAgICAgICAgIFxuICAgICAgICAvLyAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS10ZXh0LWVycm9yKVwiO1xuICAgICAgICAvLyAgIGVycm9yTnVtKys7XG4gICAgICAgIC8vIH1cblxuICAgICAgICAvKiBDaGVjayBpZiBidWxsZXQgdXNlcyBuYXRpdmUgc3ludGF4ICovXG4gICAgICAgIC8vIGlmIGJ1bGxldCBpcyBuYXRpdmUgYW5kIGNvbnRhaW5zIHdoaXRlc3BhY2VzIGFmdGVyIGl0XG4gICAgICAgIGlmIChOQVRJVkVfQlVMTEVUUy5jb250YWlucyhidWxsZXQudHJpbSgpKSkgeyAvLyB0cmltbWVkIGJ1bGxldCBpcyBuYXRpdmVcbiAgICAgICAgICBpZiAoYnVsbGV0Lmxlbmd0aCAhPT0gMSkgeyAvLyBhbmQgYmVpbmcgdW50cmltbWVkIGl0IGlzIG5vdCBhIHNpbmdsZXRvblxuICAgICAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gYENhbm5vdCB1c2UgT2JzaWRpYW4ncyBuYXRpdmUgYnVsbGV0cycgc3ludGF4ICcke3NwYWNlMnZpc3VhbChidWxsZXQpfSdgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpbnB1dC5zdHlsZS5ib3JkZXJDb2xvciA9IFwidmFyKC0tdGV4dC1lcnJvcilcIjtcbiAgICAgICAgICAgIGVycm9yTnVtKys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTsgICAgICBcblxuICAgICAgaWYgKGVycm9yTnVtICE9PSAwKSB7XG4gICAgICAgIGVycm9yVGV4dC5zdHlsZS5kaXNwbGF5ID0gXCJpbmxpbmVcIjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBzcGFjZTJ2aXN1YWwgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZSgvIC9nLCBcIlx1MjQyM1wiKTtcbiAgICBjb25zdCB2aXN1YWwyc3BhY2UgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZSgvXHUyNDIzL2csIFwiIFwiKTtcblxuICAgIGNvbnN0IHJlbmRlciA9ICgpID0+IHtcbiAgICAgIGxpc3RDb250YWluZXIuZW1wdHkoKTsgLy8gcmVzZXQgdmlldyAobGlzdENvbnRhaW5lci5pbm5lckhUTUwgPSAnJylcblxuICAgICAgYnVsbGV0cy5mb3JFYWNoKChidWxsZXQsIGkpID0+IHtcbiAgICAgICAgY29uc3Qgcm93ID0gbGlzdENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiYXV0by1jb250aW51ZS1yb3dcIiB9KTtcblxuICAgICAgICBpbnB1dCA9IHJvdy5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiBzcGFjZTJ2aXN1YWwoYnVsbGV0KSB9KTtcbiAgICAgICAgaW5wdXQuc3R5bGUuY3NzVGV4dCA9IFwiZmxleDoxOyBmb250LWZhbWlseTptb25vc3BhY2U7IHBhZGRpbmc6NHB4IDhweDtcIjtcbiAgICAgICAgXG4gICAgICAgIGlmIChidWxsZXRzLmxlbmd0aCA9PT0gMSAmJiBpID09IDApIHtcbiAgICAgICAgICBpbnB1dC5wbGFjZWhvbGRlciA9IFwiZS5nLiAnXFxcXD5cdTI0MjMnIG9yICctJ1wiO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICAgICAgICBpZiAoaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IpIHtcbiAgICAgICAgICAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gJyc7XG5cbiAgICAgICAgICAgIGlmIChlcnJvck51bSA+IDApIGVycm9yTnVtLS07XG5cbiAgICAgICAgICAgIGlmICghZXJyb3JOdW0pIHsgLy8gaWYgZXJyb3JOdW0gPT0gMDtcbiAgICAgICAgICAgICAgZXJyb3JUZXh0LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBwb3MgPSBpbnB1dC5zZWxlY3Rpb25TdGFydCA/PyBpbnB1dC52YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgaW5wdXQudmFsdWUgPSBzcGFjZTJ2aXN1YWwoaW5wdXQudmFsdWUpO1xuXG4gICAgICAgICAgLy8gaW5wdXQudmFsdWUgPSBzcGFjZTJ2aXN1YWwodmlzdWFsMnNwYWNlKGlucHV0LnZhbHVlKSk7IC8vIGFsc28gbG9va3NcbiAgICAgICAgICAvLyBpbnB1dC5zZXRTZWxlY3Rpb25SYW5nZShwb3MsIHBvcyk7IC8vIEkgYW0gbm90IHN1cmUgd2h5IHdlIG5lZWQgdGhpc1xuICAgICAgICB9KTtcblxuICAgICAgICAvKiBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjaGVja0Vycm9yKCk7XG4gICAgICAgIH0pOyAqL1xuXG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgaW5wdXQgPSBldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudDtcblxuICAgICAgICAgIGNoZWNrRXJyb3IoKVxuXG4gICAgICAgICAgaWYgKGVycm9yTnVtICE9PSAwKSByZXR1cm47XG5cbiAgICAgICAgICAvLyBTYXZlIHRvIGJ1bGxldHNcbiAgICAgICAgICBidWxsZXRzW2ldID0gdmlzdWFsMnNwYWNlKGlucHV0LnZhbHVlKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZXZlbnQgPT4ge1xuICAgICAgICAgIGlmIChldmVudC5rZXkgPT09IFwiRW50ZXJcIikge1xuICAgICAgICAgICAgaW5wdXQuYmx1cigpO1xuXG4gICAgICAgICAgICAvLyBuZWVkIHRvIGp1c3QgZm9jdXMgYnV0IG5vdCB1c2UgZW50ZXIgb24gZm9jdXNlZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBhZGRCdG4uZm9jdXMoKSwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCBidG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlJlbW92ZVwiIH0pO1xuICAgICAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICAgICAgICBpZiAoaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IpIHtcbiAgICAgICAgICAgIGVycm9yTnVtLS07XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGVycm9yTnVtID09PSAwKSB7IC8vIGlmIGVycm9yTnVtID09IDA7XG4gICAgICAgICAgICBlcnJvclRleHQudGV4dENvbnRlbnQgPSBcIkZpbGwgaW4gZW1wdHkgZmllbGRzIGZpcnN0XCI7IC8vIFRPRE86IGNhbiBkcmFzdGljYWxseSBtb2RpZnkgY29udGVudCBzd2l0Y2ggbG9naWNcbiAgICAgICAgICAgIGVycm9yVGV4dC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYnVsbGV0cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgcmVuZGVyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlbmRlcigpO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpLmFkZEJ1dHRvbihidG4gPT4ge1xuICAgICAgICBhZGRCdG4gPSBidG4uc2V0QnV0dG9uVGV4dChcIisgQWRkIHByZWZpeFwiKS5zZXRDdGEoKS5idXR0b25FbDtcblxuICAgICAgICBlcnJvclRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gXCJGaWxsIGluIGVtcHR5IGZpZWxkcyBmaXJzdFwiO1xuICAgICAgICBlcnJvclRleHQuc3R5bGUuY3NzVGV4dCA9IFwiY29sb3I6dmFyKC0tdGV4dC1lcnJvcik7IGZvbnQtc2l6ZTp2YXIoLS1mb250LXNtYWxsZXIpOyBtYXJnaW4tcmlnaHQ6OHB4OyBkaXNwbGF5OiBub25lXCI7XG4gICAgICAgIGFkZEJ0bi5iZWZvcmUoZXJyb3JUZXh0KTtcblxuICAgICAgICBidG4ub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5sb2coZXJyb3JOdW0pO1xuXG4gICAgICAgICAgY2hlY2tFcnJvcigpO1xuXG4gICAgICAgICAgaWYgKGVycm9yTnVtICE9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgYnVsbGV0cy5wdXNoKCcnKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICByZW5kZXIoKTtcblxuICAgICAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBzdHlsZSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic3R5bGVcIik7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAuYXV0by1jb250aW51ZS1saXN0IHsgbWFyZ2luLWJvdHRvbTogMTJweDsgfVxuICAgICAgLmF1dG8tY29udGludWUtcm93IHsgZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGdhcDo4cHg7IG1hcmdpbi1ib3R0b206OHB4OyB9XG4gICAgYDtcbiAgfVxufVxuXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7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QU0sTUFBTTtBQUNoRCxVQUFBQSxPQUFNLFFBQVEsYUFBYUEsT0FBTSxLQUFLO0FBQUEsUUFJeEMsQ0FBQztBQU1ELGNBQU0saUJBQWlCLFVBQVUsT0FBTyxVQUFVO0FBQ2hELGdCQUFNQSxTQUFRLE1BQU07QUFFcEIscUJBQVc7QUFFWCxjQUFJLGFBQWEsRUFBRztBQUdwQixrQkFBUSxDQUFDLElBQUksYUFBYUEsT0FBTSxLQUFLO0FBQ3JDLGdCQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsUUFDakMsQ0FBQztBQUVELGNBQU0saUJBQWlCLFdBQVcsV0FBUztBQUN6QyxjQUFJLE1BQU0sUUFBUSxTQUFTO0FBQ3pCLGtCQUFNLEtBQUs7QUFHWCx1QkFBVyxNQUFNLE9BQU8sTUFBTSxHQUFHLENBQUM7QUFBQSxVQUNwQztBQUFBLFFBQ0YsQ0FBQztBQUVELGNBQU0sTUFBTSxJQUFJLFNBQVMsVUFBVSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3JELFlBQUksaUJBQWlCLFNBQVMsT0FBTyxVQUFVO0FBQzdDLGdCQUFNQSxTQUFRLE1BQU07QUFFcEIsY0FBSUEsT0FBTSxNQUFNLGFBQWE7QUFDM0I7QUFBQSxVQUNGO0FBRUEsY0FBSSxhQUFhLEdBQUc7QUFDbEIsc0JBQVUsY0FBYztBQUN4QixzQkFBVSxNQUFNLFVBQVU7QUFBQSxVQUM1QjtBQUVBLGtCQUFRLE9BQU8sR0FBRyxDQUFDO0FBQ25CLGdCQUFNLEtBQUssT0FBTyxhQUFhO0FBQy9CLGlCQUFPO0FBQUEsUUFDVCxDQUFDO0FBQUEsTUFDSCxDQUFDO0FBQUEsSUFDSDtBQUVBLFdBQU87QUFFUCxRQUFJLHdCQUFRLFdBQVcsRUFBRTtBQUFBLE1BQVUsU0FBTztBQUN0QyxpQkFBUyxJQUFJLGNBQWMsY0FBYyxFQUFFLE9BQU8sRUFBRTtBQUVwRCxvQkFBWSxTQUFTLGNBQWMsTUFBTTtBQUN6QyxrQkFBVSxjQUFjO0FBQ3hCLGtCQUFVLE1BQU0sVUFBVTtBQUMxQixlQUFPLE9BQU8sU0FBUztBQUV2QixZQUFJLFFBQVEsWUFBWTtBQUN0QixrQkFBUSxJQUFJLFFBQVE7QUFFcEIscUJBQVc7QUFFWCxjQUFJLGFBQWEsR0FBRztBQUNsQjtBQUFBLFVBQ0Y7QUFFQSxrQkFBUSxLQUFLLEVBQUU7QUFDZixnQkFBTSxLQUFLLE9BQU8sYUFBYTtBQUMvQixpQkFBTztBQUVQLGdCQUFNLE1BQU07QUFBQSxRQUNkLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUVBLFVBQU0sUUFBUSxZQUFZLFNBQVMsT0FBTztBQUMxQyxVQUFNLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUl0QjtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbnB1dCJdCn0K
