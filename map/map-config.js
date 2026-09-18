window.RHINOGOBIUS_MAP_CONFIG = {
  preferredBasemap: "esriTopo",
  fallbackBasemap: "esriTopo",

  // 这里提供自定义底图的文件级默认值；网页中的“底图配置”GUI 会覆盖这些默认值。
  // 在这里也可以直接接入一个自定义 XYZ/WMTS 瓦片服务，无需修改 app.js。
  // URL 支持 Leaflet 的 {s}、{z}、{x}、{y}，以及本项目提供的 {apiKey} 占位符。
  // 如需“底图＋注记”两层，请使用 layers 数组。
  customBasemap: {
    labels: { zh: "自定义底图", en: "Custom basemap" },
    apiKey: "",
    url: "",
    attribution: "",
    maxZoom: 19,
    subdomains: "abc",
    // layers: [
    //   { url: "https://tiles.example.com/base/{z}/{x}/{y}.png?key={apiKey}" },
    //   { url: "https://tiles.example.com/labels/{z}/{x}/{y}.png?key={apiKey}" },
    // ],
  },
};
