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
  bullets: ["\\> ", "-"]
};
var NATIVE_BULLETS = ["-", "*", "+"];
var CustomBulletsPlugin = class extends import_obsidian.Plugin {
  async loadSettings() {
    var _a;
    this.settings = Object.assign({}, (_a = await this.loadData()) != null ? _a : DEFAULT_SETTINGS);
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
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
  // Mimic native new line  behaviour + our additional logic
  // Returns true if we handled the event (consume it), false to let Obsidian's default run.
  handleEnter() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian.MarkdownView);
    if (!view) return false;
    const editor = view.editor;
    const cursor = editor.getCursor();
    if (cursor.ch === 0) {
      return false;
    }
    const lineText = editor.getLine(cursor.line);
    const caught = this.settings.bullets.find((bullet) => lineText.startsWith(bullet));
    if (!caught) return false;
    const text = lineText.slice(caught.length);
    if (NATIVE_BULLETS.contains(caught)) {
      if (text !== text.trimStart()) return false;
    }
    if (caught === "-" && /--+/.test(text)) return false;
    if (text.trim() === "") {
      editor.setLine(cursor.line, "");
    } else {
      const remaining = lineText.slice(cursor.ch);
      const pos = { line: cursor.line, ch: lineText.length };
      editor.replaceRange("\n" + caught + remaining, pos);
      editor.setLine(cursor.line, lineText.slice(0, cursor.ch));
      editor.setCursor({
        line: cursor.line + 1,
        ch: caught.length
        /*  + remaining.length */
      });
    }
    return true;
  }
};
var SettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    const style = containerEl.createEl("style");
    style.textContent = `
      .cb-list { margin-bottom: 12px; }
      .cb-list-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    `;
    const space2visual = (value) => value.replace(/ /g, "\u2423").replace(/‎/g, "\u2205");
    const visual2space = (value) => value.replace(/␣/g, " ").replace(/∅/g, "\u200E");
    const cachedBullets = this.plugin.settings.bullets;
    const descEl = containerEl.createEl("p", { cls: "cb-setting-description" });
    descEl.innerHTML = `
    Lines starting with these prefixes are treated as custom list bullets and follow standard list behavior:
    pressing Enter after filling in the bullet inserts a new one on the next line, while pressing Enter on an empty bullet line removes the prefix.<br>
    Whitespaces (\u2423) should be declared explicitly.
    `;
    const listContainer = containerEl.createDiv({ cls: "cb-list" });
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
    const render = () => {
      listContainer.empty();
      cachedBullets.forEach((bullet, i) => {
        const row = listContainer.createDiv({ cls: "cb-list-row" });
        if (false) {
        }
        input = row.createEl("input", { type: "text", value: space2visual(bullet) });
        input.style.cssText = "flex:1; font-family:monospace; padding:4px 8px;";
        if (cachedBullets.length === 0) {
          input.placeholder = "e.g. '\\>\u2423' or '-'";
        }
        input.addEventListener("input", (event) => {
          const input2 = event.target;
          if (input2.style.borderColor) {
            input2.style.borderColor = "";
            if (errorNum > 0) errorNum--;
            if (!errorNum) {
              errorText.style.display = "none";
            }
          }
          input2.value = space2visual(input2.value);
        });
        input.addEventListener("change", async (event) => {
          const input2 = event.target;
          checkError();
          if (errorNum !== 0) return;
          cachedBullets[i] = visual2space(input2.value);
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
          cachedBullets.splice(i, 1);
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
          cachedBullets.push("");
          await this.plugin.saveSettings();
          render();
          input.focus();
        });
      }
    );
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IEVkaXRvciwgTWFya2Rvd25WaWV3LCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIEFwcCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsga2V5bWFwIH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcbmltcG9ydCB7IFByZWMgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcblxuaW50ZXJmYWNlIFNldHRpbmdzIHtcbiAgYnVsbGV0czogc3RyaW5nW107XG59XG5cbmNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFNldHRpbmdzID0ge1xuICBidWxsZXRzOiBbXCJcXFxcPiBcIiwgJy0nXSxcbn07XG5cbmNvbnN0IE5BVElWRV9CVUxMRVRTID0gWyctJywgJyonLCAnKyddO1xuY29uc3QgSU5WSVNJQkxFID0gWydcdTIwMEUnXVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBDdXN0b21CdWxsZXRzUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3MhOiBTZXR0aW5ncztcblxuICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XG4gICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30gLyogZW1wdHkgb2JqZWN0ICovLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkgPz8gREVGQVVMVF9TRVRUSU5HUyk7XG4gIH1cblxuICBhc3luYyBzYXZlU2V0dGluZ3MoKSB7XG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcbiAgfVxuXG4gIGFzeW5jIG9ubG9hZCgpIHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG5cbiAgICAvLyBIb29rIGRpcmVjdGx5IGludG8gQ29kZU1pcnJvciB3aXRoIGhpZ2hlc3QgcHJlY2VkZW5jZSBzbyB3ZSBydW5cbiAgICAvLyBiZWZvcmUgT2JzaWRpYW4ncyBvd24gRW50ZXIgaGFuZGxlclxuICAgIHRoaXMucmVnaXN0ZXJFZGl0b3JFeHRlbnNpb24oXG4gICAgICBQcmVjLmhpZ2hlc3QoXG4gICAgICAgIGtleW1hcC5vZihbXG4gICAgICAgICAge1xuICAgICAgICAgICAga2V5OiBcIkVudGVyXCIsXG4gICAgICAgICAgICBydW46ICgpID0+IHRoaXMuaGFuZGxlRW50ZXIoKSxcbiAgICAgICAgICB9LFxuICAgICAgICBdKVxuICAgICAgKVxuICAgICk7XG4gIH1cblxuICAvLyBNaW1pYyBuYXRpdmUgbmV3IGxpbmUgIGJlaGF2aW91ciArIG91ciBhZGRpdGlvbmFsIGxvZ2ljXG4gIC8vIFJldHVybnMgdHJ1ZSBpZiB3ZSBoYW5kbGVkIHRoZSBldmVudCAoY29uc3VtZSBpdCksIGZhbHNlIHRvIGxldCBPYnNpZGlhbidzIGRlZmF1bHQgcnVuLlxuICBoYW5kbGVFbnRlcigpOiBib29sZWFuIHtcbiAgICBjb25zdCB2aWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICBpZiAoIXZpZXcpIHJldHVybiBmYWxzZTtcblxuICAgIGNvbnN0IGVkaXRvcjogRWRpdG9yID0gdmlldy5lZGl0b3I7XG4gICAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuXG4gICAgaWYgKGN1cnNvci5jaCA9PT0gMCkgeyAvLyBpZ25vcmUgY3VzdG9tIGxvZ2ljIG9uIGNoIDBcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBjb25zdCBsaW5lVGV4dCA9IGVkaXRvci5nZXRMaW5lKGN1cnNvci5saW5lKTtcblxuICAgIGNvbnN0IGNhdWdodCA9IHRoaXMuc2V0dGluZ3MuYnVsbGV0cy5maW5kKGJ1bGxldCA9PiBsaW5lVGV4dC5zdGFydHNXaXRoKGJ1bGxldCkpO1xuICAgIGlmICghY2F1Z2h0KSByZXR1cm4gZmFsc2U7IC8vIGRpZG4ndCBjYXRjaCBhbnkgb2YgdGhlIGJ1bGxldHMsIGVuZCBvdXIgY3VzdG9tIGxvZ2ljXG5cbiAgICBjb25zdCB0ZXh0ID0gbGluZVRleHQuc2xpY2UoY2F1Z2h0Lmxlbmd0aCk7IC8vIGdldCBzdWZmaXggKHRleHQgbWludXMgdGhlIGJ1bGxldClcblxuICAgIC8vIENoZWNrIGZvciBuYXRpdmUgYnVsbGV0IHN5bnRheFxuICAgIC8vIChpZiBidWxsZXQgc3ludGF4IHN5bWJvbCBpcyBuYXRpdmUgYW5kIGl0IGhhcyB0cmFpbGluZyBzcGFjZXMgd2UgYmFpbCkgVE9ETzogbGVhcm4gd2hhdCBiYWlsIG1lYW5zXG4gICAgaWYgKE5BVElWRV9CVUxMRVRTLmNvbnRhaW5zKGNhdWdodCkpIHtcbiAgICAgIGlmICh0ZXh0ICE9PSB0ZXh0LnRyaW1TdGFydCgpKSByZXR1cm4gZmFsc2U7IFxuICAgIH1cblxuICAgIC8vIElmIGxpbmUgdGV4dCBpcyBuYXRpdmUgc2VwYXJhdG9yIHN5bnRheCAoJy0tLScpIGFuZCBjYXVnaHQgaXMgJy0nXG4gICAgaWYgKGNhdWdodCA9PT0gJy0nICYmIC8tLSsvLnRlc3QodGV4dCkpIHJldHVybiBmYWxzZTtcblxuICAgIC8vIGlmIHRleHQgaXMgZW1wdHkgd2UgY2xlYXIgdGhlIGxpbmVcbiAgICBpZiAodGV4dC50cmltKCkgPT09ICcnKSB7XG4gICAgICBlZGl0b3Iuc2V0TGluZShjdXJzb3IubGluZSwgJycpO1xuICAgIH0gXG4gICAgZWxzZSB7XG4gICAgICBjb25zdCByZW1haW5pbmcgPSBsaW5lVGV4dC5zbGljZShjdXJzb3IuY2gpOyAvLyB0ZXh0IGFmdGVyIGN1cnNvcidzIHBvcyB0byBhcHBlbmQgb24gbmV4dCBsaW5lIFxuXG4gICAgICAvLyBpdCBoYXMgY29udGVudCwgYXBwZW5kIG5ldyBsaW5lIHdpdGggdGhlIGJ1bGxldCBzeW1ib2xcbiAgICAgIGNvbnN0IHBvcyA9IHsgbGluZTogY3Vyc29yLmxpbmUsIGNoOiBsaW5lVGV4dC5sZW5ndGggfTtcbiAgICAgIGVkaXRvci5yZXBsYWNlUmFuZ2UoXCJcXG5cIiArIGNhdWdodCArIHJlbWFpbmluZywgcG9zKTtcblxuICAgICAgZWRpdG9yLnNldExpbmUoY3Vyc29yLmxpbmUsIGxpbmVUZXh0LnNsaWNlKDAsIGN1cnNvci5jaCkpOyAvLyBzZXQgbGluZSB3aXRoIGxpbmUgdGV4dCB1cCB0byBjdXJzb3IncyBwb3NcbiAgICAgIFxuICAgICAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgMSwgY2g6IGNhdWdodC5sZW5ndGgvKiAgKyByZW1haW5pbmcubGVuZ3RoICovfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7IC8vIENvbnN1bWUgb2JzaWRpYW4ncyBsb2dpYyBmb3IgRW50ZXJcbiAgfVxufVxuXG5jbGFzcyBTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG5cbiAgcGx1Z2luOiBDdXN0b21CdWxsZXRzUGx1Z2luO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IEN1c3RvbUJ1bGxldHNQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTsgLy8gZW1wdHkgdG8gZ2V0IHJlYWR5IGZvciBuZXcgcmVuZGVyXG5cbiAgICAvLyBzZXQgc3R5bGVcbiAgICBjb25zdCBzdHlsZSA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwic3R5bGVcIik7XG4gICAgc3R5bGUudGV4dENvbnRlbnQgPSBgXG4gICAgICAuY2ItbGlzdCB7IG1hcmdpbi1ib3R0b206IDEycHg7IH1cbiAgICAgIC5jYi1saXN0LXJvdyB7IGRpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBnYXA6OHB4OyBtYXJnaW4tYm90dG9tOjhweDsgfVxuICAgIGA7XG5cbiAgICBjb25zdCBzcGFjZTJ2aXN1YWwgPSAodmFsdWU6IHN0cmluZykgPT4gdmFsdWUucmVwbGFjZSgvIC9nLCBcIlx1MjQyM1wiKS5yZXBsYWNlKC9cdTIwMEUvZywgXCJcdTIyMDVcIik7XG4gICAgY29uc3QgdmlzdWFsMnNwYWNlID0gKHZhbHVlOiBzdHJpbmcpID0+IHZhbHVlLnJlcGxhY2UoL1x1MjQyMy9nLCBcIiBcIikucmVwbGFjZSgvXHUyMjA1L2csIFwiXHUyMDBFXCIpO1xuXG4gICAgY29uc3QgY2FjaGVkQnVsbGV0cyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmJ1bGxldHM7IC8vIGFsaWFzXG5cbiAgICBjb25zdCBkZXNjRWwgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwiY2Itc2V0dGluZy1kZXNjcmlwdGlvblwiIH0pO1xuICAgIGRlc2NFbC5pbm5lckhUTUwgPSBcbiAgICBgXG4gICAgTGluZXMgc3RhcnRpbmcgd2l0aCB0aGVzZSBwcmVmaXhlcyBhcmUgdHJlYXRlZCBhcyBjdXN0b20gbGlzdCBidWxsZXRzIGFuZCBmb2xsb3cgc3RhbmRhcmQgbGlzdCBiZWhhdmlvcjpcbiAgICBwcmVzc2luZyBFbnRlciBhZnRlciBmaWxsaW5nIGluIHRoZSBidWxsZXQgaW5zZXJ0cyBhIG5ldyBvbmUgb24gdGhlIG5leHQgbGluZSwgd2hpbGUgcHJlc3NpbmcgRW50ZXIgb24gYW4gZW1wdHkgYnVsbGV0IGxpbmUgcmVtb3ZlcyB0aGUgcHJlZml4Ljxicj5cbiAgICBXaGl0ZXNwYWNlcyAoXHUyNDIzKSBzaG91bGQgYmUgZGVjbGFyZWQgZXhwbGljaXRseS5cbiAgICBgO1xuXG4gICAgY29uc3QgbGlzdENvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogXCJjYi1saXN0XCIgfSk7XG5cbiAgICBsZXQgYWRkQnRuOiBIVE1MQnV0dG9uRWxlbWVudDtcbiAgICBsZXQgZXJyb3JUZXh0OiBIVE1MU3BhbkVsZW1lbnQ7XG5cbiAgICBsZXQgaW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQ7XG4gICAgbGV0IGVycm9yTnVtOiBudW1iZXIgPSAwO1xuXG4gICAgY29uc3QgY2hlY2tFcnJvciA9ICgpID0+IHtcbiAgICAgIC8vIE51bWJlciBvZiBlcnJvcnMgY2F1Z2h0XG4gICAgICBlcnJvck51bSA9IDA7XG4gICAgICBcbiAgICAgIC8vIFNob3cgZXJyb3IgYmFzZWQgb24gdGhlIHByZWNlZGVuY2UgKGxvd2VzdCAtPiBoaWdoZXN0KSAtIHdoaWNoIFJFQUxMWSBzdWNrcyBmcm9tIFVYIHN0YW5kcG9pbnQgc28gVE9ETzogRG8gaXQgcHJvcGVybHlcbiAgICAgIC8vIFRPRE86IG1ha2UgYXMgYSBzZXBhcmF0ZSBib29sZWFuIGZsYWcgZnVuY3Rpb24gZm9yIGNvaGVzaXZlbmVzc1xuXG4gICAgICBjb25zdCBpbnB1dHMgPSBsaXN0Q29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2lucHV0Jyk7XG4gICAgICBpbnB1dHMuZm9yRWFjaCgoaW5wdXQsIGkpID0+IHtcblxuICAgICAgICBjb25zdCBidWxsZXQgPSB2aXN1YWwyc3BhY2UoaW5wdXQudmFsdWUpO1xuXG4gICAgICAgIC8qIENoZWNrIGlmIGJ1bGxldCBpcyBlbXB0eSAqL1xuICAgICAgICBpZiAoYnVsbGV0LnRyaW0oKS5sZW5ndGggPT09IDApIHsgLy8gaWYgdHJpbW1lZCBidWxsZXQgaXMgZW1wdHlcblxuICAgICAgICAgIGlmIChidWxsZXQubGVuZ3RoICE9PSAwKSB7IC8vIGJ1dCB1bnRyaW1tZWQgaXNudFxuICAgICAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gXCJDYW5ub3QgaGF2ZSB3aGl0ZXNwYWNlcyBhcyBidWxsZXRzXCI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IgPSBcInZhcigtLXRleHQtZXJyb3IpXCI7XG4gICAgICAgICAgZXJyb3JOdW0rKztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qIFRPRE86IENoZWNrIGlmIHJlZHVuZGFudCAqL1xuICAgICAgICAvLyBpZiAoWy4uLmlucHV0cy52YWx1ZXMoKV0uc29tZShpbnB1dCA9PiBpbnB1dC52YWx1ZSA9PT0gYnVsbGV0KSkgeyAvLyBDb21wYXJlIG90aGVyIGlucHV0cycgdmFsdWVzIHdpdGggY3VycmVudFxuICAgICAgICAvLyAgIGVycm9yVGV4dC50ZXh0Q29udGVudCA9IGAnJHtidWxsZXR9IGlzIGFscmVhZHkgc3BlY2lmaWVkLmA7XG4gICAgICAgICAgXG4gICAgICAgIC8vICAgaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IgPSBcInZhcigtLXRleHQtZXJyb3IpXCI7XG4gICAgICAgIC8vICAgZXJyb3JOdW0rKztcbiAgICAgICAgLy8gfVxuXG4gICAgICAgIC8qIENoZWNrIGlmIGJ1bGxldCB1c2VzIG5hdGl2ZSBzeW50YXggKi9cbiAgICAgICAgLy8gaWYgYnVsbGV0IGlzIG5hdGl2ZSBhbmQgY29udGFpbnMgd2hpdGVzcGFjZXMgYWZ0ZXIgaXRcbiAgICAgICAgaWYgKE5BVElWRV9CVUxMRVRTLmNvbnRhaW5zKGJ1bGxldC50cmltKCkpKSB7IC8vIHRyaW1tZWQgYnVsbGV0IGlzIG5hdGl2ZVxuICAgICAgICAgIGlmIChidWxsZXQubGVuZ3RoICE9PSAxKSB7IC8vIGFuZCBiZWluZyB1bnRyaW1tZWQgaXQgaXMgbm90IGEgc2luZ2xldG9uXG4gICAgICAgICAgICBlcnJvclRleHQudGV4dENvbnRlbnQgPSBgQ2Fubm90IHVzZSBPYnNpZGlhbidzIG5hdGl2ZSBidWxsZXRzJyBzeW50YXggJyR7c3BhY2UydmlzdWFsKGJ1bGxldCl9J2A7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCJ2YXIoLS10ZXh0LWVycm9yKVwiO1xuICAgICAgICAgICAgZXJyb3JOdW0rKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pOyAgICAgIFxuXG4gICAgICBpZiAoZXJyb3JOdW0gIT09IDApIHtcbiAgICAgICAgZXJyb3JUZXh0LnN0eWxlLmRpc3BsYXkgPSBcImlubGluZVwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbmRlciB1cGRhdGVkIHZpZXdcbiAgICBjb25zdCByZW5kZXIgPSAoKSA9PiB7XG4gICAgICBsaXN0Q29udGFpbmVyLmVtcHR5KCk7IC8vIHJlc2V0IHZpZXcgKGxpc3RDb250YWluZXIuaW5uZXJIVE1MID0gJycpXG5cbiAgICAgIC8vIGZvciBlYWNoIGNhY2hlZCBidWxsZXRcbiAgICAgIGNhY2hlZEJ1bGxldHMuZm9yRWFjaCgoYnVsbGV0LCBpKSA9PiB7XG5cbiAgICAgICAgY29uc3Qgcm93ID0gbGlzdENvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwiY2ItbGlzdC1yb3dcIiB9KTtcblxuICAgICAgICAvLyB0ZW1wXG4gICAgICAgIGlmIChmYWxzZSkge1xuICAgICAgICAvLyBjb25zdCByZW9yZGVySGFuZGxlID0gcm93LmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgIC8vICAgY2xzOiBcImRyYWctaGFuZGxlXCIsXG4gICAgICAgIC8vICAgYXR0cjogeyBkcmFnZ2FibGU6IFwidHJ1ZVwiIH1cbiAgICAgICAgLy8gfSk7XG4gICAgICAgIC8vIHNldEljb24ocmVvcmRlckhhbmRsZSwgXCJncmlwLXZlcnRpY2FsXCIpO1xuXG4gICAgICAgIC8vIHJlb3JkZXJIYW5kbGUuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdzdGFydFwiLCAoZSkgPT4ge1xuICAgICAgICAvLyAgIGUuZGF0YVRyYW5zZmVyPy5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBTdHJpbmcoaSkpO1xuICAgICAgICAvLyAgIGUuZGF0YVRyYW5zZmVyIS5lZmZlY3RBbGxvd2VkID0gXCJtb3ZlXCI7XG4gICAgICAgIC8vICAgcm93LmNsYXNzTGlzdC5hZGQoXCJpcy1kcmFnZ2luZ1wiKTtcbiAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgLy8gcmVvcmRlckhhbmRsZS5hZGRFdmVudExpc3RlbmVyKFwiZHJhZ2VuZFwiLCAoKSA9PiB7XG4gICAgICAgIC8vICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJpcy1kcmFnZ2luZ1wiKTtcbiAgICAgICAgLy8gfSk7XG5cbiAgICAgICAgLy8gcm93LmFkZEV2ZW50TGlzdGVuZXIoXCJkcmFnb3ZlclwiLCAoZSkgPT4ge1xuICAgICAgICAvLyAgIGUucHJldmVudERlZmF1bHQoKTsgLy8gd2l0aG91dCB0aGlzLCBcImRyb3BcIiBuZXZlciBmaXJlcywgYnJvd3NlcnMgYmxvY2sgaXQgYnkgZGVmYXVsdFxuICAgICAgICAvLyAgIHJvdy5jbGFzc0xpc3QuYWRkKFwiZHJhZy1vdmVyXCIpO1xuICAgICAgICAvLyB9KTtcblxuICAgICAgICAvLyByb3cuYWRkRXZlbnRMaXN0ZW5lcihcImRyYWdsZWF2ZVwiLCAoKSA9PiB7XG4gICAgICAgIC8vICAgcm93LmNsYXNzTGlzdC5yZW1vdmUoXCJkcmFnLW92ZXJcIik7XG4gICAgICAgIC8vIH0pO1xuXG4gICAgICAgIC8vIHJvdy5hZGRFdmVudExpc3RlbmVyKFwiZHJvcFwiLCAoZSkgPT4ge1xuICAgICAgICAvLyAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgLy8gICByb3cuY2xhc3NMaXN0LnJlbW92ZShcImRyYWctb3ZlclwiKTtcblxuICAgICAgICAvLyAgIGNvbnN0IGZyb21JbmRleCA9IE51bWJlcihlLmRhdGFUcmFuc2Zlcj8uZ2V0RGF0YShcInRleHQvcGxhaW5cIikpO1xuICAgICAgICAvLyAgIGNvbnN0IHRvSW5kZXggPSBpO1xuICAgICAgICAvLyAgIGlmIChmcm9tSW5kZXggPT09IHRvSW5kZXggfHwgTnVtYmVyLmlzTmFOKGZyb21JbmRleCkpIHJldHVybjtcblxuICAgICAgICAvLyAgIGNvbnN0IG5ld0J1bGxldHMgPSBbLi4uYnVsbGV0c107XG4gICAgICAgIC8vICAgY29uc3QgW21vdmVkXSA9IG5ld0J1bGxldHMuc3BsaWNlKGZyb21JbmRleCwgMSk7XG4gICAgICAgIC8vICAgbmV3QnVsbGV0cy5zcGxpY2UodG9JbmRleCwgMCwgbW92ZWQpO1xuXG4gICAgICAgIC8vICAgLy8gb25SZW9yZGVyKG5ld0J1bGxldHMpO1xuICAgICAgICAvLyAgIHJlbmRlcigpO1xuICAgICAgICAvLyB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaW5wdXQgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwidGV4dFwiLCB2YWx1ZTogc3BhY2UydmlzdWFsKGJ1bGxldCkgfSk7XG4gICAgICAgIGlucHV0LnN0eWxlLmNzc1RleHQgPSBcImZsZXg6MTsgZm9udC1mYW1pbHk6bW9ub3NwYWNlOyBwYWRkaW5nOjRweCA4cHg7XCI7XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FjaGVkQnVsbGV0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBpbnB1dC5wbGFjZWhvbGRlciA9IFwiZS5nLiAnXFxcXD5cdTI0MjMnIG9yICctJ1wiO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICAgICAgICBpZiAoaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IpIHtcbiAgICAgICAgICAgIGlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gJyc7XG5cbiAgICAgICAgICAgIGlmIChlcnJvck51bSA+IDApIGVycm9yTnVtLS07XG5cbiAgICAgICAgICAgIGlmICghZXJyb3JOdW0pIHsgLy8gaWYgZXJyb3JOdW0gPT0gMDtcbiAgICAgICAgICAgICAgZXJyb3JUZXh0LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpbnB1dC52YWx1ZSA9IHNwYWNlMnZpc3VhbChpbnB1dC52YWx1ZSk7XG5cbiAgICAgICAgICAvLyBpbnB1dC52YWx1ZSA9IHNwYWNlMnZpc3VhbCh2aXN1YWwyc3BhY2UoaW5wdXQudmFsdWUpKTsgLy8gYWxzbyBsb29rc1xuXG4gICAgICAgICAgLy8gSSBhbSBub3Qgc3VyZSB3aHkgd2UgbmVlZCB0aGlzXG4gICAgICAgICAgLy8gY29uc3QgcG9zID0gaW5wdXQuc2VsZWN0aW9uU3RhcnQgPz8gaW5wdXQudmFsdWUubGVuZ3RoO1xuICAgICAgICAgIC8vIGlucHV0LnNldFNlbGVjdGlvblJhbmdlKHBvcywgcG9zKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyogaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY2hlY2tFcnJvcigpO1xuICAgICAgICB9KTsgKi9cblxuICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGlucHV0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XG5cbiAgICAgICAgICBjaGVja0Vycm9yKClcblxuICAgICAgICAgIGlmIChlcnJvck51bSAhPT0gMCkgcmV0dXJuO1xuXG4gICAgICAgICAgLy8gU2F2ZSB0byBidWxsZXRzXG4gICAgICAgICAgY2FjaGVkQnVsbGV0c1tpXSA9IHZpc3VhbDJzcGFjZShpbnB1dC52YWx1ZSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ZW50ID0+IHtcbiAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgICAgICAgIGlucHV0LmJsdXIoKTtcblxuICAgICAgICAgICAgLy8gbmVlZCB0byBqdXN0IGZvY3VzIGJ1dCBub3QgdXNlIGVudGVyIG9uIGZvY3VzZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gYWRkQnRuLmZvY3VzKCksIDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYnRuID0gcm93LmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgdGV4dDogXCJSZW1vdmVcIiB9KTtcbiAgICAgICAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgICAgICBjb25zdCBpbnB1dCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MSW5wdXRFbGVtZW50O1xuXG4gICAgICAgICAgaWYgKGlucHV0LnN0eWxlLmJvcmRlckNvbG9yKSB7XG4gICAgICAgICAgICBlcnJvck51bS0tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlcnJvck51bSA9PT0gMCkgeyAvLyBpZiBlcnJvck51bSA9PSAwO1xuICAgICAgICAgICAgZXJyb3JUZXh0LnRleHRDb250ZW50ID0gXCJGaWxsIGluIGVtcHR5IGZpZWxkcyBmaXJzdFwiOyAvLyBUT0RPOiBjYW4gZHJhc3RpY2FsbHkgbW9kaWZ5IGNvbnRlbnQgc3dpdGNoIGxvZ2ljXG4gICAgICAgICAgICBlcnJvclRleHQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNhY2hlZEJ1bGxldHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHJlbmRlcigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZW5kZXIoKTtcblxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKS5hZGRCdXR0b24oYnRuID0+IHtcbiAgICAgICAgYWRkQnRuID0gYnRuLnNldEJ1dHRvblRleHQoXCIrIEFkZCBwcmVmaXhcIikuc2V0Q3RhKCkuYnV0dG9uRWw7XG5cbiAgICAgICAgZXJyb3JUZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgIGVycm9yVGV4dC50ZXh0Q29udGVudCA9IFwiRmlsbCBpbiBlbXB0eSBmaWVsZHMgZmlyc3RcIjtcbiAgICAgICAgZXJyb3JUZXh0LnN0eWxlLmNzc1RleHQgPSBcImNvbG9yOnZhcigtLXRleHQtZXJyb3IpOyBmb250LXNpemU6dmFyKC0tZm9udC1zbWFsbGVyKTsgbWFyZ2luLXJpZ2h0OjhweDsgZGlzcGxheTogbm9uZVwiO1xuICAgICAgICBhZGRCdG4uYmVmb3JlKGVycm9yVGV4dCk7XG5cbiAgICAgICAgYnRuLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yTnVtKTtcblxuICAgICAgICAgIGNoZWNrRXJyb3IoKTtcblxuICAgICAgICAgIGlmIChlcnJvck51bSAhPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNhY2hlZEJ1bGxldHMucHVzaCgnJyk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgcmVuZGVyKCk7XG5cbiAgICAgICAgICBpbnB1dC5mb2N1cygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICApO1xuICB9XG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBc0Y7QUFDdEYsa0JBQXVCO0FBQ3ZCLG1CQUFxQjtBQU1yQixJQUFNLG1CQUE2QjtBQUFBLEVBQ2pDLFNBQVMsQ0FBQyxRQUFRLEdBQUc7QUFDdkI7QUFFQSxJQUFNLGlCQUFpQixDQUFDLEtBQUssS0FBSyxHQUFHO0FBR3JDLElBQXFCLHNCQUFyQixjQUFpRCx1QkFBTztBQUFBLEVBR3RELE1BQU0sZUFBZTtBQWxCdkI7QUFtQkksU0FBSyxXQUFXLE9BQU8sT0FBTyxDQUFDLElBQXNCLFdBQU0sS0FBSyxTQUFTLE1BQXBCLFlB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VTtBQUFBLFlBQzVCO0FBQUEsVUFDRjtBQUVBLFVBQUFBLE9BQU0sUUFBUSxhQUFhQSxPQUFNLEtBQUs7QUFBQSxRQU94QyxDQUFDO0FBTUQsY0FBTSxpQkFBaUIsVUFBVSxPQUFPLFVBQVU7QUFDaEQsZ0JBQU1BLFNBQVEsTUFBTTtBQUVwQixxQkFBVztBQUVYLGNBQUksYUFBYSxFQUFHO0FBR3BCLHdCQUFjLENBQUMsSUFBSSxhQUFhQSxPQUFNLEtBQUs7QUFDM0MsZ0JBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxRQUNqQyxDQUFDO0FBRUQsY0FBTSxpQkFBaUIsV0FBVyxXQUFTO0FBQ3pDLGNBQUksTUFBTSxRQUFRLFNBQVM7QUFDekIsa0JBQU0sS0FBSztBQUdYLHVCQUFXLE1BQU0sT0FBTyxNQUFNLEdBQUcsQ0FBQztBQUFBLFVBQ3BDO0FBQUEsUUFDRixDQUFDO0FBRUQsY0FBTSxNQUFNLElBQUksU0FBUyxVQUFVLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDckQsWUFBSSxpQkFBaUIsU0FBUyxPQUFPLFVBQVU7QUFDN0MsZ0JBQU1BLFNBQVEsTUFBTTtBQUVwQixjQUFJQSxPQUFNLE1BQU0sYUFBYTtBQUMzQjtBQUFBLFVBQ0Y7QUFFQSxjQUFJLGFBQWEsR0FBRztBQUNsQixzQkFBVSxjQUFjO0FBQ3hCLHNCQUFVLE1BQU0sVUFBVTtBQUFBLFVBQzVCO0FBRUEsd0JBQWMsT0FBTyxHQUFHLENBQUM7QUFDekIsZ0JBQU0sS0FBSyxPQUFPLGFBQWE7QUFDL0IsaUJBQU87QUFBQSxRQUNULENBQUM7QUFBQSxNQUNILENBQUM7QUFBQSxJQUNIO0FBRUEsV0FBTztBQUVQLFFBQUksd0JBQVEsV0FBVyxFQUFFO0FBQUEsTUFBVSxTQUFPO0FBQ3RDLGlCQUFTLElBQUksY0FBYyxjQUFjLEVBQUUsT0FBTyxFQUFFO0FBRXBELG9CQUFZLFNBQVMsY0FBYyxNQUFNO0FBQ3pDLGtCQUFVLGNBQWM7QUFDeEIsa0JBQVUsTUFBTSxVQUFVO0FBQzFCLGVBQU8sT0FBTyxTQUFTO0FBRXZCLFlBQUksUUFBUSxZQUFZO0FBQ3RCLGtCQUFRLElBQUksUUFBUTtBQUVwQixxQkFBVztBQUVYLGNBQUksYUFBYSxHQUFHO0FBQ2xCO0FBQUEsVUFDRjtBQUVBLHdCQUFjLEtBQUssRUFBRTtBQUNyQixnQkFBTSxLQUFLLE9BQU8sYUFBYTtBQUMvQixpQkFBTztBQUVQLGdCQUFNLE1BQU07QUFBQSxRQUNkLENBQUM7QUFBQSxNQUNIO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW5wdXQiXQp9Cg==
