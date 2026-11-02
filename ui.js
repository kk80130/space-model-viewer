// 图标路径采用 Lucide，保持工具栏与对象面板的操作符号一致。
const iconPaths = {
  focus: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="3"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
};
function paintIcon(target, name) {
  target.innerHTML = `<svg class="icon" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}
document.querySelectorAll("[data-icon]").forEach((target) => paintIcon(target, target.dataset.icon));
paintIcon(document.querySelector("#upload-button"), "plus");
paintIcon(document.querySelector(".drop-icon"), "plus");
paintIcon(document.querySelector("#export-button > span"), "download");
paintIcon(document.querySelector("#reset-button > span"), "rotate");
const panelToggle = document.querySelector("#panel-toggle-button");
panelToggle.addEventListener("click", () => {
  const opened = document.querySelector(".right-panel").classList.toggle("is-open");
  panelToggle.setAttribute("aria-expanded", String(opened));
});
const fullscreenButton = document.querySelector("#fullscreen-button");
fullscreenButton.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector("#canvas-wrap").requestFullscreen();
  } catch {
    fullscreenButton.title = "当前浏览器无法全屏";
  }
});
document.addEventListener("fullscreenchange", () => {
  fullscreenButton.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement)));
});
document.querySelector("#presentation-button").addEventListener("click", (event) => {
  const enabled = document.querySelector(".app-shell").classList.toggle("is-presenting");
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
});
