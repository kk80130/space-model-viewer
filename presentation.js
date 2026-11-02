(() => {
  const shell = document.querySelector(".app-shell");
  const videoPanel = document.querySelector("#video-panel");
  const video = document.querySelector("#diner-video");
  const startButton = document.querySelector("#video-start-button");
  const videoError = document.querySelector("#video-error");
  const status = document.querySelector("#video-status-pill");
  const statusText = document.querySelector("#video-status-text");
  const viewButtons = [...document.querySelectorAll("[data-content-view]")];
  let modelModule;

  function setVideoStatus(text, state = "ready") {
    statusText.textContent = text;
    status.classList.toggle("is-ready", state === "ready");
    status.classList.toggle("is-loading", state === "loading");
    status.classList.toggle("is-error", state === "error");
  }

  function showModelError(message) {
    document.querySelector("#loading-state").classList.add("is-hidden");
    document.querySelector("#error-state").classList.remove("is-hidden");
    document.querySelector("#error-text").textContent = message;
    document.querySelector("#status-text").textContent = "加载失败";
  }

  function showView(view) {
    const isVideo = view === "video";
    shell.classList.toggle("is-video", isVideo);
    videoPanel.hidden = !isVideo;
    viewButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.contentView === view));
    });
    if (location.protocol !== "file:") {
      const url = new URL(location.href);
      url.searchParams.set("view", view);
      history.replaceState(null, "", url);
    }
    if (isVideo) {
      if (!video.getAttribute("src")) video.src = video.dataset.src;
      return;
    }
    video.pause();
    if (location.protocol === "file:") {
      showModelError("三维预览需通过本地服务器打开：http://127.0.0.1:4174/ 。拆解视频可直接播放。");
      return;
    }
    // 仅在进入三维页签时加载模型，打开视频页不下载大型三维资产。
    modelModule ??= import("./app.js?v=share-1").catch((error) => {
      showModelError(error?.message || "三维预览加载失败，请刷新页面重试。");
    });
    modelModule.then(() => {
      if (!shell.classList.contains("is-video")) {
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
      }
    });
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.contentView));
  });
  video.addEventListener("loadstart", () => {
    videoError.hidden = true;
    setVideoStatus("正在加载动画", "loading");
  });
  video.addEventListener("loadedmetadata", () => setVideoStatus("动画已就绪"));
  video.addEventListener("play", () => {
    startButton.hidden = true;
    setVideoStatus("正在播放");
  });
  video.addEventListener("pause", () => {
    if (!video.error) setVideoStatus(video.ended ? "播放结束" : "已暂停");
  });
  video.addEventListener("ended", () => {
    startButton.lastElementChild.textContent = "重新播放";
    startButton.hidden = false;
    setVideoStatus("播放结束");
  });
  video.addEventListener("seeked", () => {
    if (video.error || video.ended) return;
    startButton.hidden = video.currentTime > 0 || !video.paused;
    if (video.currentTime === 0) startButton.lastElementChild.textContent = "播放拆解动画";
    setVideoStatus(video.paused ? "已暂停" : "正在播放");
  });
  video.addEventListener("error", () => {
    startButton.hidden = true;
    videoError.hidden = false;
    setVideoStatus("视频加载失败", "error");
  });
  startButton.addEventListener("click", () => {
    if (video.ended) video.currentTime = 0;
    video.play().catch(() => setVideoStatus("请使用播放器的播放按钮"));
  });
  document.querySelector("#video-retry-button").addEventListener("click", () => {
    video.load();
    startButton.hidden = false;
  });

  const params = new URLSearchParams(location.search);
  const initialView = params.get("view") ?? "3d";
  showView(initialView === "3d" ? "3d" : "video");
})();
