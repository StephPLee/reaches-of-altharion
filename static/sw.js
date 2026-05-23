self.addEventListener("install", function onInstall() {
  self.skipWaiting();
});

self.addEventListener("activate", function onActivate(event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function onFetch() {
  return;
});
