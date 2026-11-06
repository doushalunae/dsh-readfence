window.__ModuleLoader__.load({
  id: "dsh-read-guard",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    // Optional: only used to render dialogs into document.body. A host without
    // react-dom still gets the inline fallback instead of a broken layer.
    let ReactDOM = null;
    try {
      ReactDOM = require("react-dom");
    } catch {
      ReactDOM = null;
    }
    const h = React.createElement;

    const NS = "read-guard";
    // Keep in sync with package.json "version".
    const VERSION = "0.1.0";

    const DEFAULTS = {
      writeBg: "#FFDAD9",
      writeAccent: "#A96364",
      readBg: "#B3D8FF",
      readAccent: "#426296",
      btnAllowOnce: "允许一次",
      btnAllowTask: "本任务都允许",
      btnDenyTask: "本任务都拒绝",
      btnRejectOnce: "拒绝一次",
    };

    const zh = {
      "section.nav": "读取权限",
      "section.colors": "权限配色",
      "section.allow": "可读目录",
      "section.batchAdd": "批量添加",
      "section.batchDelete": "批量删除",
      "section.empty": "还没有目录。",
      "section.defaultMode": "默认读模式",
      "section.labels": "审批按钮文字",
      "section.labelsHint": "按钮上显示的文字；留空恢复内置文案。",
      "section.unavailable": "读取权限设置当前不可用（Host 未提供可写表单）。",
      "section.saved": "已保存",
      "section.failed": "保存失败",
      "tab.folders": "可读目录",
      "tab.behavior": "读模式与审批",
      "tab.colors": "权限配色",
      "about.lead": "给 DSH 补上读侧权限：可读目录、会话级读模式、读取审批，以及读写合并控件。",
      "page.folders.desc": "维护免审批的读取根目录；范围外的读取会进入审批面板。",
      "page.behavior.desc": "设置新会话的默认读模式，以及审批面板上四个按钮的文字。",
      "page.colors.desc": "调整输入框下方权限胶囊的写、读两段配色。",
      "block.folders.title": "目录清单",
      "block.folders.desc": "共 {n} 个目录；支持 ~、环境变量与 * / ** 通配符。",
      "block.defaultMode.title": "默认读模式",
      "block.defaultMode.desc": "新会话的初始读模式；已有会话可在输入框下方的胶囊或 /read 里切换。",
      "block.labels.title": "审批按钮文字",
      "block.labels.desc": "自定义四个按钮显示的文字；留空恢复内置文案。",
      "block.colors.title": "胶囊配色",
      "del.selectAll": "全选",
      "del.clearAll": "取消全选",
      "folders.count": "共 {n} 项",
      "row.delete": "删除",
      "row.cancel": "取消",
      "row.confirm": "删除这一条？",
      "row.editHint": "点击路径可编辑",
      "row.addPlaceholder": "输入目录后回车添加（支持 ~、%VAR%、* / **）",
      "add.title": "批量添加可读目录",
      "add.hint": "一行一个目录，按换行拆分；支持 ~、环境变量（%NAME% / $NAME）与通配符（* / **）；空行与重复项会被忽略。",
      "add.placeholder": "~/.dsh\n%USERPROFILE%\\.ssh\nD:\\Work\\*",
      "add.keys": "Ctrl+Enter 提交并关闭 · Esc 关闭（内容保留）",
      "add.submit": "提交",
      "add.close": "关闭",
      "del.title": "批量删除可读目录",
      "del.filter": "筛选目录",
      "del.empty": "没有匹配的目录。",
      "del.selected": "已选 {n} 项",
      "del.confirm": "批量删除",
      "del.cancel": "取消",
      "del.keys": "Esc 关闭",
      "colors.title": "会话胶囊配色",
      "colors.hint": "写、读两段各自有底色与重点色，修改即时生效。",
      "colors.write": "写权限",
      "colors.read": "读权限",
      "colors.bg": "底色",
      "colors.accent": "重点色",
      "colors.preview": "预览",
      "pill.aria": "读写权限",
      "pill.read": "读",
      "pill.write": "写",
      "dialog.title": "权限设置",
      "dialog.write": "写入权限",
      "dialog.read": "读取权限",
      "dialog.close": "关闭",
      "dialog.confirm": "确定",
      "dialog.cancel": "取消",
      "wheel.hint": "滚轮或 ↑ ↓ 选择 · Ctrl+Enter 确定 · Esc 取消",
      "approval.title": "读取请求",
      "approval.taskHint": "本任务内对同一目录生效，下一条消息后重置。",
      "approval.allowOnce": "允许一次",
      "approval.allowTask": "本任务都允许",
      "approval.denyTask": "本任务都拒绝",
      "approval.rejectOnce": "拒绝一次",
      "hint.allowOnce": "只放行这一次读取，下次仍会询问。",
      "hint.allowTask": "本回合内对同一目录的读取都放行，下一条消息后失效。",
      "hint.denyTask": "本回合内对同一目录的读取都拒绝。",
      "hint.rejectOnce": "只拒绝这一次读取，下次仍会询问。",
      "write.read-only": "仅可查看",
      "write.workspace-write": "工作区内修改",
      "write.danger-full-access": "完全权限",
      "read.list": "可读列表",
      "read.workspace": "工作区内读取",
      "read.full": "完全权限",
    };

    const en = {
      "section.nav": "Read access",
      "section.colors": "Permission colors",
      "section.allow": "Readable folders",
      "section.batchAdd": "Bulk add",
      "section.batchDelete": "Bulk delete",
      "section.empty": "No folders yet.",
      "section.defaultMode": "Default read mode",
      "section.labels": "Approval button labels",
      "section.labelsHint": "Text shown on the buttons; leave empty to restore the built-in label.",
      "section.unavailable": "Read access settings are unavailable (the host exposes no writable form).",
      "section.saved": "Saved",
      "section.failed": "Save failed",
      "tab.folders": "Folders",
      "tab.behavior": "Mode & approval",
      "tab.colors": "Colors",
      "about.lead": "Adds the missing read side to DSH: readable folders, per-session read mode, read approvals, and a merged read/write control.",
      "page.folders.desc": "Maintain the folders that need no approval; reads outside them go through the approval panel.",
      "page.behavior.desc": "Set the default read mode for new sessions and the four approval button labels.",
      "page.colors.desc": "Tune the write and read segments of the composer permission pill.",
      "block.folders.title": "Folder list",
      "block.folders.desc": "{n} folders; accepts ~, environment variables and * / ** wildcards.",
      "block.defaultMode.title": "Default read mode",
      "block.defaultMode.desc": "Initial mode for new sessions; existing sessions switch from the composer pill or /read.",
      "block.labels.title": "Approval button labels",
      "block.labels.desc": "Customize the four button labels; an empty field restores the built-in text.",
      "block.colors.title": "Pill colors",
      "del.selectAll": "Select all",
      "del.clearAll": "Clear selection",
      "folders.count": "{n} folders",
      "row.delete": "Delete",
      "row.cancel": "Cancel",
      "row.confirm": "Delete this folder?",
      "row.editHint": "Click the path to edit",
      "row.addPlaceholder": "Type a folder and press Enter (~, %VAR%, * / **)",
      "add.title": "Bulk add readable folders",
      "add.hint": "One folder per line; supports ~, environment variables (%NAME% / $NAME) and wildcards (* / **); blank and duplicate lines are ignored.",
      "add.placeholder": "~/.dsh\n%USERPROFILE%\\.ssh\nD:\\Work\\*",
      "add.keys": "Ctrl+Enter submits and closes · Esc closes (draft kept)",
      "add.submit": "Submit",
      "add.close": "Close",
      "del.title": "Bulk delete readable folders",
      "del.filter": "Filter folders",
      "del.empty": "No matching folders.",
      "del.selected": "{n} selected",
      "del.confirm": "Delete selected",
      "del.cancel": "Cancel",
      "del.keys": "Esc closes",
      "colors.title": "Composer pill colors",
      "colors.hint": "Write and read segments each have a background and an accent; changes apply immediately.",
      "colors.write": "Write",
      "colors.read": "Read",
      "colors.bg": "Background",
      "colors.accent": "Accent",
      "colors.preview": "Preview",
      "pill.aria": "Read and write permissions",
      "pill.read": "Read",
      "pill.write": "Write",
      "dialog.title": "Permissions",
      "dialog.write": "Write access",
      "dialog.read": "Read access",
      "dialog.close": "Close",
      "dialog.confirm": "Apply",
      "dialog.cancel": "Cancel",
      "wheel.hint": "Scroll or ↑ ↓ to choose · Ctrl+Enter applies · Esc cancels",
      "approval.title": "Read request",
      "approval.taskHint": "Applies to the same folder for this task; resets with the next message.",
      "approval.allowOnce": "Allow once",
      "approval.allowTask": "Allow for this task",
      "approval.denyTask": "Deny for this task",
      "approval.rejectOnce": "Reject once",
      "hint.allowOnce": "Approves this single read; the next one asks again.",
      "hint.allowTask": "Approves every read of the same folder for this turn; resets with the next message.",
      "hint.denyTask": "Denies every read of the same folder for this turn.",
      "hint.rejectOnce": "Rejects this single read; the next one asks again.",
      "write.read-only": "Read only",
      "write.workspace-write": "Workspace write",
      "write.danger-full-access": "Full access",
      "read.list": "Allowlist",
      "read.workspace": "Workspace only",
      "read.full": "Full access",
    };

    const WRITE_PRESETS = ["read-only", "workspace-write", "danger-full-access"];
    const READ_MODES = ["list", "workspace", "full"];
    const TABS = [
      { id: "folders", label: "tab.folders" },
      { id: "behavior", label: "tab.behavior" },
      { id: "colors", label: "tab.colors" },
    ];
    const APPROVAL_FIELDS = [
      { field: "btnAllowOnce", label: "approval.allowOnce", hint: "hint.allowOnce" },
      { field: "btnAllowTask", label: "approval.allowTask", hint: "hint.allowTask" },
      { field: "btnDenyTask", label: "approval.denyTask", hint: "hint.denyTask" },
      { field: "btnRejectOnce", label: "approval.rejectOnce", hint: "hint.rejectOnce" },
    ];
    const WHEEL_ROW = 40;

    const CSS = `
.rg-pill{display:inline-flex;align-items:stretch;border-radius:999px;overflow:hidden;border:1px solid var(--dsw-alias-border-secondary,#d9dce3);background:var(--dsw-specific-input-major,#fff);cursor:pointer;padding:0;font-size:12px;line-height:18px}
.rg-seg{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;font-weight:500}
.rg-seg + .rg-seg{border-left:1px solid var(--dsw-alias-border-secondary,#d9dce3)}
.rg-seg:hover{filter:brightness(.97)}
.rg-seg b{font-weight:600}
.rg-overlay{position:fixed;inset:0;background:rgba(15,18,25,.42);display:flex;align-items:center;justify-content:center;z-index:1200;padding:16px}
.rg-dialog{position:relative;width:min(760px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--dsw-specific-input-major,#fff);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.28);padding:18px 22px 16px;color:var(--dsw-alias-label-primary,#1f2430);font-size:13px;will-change:transform}
.rg-dialog p{margin:0}
.rg-dialog.rg-dragging{user-select:none}
.rg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 10px;cursor:grab;user-select:none;touch-action:none}
.rg-head:active{cursor:grabbing}
.rg-head h3{margin:0;font-size:16px;font-weight:600}
.rg-close{border:none;background:transparent;cursor:pointer;font-size:18px;line-height:1;color:var(--dsw-alias-label-tertiary,#8a90a0);padding:4px 8px;border-radius:8px}
.rg-close:hover{background:var(--dsw-alias-interactive-bg-hover,#f2f4f7)}
.rg-map{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:4px 0 2px}
.rg-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.rg-col h4{margin:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary,#5b6270)}
.rg-wheel-wrap{position:relative}
.rg-wheel-band{position:absolute;left:0;right:0;top:40px;height:40px;pointer-events:none;border-top:1px solid var(--dsw-alias-border-secondary,#e3e6ec);border-bottom:1px solid var(--dsw-alias-border-secondary,#e3e6ec);border-radius:10px;background:color-mix(in srgb,var(--rg-accent,#426296) 8%,transparent)}
.rg-wheel{position:relative;z-index:1;height:120px;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none;border-radius:10px}
.rg-wheel::-webkit-scrollbar{width:0;height:0}
.rg-wheel:focus-visible{outline:2px solid var(--rg-accent,#426296);outline-offset:2px}
.rg-wheel-pad{height:40px}
.rg-wheel-item{display:flex;align-items:center;justify-content:center;width:100%;height:40px;scroll-snap-align:center;border:0;background:transparent;color:var(--dsw-alias-label-secondary,#5b6270);font-size:13px;font-family:inherit;cursor:pointer;padding:0 10px;opacity:.55;transition:opacity .12s ease,color .12s ease}
.rg-wheel-item:hover{opacity:.85}
.rg-wheel-item.on{color:var(--rg-accent,#426296);font-weight:600;opacity:1}
.rg-card{border:1px solid var(--dsw-alias-state-warn-secondary,#f0c36d);border-radius:14px;background:var(--dsw-specific-input-major,#fff);padding:14px 16px}
.rg-card .rg-title{font-size:15px;font-weight:600;margin:0 0 6px}
.rg-card .rg-reason{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#4a5160);word-break:break-all;margin:0 0 8px}
.rg-hintline{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a90a0);margin:0 0 12px}
.rg-error{font-size:12px;color:var(--dsw-alias-state-error-primary,#c0392b);margin:8px 0 0}
.rg-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.rg-btn{border:1px solid var(--dsw-alias-border-secondary,#d9dce3);background:var(--dsw-specific-input-major,#fff);color:var(--dsw-alias-label-primary,#1f2430);border-radius:8px;padding:6px 14px;font-size:13px;line-height:18px;cursor:pointer}
.rg-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#eef1f5)}
.rg-btn.primary{background:var(--dsw-alias-state-business-primary,#426296);border-color:transparent;color:#fff}
.rg-btn.primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#426296) 88%,#000)}
.rg-btn.danger{color:var(--dsw-alias-state-error-primary,#c0392b);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 40%,transparent)}
.rg-btn.danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 10%,transparent)}
.rg-btn:disabled{opacity:.5;cursor:default}
.rg-sec{display:flex;flex-direction:column;gap:16px;padding:4px 2px 8px;max-width:660px}
.rg-sec p{margin:0;font-size:12px;color:var(--dsw-alias-label-tertiary,#8a90a0)}
.rg-doc{display:flex;flex-direction:column;gap:10px}
.rg-doc h1{font-size:19px;line-height:26px;font-weight:650;margin:0;letter-spacing:.2px}
.rg-doc h2{font-size:15px;line-height:22px;font-weight:600;margin:6px 0 0}
.rg-doc h3{font-size:13px;line-height:20px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary,#1f2430)}
.rg-titleline{display:flex;align-items:center;justify-content:space-between;gap:10px}
.rg-ver{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary,#8a90a0);border:1px solid var(--dsw-alias-border-secondary,#e3e6ec);border-radius:999px;padding:0 8px;white-space:nowrap}
.rg-doc .rg-lead{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#5b6270);margin:0}
.rg-page{display:flex;flex-direction:column;gap:10px}
.rg-block{border:1px solid var(--dsw-alias-border-secondary,#e3e6ec);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#1f2430) 2%,transparent)}
.rg-doc .rg-block > p{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#8a90a0);margin:0}
.rg-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-secondary,#e3e6ec)}
.rg-tab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8a90a0);font-size:13px;padding:8px 12px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.rg-tab:hover{color:var(--dsw-alias-label-primary,#1f2430)}
.rg-tab.on{color:var(--dsw-alias-state-business-primary,#426296);border-bottom-color:var(--dsw-alias-state-business-primary,#426296);font-weight:600}
.rg-label{font-size:13px;font-weight:600;margin:0 0 8px;color:var(--dsw-alias-label-primary,#1f2430)}
.rg-doc .rg-block > .rg-label{font-size:13px;font-weight:600;line-height:20px;margin:2px 0 0;color:var(--dsw-alias-label-primary,#1f2430)}
.rg-list{display:flex;flex-direction:column;gap:8px}
.rg-rows{display:flex;flex-direction:column;gap:8px;max-height:312px;overflow-y:auto;padding-right:4px;scrollbar-width:thin}
.rg-rows::-webkit-scrollbar{width:8px}
.rg-rows::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--dsw-alias-border-secondary,#d9dce3) 75%,transparent);border-radius:8px}
.rg-rows::-webkit-scrollbar-track{background:transparent}
.rg-row{display:flex;align-items:center;gap:8px;height:32px;flex:none;box-sizing:border-box;padding:0 6px 0 10px;border:1px solid var(--dsw-alias-border-secondary,#e8ebf0);border-radius:8px;font-size:12px;font-family:var(--ds-font-family-code,monospace)}
.rg-row > span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rg-row-path{cursor:text}
.rg-row.editing{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,#426296) 55%,transparent)}
.rg-row.rg-addrow{border-style:dashed}
.rg-row-input{flex:1;min-width:0;border:0;background:transparent;color:inherit;font:inherit;padding:0 2px;outline:none}
.rg-row-input::placeholder{color:var(--dsw-alias-label-tertiary,#8a90a0)}
.rg-row.confirming{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 7%,transparent)}
.rg-row.confirming > span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary,#5b6270)}
.rg-row-del{border:0;background:transparent;color:var(--dsw-alias-label-tertiary,#8a90a0);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:6px;flex:none}
.rg-row-del:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#c0392b);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 10%,transparent)}
.rg-mini{border:1px solid var(--dsw-alias-border-secondary,#d9dce3);background:var(--dsw-specific-input-major,#fff);border-radius:6px;font-size:11px;line-height:16px;padding:2px 8px;cursor:pointer;color:inherit;flex:none}
.rg-mini.danger{color:var(--dsw-alias-state-error-primary,#c0392b);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c0392b) 40%,transparent)}
.rg-listfoot{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.rg-fields{display:flex;flex-direction:column;gap:12px}
.rg-field{display:flex;flex-direction:column;gap:4px}
.rg-field-name{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary,#1f2430)}
.rg-field-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a90a0)}
.rg-input,.rg-sec input[type=text],.rg-sec textarea,.rg-sec select{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-secondary,#d9dce3);border-radius:8px;background:transparent;color:inherit;padding:7px 10px;font-size:13px;font-family:inherit}
.rg-sec textarea{min-height:150px;resize:vertical;font-family:var(--ds-font-family-code,monospace);line-height:20px}
.rg-labelgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rg-colorwrap{display:flex;align-items:center;gap:8px}
.rg-colorwrap input[type=color]{width:36px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-secondary,#d9dce3);border-radius:6px;background:transparent;cursor:pointer}
.rg-colorwrap code{font-size:12px;color:var(--dsw-alias-label-secondary,#5b6270)}
.rg-preview{display:inline-flex}
.rg-keys{margin:10px 0 0;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a90a0)}
.rg-del-list{max-height:280px;overflow:auto;border:1px solid var(--dsw-alias-border-secondary,#e1e4ea);border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:2px}
.rg-del-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;font-size:12px;font-family:var(--ds-font-family-code,monospace);word-break:break-all}
.rg-del-item:hover{background:var(--dsw-alias-interactive-bg-hover,#f6f8fa)}
.rg-del-item input{flex:none}
.rg-del-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}
.rg-del-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}
.rg-del-actions .rg-actions{margin:0}
`;

    /* ---------------------------------------------------------------- */
    /* Portal: dialogs must escape ancestor transforms / filters.        */
    /* ---------------------------------------------------------------- */

    let portalRoot = null;

    const portalHost = () => {
      if (portalRoot === null) {
        portalRoot = document.createElement("div");
        portalRoot.setAttribute("data-read-guard-portal", "");
        document.body.appendChild(portalRoot);
      }
      return portalRoot;
    };

    const disposePortal = () => {
      if (portalRoot !== null) {
        portalRoot.remove();
        portalRoot = null;
      }
    };

    const Portal = ({ children }) =>
      (ReactDOM !== null && typeof ReactDOM.createPortal === "function"
        ? ReactDOM.createPortal(children, portalHost())
        : children);

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    /**
     * Drag the dialog by its header. Offsets are clamped so the dialog can never
     * be parked outside the viewport; double-clicking the header resets it.
     */
    const useDraggable = () => {
      const ref = React.useRef(null);
      const drag = React.useRef(null);
      const [offset, setOffset] = React.useState({ x: 0, y: 0 });

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        const dialog = ref.current;
        if (dialog === null) return;
        const rect = dialog.getBoundingClientRect();
        drag.current = {
          id: event.pointerId,
          sx: event.clientX,
          sy: event.clientY,
          ox: offset.x,
          oy: offset.y,
          maxX: Math.max(0, (window.innerWidth - rect.width) / 2 - 8),
          maxY: Math.max(0, (window.innerHeight - rect.height) / 2 - 8),
        };
        dialog.classList.add("rg-dragging");
        event.preventDefault();
      };

      React.useEffect(() => {
        const move = (event) => {
          const state = drag.current;
          if (state === null || event.pointerId !== state.id) return;
          setOffset({
            x: clamp(state.ox + (event.clientX - state.sx), -state.maxX, state.maxX),
            y: clamp(state.oy + (event.clientY - state.sy), -state.maxY, state.maxY),
          });
        };
        const end = () => {
          if (drag.current === null) return;
          drag.current = null;
          if (ref.current !== null) ref.current.classList.remove("rg-dragging");
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        window.addEventListener("pointercancel", end);
        return () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", end);
          window.removeEventListener("pointercancel", end);
        };
      }, []);

      return {
        ref,
        style: { transform: `translate(${offset.x}px, ${offset.y}px)` },
        onPointerDown,
        reset: () => setOffset({ x: 0, y: 0 }),
      };
    };

    function Dialog(props) {
      const drag = useDraggable();
      return h(Portal, null,
        h("div", {
          className: "rg-overlay",
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) props.onClose();
          },
        },
          h("div", {
            className: "rg-dialog",
            ref: drag.ref,
            style: drag.style,
          },
            h("div", {
              className: "rg-head",
              onPointerDown: drag.onPointerDown,
              onDoubleClick: drag.reset,
            },
              h("h3", null, props.title),
              h("button", {
                type: "button",
                className: "rg-close",
                "aria-label": props.t("dialog.close"),
                onPointerDown: (event) => event.stopPropagation(),
                onClick: props.onClose,
              }, "×")),
            props.children)));
    }

    /* ---------------------------------------------------------------- */
    /* Wheel picker                                                      */
    /* ---------------------------------------------------------------- */

    function Wheel({ items, value, onChange, t, accent, label }) {
      const ref = React.useRef(null);
      const programmatic = React.useRef(false);
      const settle = React.useRef(0);
      const first = React.useRef(true);
      const index = Math.max(0, items.findIndex((item) => item.id === value));

      const stopSmooth = () => {
        programmatic.current = true;
        window.clearTimeout(settle.current);
        settle.current = window.setTimeout(() => { programmatic.current = false; }, 500);
      };

      React.useEffect(() => {
        const el = ref.current;
        if (el === null) return;
        const target = index * WHEEL_ROW;
        const instant = first.current;
        first.current = false;
        if (Math.abs(el.scrollTop - target) < 2) return;
        if (instant) {
          el.scrollTop = target;
          return;
        }
        stopSmooth();
        el.scrollTo({ top: target, behavior: "smooth" });
      }, [index]);

      const onScroll = () => {
        const el = ref.current;
        if (el === null || programmatic.current) return;
        const next = clamp(Math.round(el.scrollTop / WHEEL_ROW), 0, items.length - 1);
        const item = items[next];
        if (item !== undefined && item.id !== value) onChange(item.id);
      };

      const onKeyDown = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const next = items[clamp(index + step, 0, items.length - 1)];
        if (next !== undefined) onChange(next.id);
      };

      return h("div", { className: "rg-wheel-wrap", style: { "--rg-accent": accent } },
        h("div", { className: "rg-wheel-band", "aria-hidden": "true" }),
        h("div", {
          className: "rg-wheel",
          ref,
          tabIndex: 0,
          "aria-label": label,
          onScroll,
          onKeyDown,
        },
          h("div", { className: "rg-wheel-pad" }),
          items.map((item) => h("button", {
            key: item.id,
            type: "button",
            className: "rg-wheel-item" + (item.id === value ? " on" : ""),
            onClick: () => onChange(item.id),
          }, t(item.label))),
          h("div", { className: "rg-wheel-pad" })));
    }

    /* ---------------------------------------------------------------- */
    /* Generic helpers                                                   */
    /* ---------------------------------------------------------------- */

    const runCommand = async (ctx, sessionId, line) => {
      const live = ctx.sessions.binding(sessionId)?.session;
      if (live === undefined) throw new Error("session is not materialized yet");
      const result = await live.command(line);
      if (!result.ok) throw new Error(`${result.error?.code}: ${result.error?.message}`);
      if (!result.value?.matched) throw new Error("this host does not offer that command");
      return result.value;
    };

    const isReadApproval = (pending) =>
      pending?.kind === "approval"
      && typeof pending.reason === "string"
      && pending.reason.startsWith("read-guard:");

    const asString = (value, fallback) =>
      (typeof value === "string" && value.trim().length > 0 ? value : fallback);

    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "read-guard: dictionaries");

      const style = document.createElement("style");
      style.textContent = CSS;
      style.setAttribute("data-read-guard", "");
      document.head.appendChild(style);
      ctx.effect(() => () => style.remove(), "read-guard: styles");
      ctx.effect(() => disposePortal, "read-guard: portal");
      if (ReactDOM === null) {
        console.warn("read-guard: react-dom is unavailable — dialogs render inline and may be clipped by the composer");
      }

      const form = ctx.configForms.get("read-guard");

      function useFormSnapshot() {
        const [snap, setSnap] = React.useState(() => form.getSnapshot());
        React.useEffect(() => {
          setSnap(form.getSnapshot());
          return form.subscribe(() => setSnap(form.getSnapshot()));
        }, []);
        return snap;
      }

      const configOf = (snap) => (snap?.status === "ready" && snap.value ? snap.value : {});

      /* ---------------------------------------------------------------- */
      /* Composer pill: split write / read segments                        */
      /* ---------------------------------------------------------------- */

      function PermissionPill(props) {
        const snap = useFormSnapshot();
        const cfg = configOf(snap);
        const write = props.useProjection("permissions");
        const read = props.useProjection("readPolicy");
        const [open, setOpen] = React.useState(false);
        const writeValue = write?.currentValue ?? null;
        const readValue = read?.currentValue ?? "list";
        const writeLabel = writeValue === null ? "-" : props.t("write." + writeValue);
        const readLabel = props.t("read." + readValue);
        const writeBg = asString(cfg.writeBg, DEFAULTS.writeBg);
        const writeAccent = asString(cfg.writeAccent, DEFAULTS.writeAccent);
        const readBg = asString(cfg.readBg, DEFAULTS.readBg);
        const readAccent = asString(cfg.readAccent, DEFAULTS.readAccent);

        const applyChoice = async ({ write: nextWrite, read: nextRead }) => {
          const lines = [];
          if (writeValue !== null && nextWrite !== writeValue) lines.push(`/permission ${nextWrite}`);
          if (nextRead !== readValue) lines.push(`/read ${nextRead}`);
          for (const line of lines) await runCommand(ctx, props.sessionId, line);
          setOpen(false);
        };

        const pill = h("button", {
          type: "button",
          className: "rg-pill",
          title: props.t("pill.aria"),
          onClick: () => setOpen(true),
        },
          h("span", { className: "rg-seg", style: { background: writeBg, color: writeAccent } },
            props.t("pill.write"), " ", h("b", null, writeLabel)),
          h("span", { className: "rg-seg", style: { background: readBg, color: readAccent } },
            props.t("pill.read"), " ", h("b", null, readLabel)));

        if (!open) return pill;

        return h(React.Fragment, null, pill, h(PermissionDialog, {
          t: props.t,
          write: writeValue,
          read: readValue,
          writeAccent,
          readAccent,
          onCancel: () => setOpen(false),
          onConfirm: applyChoice,
        }));
      }

      function PermissionDialog({ t, write, read, writeAccent, readAccent, onCancel, onConfirm }) {
        const [pendingWrite, setPendingWrite] = React.useState(write ?? "workspace-write");
        const [pendingRead, setPendingRead] = React.useState(read ?? "list");
        const [busy, setBusy] = React.useState(false);
        const [error, setError] = React.useState("");

        const confirm = async () => {
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await onConfirm({ write: pendingWrite, read: pendingRead });
          } catch (err) {
            setError(String(err?.message ?? err));
            setBusy(false);
          }
        };

        React.useEffect(() => {
          const onKey = (event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
              return;
            }
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void confirm();
            }
          };
          window.addEventListener("keydown", onKey, true);
          return () => window.removeEventListener("keydown", onKey, true);
        }, [pendingWrite, pendingRead, busy]);

        const writeItems = WRITE_PRESETS.map((id) => ({ id, label: "write." + id }));
        const readItems = READ_MODES.map((id) => ({ id, label: "read." + id }));

        return h(Dialog, { t, title: t("dialog.title"), onClose: onCancel },
          h("div", { className: "rg-map" },
            h("div", { className: "rg-col" },
              h("h4", null, t("dialog.write")),
              h(Wheel, {
                items: writeItems,
                value: pendingWrite,
                onChange: setPendingWrite,
                t,
                accent: writeAccent,
                label: t("dialog.write"),
              })),
            h("div", { className: "rg-col" },
              h("h4", null, t("dialog.read")),
              h(Wheel, {
                items: readItems,
                value: pendingRead,
                onChange: setPendingRead,
                t,
                accent: readAccent,
                label: t("dialog.read"),
              }))),
          error === "" ? null : h("p", { className: "rg-error" }, error),
          h("p", { className: "rg-keys" }, t("wheel.hint")),
          h("div", { className: "rg-actions" },
            h("button", { type: "button", className: "rg-btn", onClick: onCancel, disabled: busy }, t("dialog.cancel")),
            h("button", { type: "button", className: "rg-btn primary", onClick: () => void confirm(), disabled: busy }, t("dialog.confirm"))));
      }

      ctx.slots.inject("conversation.input.permission", () => ctx.slots.register({
        name: "conversation.input.permission",
        locale: NS,
      }, PermissionPill));

      /* ---------------------------------------------------------------- */
      /* Approval panel                                                    */
      /* ---------------------------------------------------------------- */

      function ReadApproval(props) {
        const snap = useFormSnapshot();
        const cfg = configOf(snap);
        const pending = props.matched;
        const [answered, setAnswered] = React.useState(false);
        const label = (key, fallbackKey) => asString(cfg[key], props.t(fallbackKey));

        const answer = async (choice) => {
          if (answered || !pending.answerable) return;
          setAnswered(true);
          try {
            if ((choice === "task-allow" || choice === "task-deny") && pending.callId !== undefined) {
              const decision = choice === "task-allow" ? "allow" : "deny";
              try {
                await runCommand(ctx, pending.sessionId, `/read-grant ${decision} ${pending.callId}`);
              } catch (error) {
                console.error("read-guard: grant failed", error);
              }
            }
            await pending.answer(choice === "allow" || choice === "task-allow" ? "allowed-once" : "rejected");
          } catch {
            setAnswered(false);
          }
        };
        const onKeyDown = (event) => {
          if (event.defaultPrevented) return;
          if (!event.currentTarget.contains(document.activeElement)) return;
          const target = event.target;
          if (target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
          if (event.key !== "Enter" && event.key !== "Escape") return;
          if (event.key === "Enter" && target && target.closest && target.closest('button, a[href], [role="button"]')) return;
          if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.repeat) return;
          event.preventDefault();
          event.stopPropagation();
          void answer(event.key === "Enter" ? "allow" : "refuse");
        };
        const reason = pending.displayReason ?? pending.reason ?? pending.toolName;
        return h("div", { className: "rg-card", onKeyDown, tabIndex: 0, "data-approval-key": pending.key, "aria-busy": answered },
          h("p", { className: "rg-title" }, props.t("approval.title")),
          h("p", { className: "rg-reason" }, reason),
          h("p", { className: "rg-hintline" }, props.t("approval.taskHint")),
          h("div", { className: "rg-actions" },
            h("button", { type: "button", className: "rg-btn danger", disabled: answered, onClick: () => answer("task-deny") }, label("btnDenyTask", "approval.denyTask")),
            h("button", { type: "button", className: "rg-btn", disabled: answered, onClick: () => answer("refuse") }, label("btnRejectOnce", "approval.rejectOnce")),
            h("button", { type: "button", className: "rg-btn", disabled: answered, onClick: () => answer("task-allow") }, label("btnAllowTask", "approval.allowTask")),
            h("button", { type: "button", className: "rg-btn primary", disabled: answered, onClick: () => answer("allow") }, label("btnAllowOnce", "approval.allowOnce"))));
      }

      ctx.slots.inject("conversation.composer", () => ctx.slots.register({
        name: "conversation.composer",
        priority: 0,
        select: ({ pendingInteraction }) => (isReadApproval(pendingInteraction) ? pendingInteraction : null),
        locale: NS,
      }, ReadApproval));

      /* ---------------------------------------------------------------- */
      /* Settings: one section, three pages                                */
      /* ---------------------------------------------------------------- */

      function SettingsSection(props) {
        const snap = useFormSnapshot();
        const cfg = configOf(snap);
        const ready = snap.status === "ready" && snap.writable;
        const allow = Array.isArray(cfg.allow) ? cfg.allow : [];
        const [page, setPage] = React.useState("folders");
        const [status, setStatus] = React.useState("");
        const [addOpen, setAddOpen] = React.useState(false);
        const [deleteOpen, setDeleteOpen] = React.useState(false);
        const [draft, setDraft] = React.useState("");
        const [filter, setFilter] = React.useState("");
        const [selected, setSelected] = React.useState(() => new Set());
        const [confirmPath, setConfirmPath] = React.useState(null);
        const [editing, setEditing] = React.useState(null);
        const [addDraft, setAddDraft] = React.useState("");
        const committing = React.useRef(false);

        const write = async (ops) => {
          if (!ready) return false;
          try {
            const ok = await form.mutate(ops, snap.revision);
            setStatus(ok ? props.t("section.saved") : props.t("section.failed"));
            return ok;
          } catch {
            setStatus(props.t("section.failed"));
            return false;
          }
        };

        const submitAdd = async () => {
          const lines = draft.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
          if (lines.length === 0) return;
          const existing = new Set(allow.map((path) => path.toLowerCase()));
          const fresh = [];
          for (const line of lines) {
            const key = line.toLowerCase();
            if (existing.has(key)) continue;
            existing.add(key);
            fresh.push(line);
          }
          if (fresh.length === 0) {
            setAddOpen(false);
            return;
          }
          const ops = fresh.map((value, index) => ({
            op: "set",
            path: ["allow", String(allow.length + index)],
            value,
          }));
          const ok = await write(ops);
          if (ok) {
            setDraft("");
            setAddOpen(false);
          }
        };

        const removePath = async (path) => {
          const index = allow.indexOf(path);
          if (index < 0) return;
          const ok = await write([{ op: "unset", path: ["allow", String(index)] }]);
          if (ok) setConfirmPath(null);
        };

        /** Top blank row: appends whatever the user typed (deduplicated). */
        const addPath = async () => {
          const value = addDraft.trim();
          if (value.length === 0) return;
          if (allow.some((path) => path.toLowerCase() === value.toLowerCase())) {
            setAddDraft("");
            return;
          }
          const ok = await write([{ op: "set", path: ["allow", String(allow.length)], value }]);
          if (ok) setAddDraft("");
        };

        const startEdit = (index) => {
          committing.current = false;
          setConfirmPath(null);
          setEditing({ index, original: allow[index], draft: allow[index] });
        };

        const cancelEdit = () => {
          committing.current = true;
          setEditing(null);
        };

        /** Commit once: Enter and the resulting blur must not both write. */
        const commitEdit = () => {
          const current = editing;
          if (current === null || committing.current) return;
          committing.current = true;
          setEditing(null);
          const value = current.draft.trim();
          if (value.length === 0 || value === current.original) return;
          const duplicate = allow.some((path, index) => index !== current.index && path.toLowerCase() === value.toLowerCase());
          if (duplicate) return;
          void write([{ op: "set", path: ["allow", String(current.index)], value }]);
        };

        const submitDelete = async () => {
          const indexes = [];
          allow.forEach((path, index) => {
            if (selected.has(path)) indexes.push(index);
          });
          if (indexes.length === 0) return;
          indexes.sort((a, b) => b - a);
          const ops = indexes.map((index) => ({ op: "unset", path: ["allow", String(index)] }));
          const ok = await write(ops);
          if (ok) {
            setSelected(new Set());
            setDeleteOpen(false);
          }
        };

        if (snap.status !== "ready") {
          return h("div", { className: "rg-sec" },
            h("p", null, snap.status === "loading" ? "…" : props.t("section.unavailable")));
        }

        const filtered = allow.filter((path) => filter.trim() === "" || path.toLowerCase().includes(filter.trim().toLowerCase()));
        const allFilteredSelected = filtered.length > 0 && filtered.every((path) => selected.has(path));

        const toggle = (path) => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
          });
        };

        // Selects (or clears) exactly what the current filter shows.
        const toggleAllFiltered = () => {
          setSelected((prev) => {
            const next = new Set(prev);
            if (allFilteredSelected) for (const path of filtered) next.delete(path);
            else for (const path of filtered) next.add(path);
            return next;
          });
        };

        const closeAdd = () => setAddOpen(false);
        const closeDelete = () => { setDeleteOpen(false); setFilter(""); };

        const row = (path, index) => {
          const isEditing = editing !== null && editing.index === index;
          const confirming = confirmPath === path;
          return h("div", {
            key: path,
            className: "rg-row" + (confirming ? " confirming" : "") + (isEditing ? " editing" : ""),
          },
            isEditing
              ? h(React.Fragment, null,
                h("input", {
                  className: "rg-row-input",
                  value: editing.draft,
                  autoFocus: true,
                  disabled: !ready,
                  onChange: (event) => setEditing({ index, original: editing.original, draft: event.target.value }),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") { event.preventDefault(); commitEdit(); }
                    else if (event.key === "Escape") { event.preventDefault(); cancelEdit(); }
                  },
                  onBlur: () => commitEdit(),
                }),
                h("button", {
                  type: "button",
                  className: "rg-mini",
                  onMouseDown: (event) => event.preventDefault(),
                  onClick: cancelEdit,
                }, props.t("row.cancel")))
              : confirming
                ? h(React.Fragment, null,
                  h("span", null, props.t("row.confirm")),
                  h("button", {
                    type: "button",
                    className: "rg-mini danger",
                    disabled: !ready,
                    onClick: () => void removePath(path),
                  }, props.t("row.delete")),
                  h("button", {
                    type: "button",
                    className: "rg-mini",
                    onClick: () => setConfirmPath(null),
                  }, props.t("row.cancel")))
                : h(React.Fragment, null,
                  h("span", {
                    className: "rg-row-path",
                    title: props.t("row.editHint"),
                    onClick: () => startEdit(index),
                  }, path),
                  h("button", {
                    type: "button",
                    className: "rg-row-del",
                    title: props.t("row.delete"),
                    "aria-label": props.t("row.delete"),
                    disabled: !ready,
                    onClick: () => setConfirmPath(path),
                  }, "×")));
        };

        const addRow = h("div", { className: "rg-row rg-addrow" },
          h("input", {
            className: "rg-row-input",
            value: addDraft,
            placeholder: props.t("row.addPlaceholder"),
            disabled: !ready,
            onChange: (event) => setAddDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") { event.preventDefault(); void addPath(); }
              else if (event.key === "Escape") { event.preventDefault(); setAddDraft(""); }
            },
          }),
          h("button", {
            type: "button",
            className: "rg-mini",
            disabled: !ready || addDraft.trim().length === 0,
            onClick: () => void addPath(),
          }, "+"));

        const foldersPage = h("div", { className: "rg-page" },
          h("h2", null, props.t("tab.folders")),
          h("p", { className: "rg-lead" }, props.t("page.folders.desc")),
          h("div", { className: "rg-block" },
            h("h3", null, props.t("block.folders.title")),
            h("p", null, props.t("block.folders.desc").replace("{n}", String(allow.length))),
            h("div", { className: "rg-list" },
              addRow,
              allow.length === 0 ? null : h("div", { className: "rg-rows" }, allow.map(row))),
            h("div", { className: "rg-listfoot" },
              h("button", { type: "button", className: "rg-btn", disabled: !ready, onClick: () => setAddOpen(true) }, props.t("section.batchAdd")),
              h("button", { type: "button", className: "rg-btn", disabled: !ready, onClick: () => setDeleteOpen(true) }, props.t("section.batchDelete")))),
          status === "" ? null : h("p", null, status));

        const behaviorPage = h("div", { className: "rg-page" },
          h("h2", null, props.t("tab.behavior")),
          h("p", { className: "rg-lead" }, props.t("page.behavior.desc")),
          h("div", { className: "rg-block" },
            h("h3", null, props.t("block.defaultMode.title")),
            h("p", null, props.t("block.defaultMode.desc")),
            h("select", {
              value: cfg.defaultReadMode ?? "list",
              disabled: !ready,
              onChange: (event) => void write([{ op: "set", path: ["defaultReadMode"], value: event.target.value }]),
            }, READ_MODES.map((id) => h("option", { key: id, value: id }, props.t("read." + id))))),
          h("div", { className: "rg-block" },
            h("h3", null, props.t("block.labels.title")),
            h("p", null, props.t("block.labels.desc")),
            h("div", { className: "rg-fields" },
              APPROVAL_FIELDS.map((entry) => h("label", { key: entry.field, className: "rg-field" },
                h("span", { className: "rg-field-name" }, props.t(entry.label)),
                h("span", { className: "rg-field-hint" }, props.t(entry.hint)),
                h("input", {
                  type: "text",
                  className: "rg-input",
                  defaultValue: asString(cfg[entry.field], ""),
                  placeholder: DEFAULTS[entry.field],
                  disabled: !ready,
                  onBlur: (event) => void write([{ op: "set", path: [entry.field], value: event.target.value }]),
                }))))),
          status === "" ? null : h("p", null, status));

        const colorsPage = h("div", { className: "rg-page" },
          h("h2", null, props.t("tab.colors")),
          h("p", { className: "rg-lead" }, props.t("page.colors.desc")),
          h("div", { className: "rg-block" },
            h("h3", null, props.t("block.colors.title")),
            h("p", null, props.t("colors.hint")),
            h("p", { className: "rg-label" }, props.t("colors.write")),
            h("div", { className: "rg-labelgrid" },
              h("label", { className: "rg-colorwrap" },
                h("input", {
                  type: "color",
                  value: asString(cfg.writeBg, DEFAULTS.writeBg),
                  disabled: !ready,
                  onChange: (event) => void write([{ op: "set", path: ["writeBg"], value: event.target.value }]),
                }),
                h("code", null, props.t("colors.bg"))),
              h("label", { className: "rg-colorwrap" },
                h("input", {
                  type: "color",
                  value: asString(cfg.writeAccent, DEFAULTS.writeAccent),
                  disabled: !ready,
                  onChange: (event) => void write([{ op: "set", path: ["writeAccent"], value: event.target.value }]),
                }),
                h("code", null, props.t("colors.accent")))),
            h("p", { className: "rg-label" }, props.t("colors.read")),
            h("div", { className: "rg-labelgrid" },
              h("label", { className: "rg-colorwrap" },
                h("input", {
                  type: "color",
                  value: asString(cfg.readBg, DEFAULTS.readBg),
                  disabled: !ready,
                  onChange: (event) => void write([{ op: "set", path: ["readBg"], value: event.target.value }]),
                }),
                h("code", null, props.t("colors.bg"))),
              h("label", { className: "rg-colorwrap" },
                h("input", {
                  type: "color",
                  value: asString(cfg.readAccent, DEFAULTS.readAccent),
                  disabled: !ready,
                  onChange: (event) => void write([{ op: "set", path: ["readAccent"], value: event.target.value }]),
                }),
                h("code", null, props.t("colors.accent")))),
            h("p", { className: "rg-label" }, props.t("colors.preview")),
            h("span", { className: "rg-preview" },
              h("span", { className: "rg-pill", style: { cursor: "default" } },
                h("span", { className: "rg-seg", style: { background: asString(cfg.writeBg, DEFAULTS.writeBg), color: asString(cfg.writeAccent, DEFAULTS.writeAccent) } },
                  props.t("pill.write"), " ", h("b", null, props.t("write.workspace-write"))),
                h("span", { className: "rg-seg", style: { background: asString(cfg.readBg, DEFAULTS.readBg), color: asString(cfg.readAccent, DEFAULTS.readAccent) } },
                  props.t("pill.read"), " ", h("b", null, props.t("read.list")))))),
          status === "" ? null : h("p", null, status));

        const addDialog = addOpen ? h(Dialog, { t: props.t, title: props.t("add.title"), onClose: closeAdd },
          h("p", { className: "rg-hintline" }, props.t("add.hint")),
          h("textarea", {
            className: "rg-input",
            value: draft,
            placeholder: props.t("add.placeholder"),
            autoFocus: true,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Escape") { event.preventDefault(); closeAdd(); }
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void submitAdd(); }
            },
          }),
          h("p", { className: "rg-keys" }, props.t("add.keys")),
          h("div", { className: "rg-actions", style: { marginTop: "12px" } },
            h("button", { type: "button", className: "rg-btn", onClick: closeAdd }, props.t("add.close")),
            h("button", { type: "button", className: "rg-btn primary", disabled: !ready, onClick: () => void submitAdd() }, props.t("add.submit")))) : null;

        const deleteDialog = deleteOpen ? h(Dialog, { t: props.t, title: props.t("del.title"), onClose: closeDelete },
          h("input", {
            type: "text",
            className: "rg-input",
            placeholder: props.t("del.filter"),
            value: filter,
            autoFocus: true,
            onChange: (event) => setFilter(event.target.value),
            onKeyDown: (event) => { if (event.key === "Escape") { event.preventDefault(); closeDelete(); } },
          }),
          h("div", { className: "rg-del-list", style: { marginTop: "10px" } },
            filtered.length === 0
              ? h("p", { className: "rg-hintline", style: { padding: "8px" } }, props.t("del.empty"))
              : filtered.map((path) => h("label", { key: path, className: "rg-del-item" },
                h("input", { type: "checkbox", checked: selected.has(path), onChange: () => toggle(path) }),
                h("span", null, path)))),
          h("div", { className: "rg-del-meta" },
            h("p", null, props.t("del.selected").replace("{n}", String(selected.size))),
            h("span", { className: "rg-keys" }, props.t("del.keys"))),
          h("div", { className: "rg-del-actions" },
            h("button", {
              type: "button",
              className: "rg-btn",
              disabled: filtered.length === 0,
              onClick: toggleAllFiltered,
            }, allFilteredSelected ? props.t("del.clearAll") : props.t("del.selectAll")),
            h("div", { className: "rg-actions" },
              h("button", { type: "button", className: "rg-btn", onClick: closeDelete }, props.t("del.cancel")),
              h("button", { type: "button", className: "rg-btn danger", disabled: selected.size === 0, onClick: () => void submitDelete() }, props.t("del.confirm"))))) : null;

        return h("div", { className: "rg-sec" },
          h("div", { className: "rg-doc" },
            h("div", { className: "rg-titleline" },
              h("h1", null, "read-guard"),
              h("span", { className: "rg-ver" }, "v" + VERSION)),
            h("p", { className: "rg-lead" }, props.t("about.lead")),
            h("div", { className: "rg-tabs", role: "tablist" },
              TABS.map((tab) => h("button", {
                key: tab.id,
                type: "button",
                role: "tab",
                "aria-selected": page === tab.id,
                className: "rg-tab" + (page === tab.id ? " on" : ""),
                onClick: () => setPage(tab.id),
              }, props.t(tab.label)))),
            page === "folders" ? foldersPage : page === "behavior" ? behaviorPage : colorsPage),
          addDialog,
          deleteDialog);
      }

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "read-guard",
        order: 25,
        label: () => t("section.nav"),
        locale: NS,
      }, SettingsSection));
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale", "sessions", "configForms"];
    return module.exports;
  },
});
