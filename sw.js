/* 문장수집가 — 오프라인 캐시 서비스 워커 (v21) */
var CACHE = "vigaonda-munjang-v21";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // 외부 주소(AI API 등)는 가로채지 않음
  if (url.origin !== self.location.origin) return;

  // 페이지 이동 요청: 우선 네트워크, 실패 시 캐시 (업데이트가 잘 반영되도록)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./", copy); c.put("./index.html", res.clone()); });
        return res;
      }).catch(function () {
        return caches.match("./").then(function (r) {
          return r || caches.match("./index.html");
        });
      })
    );
    return;
  }

  // 그 외 같은 주소 자원: 캐시 우선, 없으면 네트워크에서 받아 저장
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
