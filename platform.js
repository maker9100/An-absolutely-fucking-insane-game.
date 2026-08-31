
(() => {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const coarse = matchMedia("(pointer:coarse)").matches;
  const touch = navigator.maxTouchPoints > 0 && coarse;

  let os = "web";
  if (/iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1)) os = "ios";
  else if (/Android/i.test(ua)) os = "android";
  else if (/Win/.test(platform) || /Windows/.test(ua)) os = "windows";
  else if (/Mac/.test(platform)) os = "macos";
  else if (/Linux/.test(platform) || /Linux/.test(ua)) os = "linux";

  document.body.classList.add(os, touch ? "touch" : "desktop");

  window.PLATFORM = {
    os,
    touch,
    mobile: os === "ios" || os === "android"
  };

  const readable = {
    ios: "iOS / iPadOS",
    android: "Android",
    windows: "Windows",
    macos: "macOS",
    linux: "Linux",
    web: "Web"
  };

  document.getElementById("deviceBadge").textContent =
    `${readable[os]} · ${touch ? "TOUCH" : "KB/MOUSE"}`;
})();
