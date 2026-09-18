(() => {
  "use strict";

  const sourceSpecies = Array.isArray(window.RHINOGOBIUS_MAP_DATA)
    ? window.RHINOGOBIUS_MAP_DATA
    : [];
  const georeferencedPoints = window.RHINOGOBIUS_GEOREFERENCED_POINTS || {};
  const species = sourceSpecies.map((item) => {
    const georeference = georeferencedPoints[item.scientificName];
    const correctedItem = { ...item, region: correctedRegion(item) };
    if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
      return { ...correctedItem, coordinateType: "source_coordinate", locationAccuracy: "原文精确坐标" };
    }
    return georeference
      ? { ...correctedItem, ...georeference }
      : { ...correctedItem, coordinateType: "pending" };
  });
  const nodes = {
    resultCount: document.querySelector("#result-count"),
    list: document.querySelector("#species-list"),
    search: document.querySelector("#search-input"),
    status: document.querySelector("#status-filter"),
    region: document.querySelector("#region-filter"),
    clear: document.querySelector("#clear-filters"),
    fit: document.querySelector("#fit-markers"),
    basemapSelect: document.querySelector("#basemap-select"),
    basemapSettings: document.querySelector("#basemap-settings"),
    basemapDialog: document.querySelector("#basemap-settings-dialog"),
    basemapForm: document.querySelector("#basemap-settings-form"),
    basemapDialogClose: document.querySelector("#basemap-settings-close"),
    basemapDialogCancel: document.querySelector("#basemap-settings-cancel"),
    basemapDialogReset: document.querySelector("#basemap-settings-reset"),
    customNameZh: document.querySelector("#custom-basemap-name-zh"),
    customNameEn: document.querySelector("#custom-basemap-name-en"),
    customUrl: document.querySelector("#custom-basemap-url"),
    customLabelUrl: document.querySelector("#custom-basemap-label-url"),
    customApiKey: document.querySelector("#custom-basemap-api-key"),
    customAttribution: document.querySelector("#custom-basemap-attribution"),
    customMaxZoom: document.querySelector("#custom-basemap-max-zoom"),
    customSubdomains: document.querySelector("#custom-basemap-subdomains"),
    languageSelect: document.querySelector("#language-select"),
    speciesLabels: document.querySelector("#species-labels"),
    card: document.querySelector("#selection-card"),
    error: document.querySelector("#map-error"),
  };

  const I18N = {
    zh: {
      documentTitle: "Rhinogobius 模式产地地图",
      pageTitle: "模式产地地图",
      searchLabel: "检索物种或产地",
      searchPlaceholder: "学名、中文名或模式产地",
      statusLabel: "定位状态",
      regionLabel: "国家／地区",
      all: "全部",
      exactPosition: "原文精确坐标",
      approximatePosition: "大致位置",
      vagueLocality: "产地模糊",
      reset: "重置",
      basemap: "底图",
      chooseBasemap: "选择底图",
      esriTopo: "Esri 地形图",
      esriImagery: "Esri 卫星图",
      apiKeyRequired: "未配置",
      basemapSettings: "自定义底图",
      basemapSettingsTitle: "自定义底图",
      basemapSettingsNote: "设置仅保存在当前浏览器。瓦片地址支持 {s}、{z}、{x}、{y} 和 {apiKey}。",
      customNameZh: "中文名称",
      customNameEn: "英文名称",
      customTileUrl: "底图瓦片地址",
      customLabelUrl: "注记层地址（可选）",
      customApiKey: "API Key（可选）",
      customAttribution: "地图署名",
      customMaxZoom: "最大缩放级别",
      customSubdomains: "子域名",
      resetCustomBasemap: "恢复默认",
      cancel: "取消",
      saveAndApply: "保存并应用",
      close: "关闭",
      apiKeyMissing: "瓦片地址使用了 {apiKey}，请填写 API Key。",
      speciesLabels: "物种标签",
      speciesLabelsTitle: "放大地图或缩小筛选范围后显示物种名称",
      showAllPoints: "显示全部点位",
      showAllPointsTitle: "显示全部精确点位",
      language: "语言",
      languageControl: "切换界面语言",
      legendExact: "精确位置",
      legendApproximate: "大致位置",
      legendVague: "产地模糊",
      resultCount: (shown, total) => `显示 ${shown} / ${total} 个物种`,
      noResults: "没有符合当前条件的物种。",
      chineseNameUnavailable: "中文名未提供",
      closeDetails: "关闭物种详情",
      authorship: "命名作者",
      countryRegion: "国家地区",
      locationType: "定位类型",
      typeLocality: "模式产地",
      coordinates: "坐标",
      locationNote: "定位说明",
      locationSources: "定位来源",
      pendingCoordinate: "待从原始描述或地名资料进一步定位",
      locationExact: "原文精确坐标",
      locationNamed: "明确地名定位",
      locationInferred: "推定位置",
      locationPending: "待定位",
      mapEngineError: "本地地图引擎未能加载，请确认 vendor 文件夹与 index.html 位于同一目录。",
      onlineMapError: "所选底图加载失败，请检查网络或选择其他底图。",
    },
    en: {
      documentTitle: "Rhinogobius Type Locality Map",
      pageTitle: "Type Locality Map",
      searchLabel: "Search species or locality",
      searchPlaceholder: "Scientific name, Chinese name, or type locality",
      statusLabel: "Location status",
      regionLabel: "Country / region",
      all: "All",
      exactPosition: "Original coordinates",
      approximatePosition: "Approximate location",
      vagueLocality: "Vague locality",
      reset: "Reset",
      basemap: "Map",
      chooseBasemap: "Choose basemap",
      esriTopo: "Esri topographic",
      esriImagery: "Esri imagery",
      apiKeyRequired: "not configured",
      basemapSettings: "Custom basemap",
      basemapSettingsTitle: "Custom basemap",
      basemapSettingsNote: "Settings are stored only in this browser. Tile URLs support {s}, {z}, {x}, {y}, and {apiKey}.",
      customNameZh: "Chinese name",
      customNameEn: "English name",
      customTileUrl: "Base tile URL",
      customLabelUrl: "Label tile URL (optional)",
      customApiKey: "API key (optional)",
      customAttribution: "Attribution",
      customMaxZoom: "Maximum zoom",
      customSubdomains: "Subdomains",
      resetCustomBasemap: "Restore defaults",
      cancel: "Cancel",
      saveAndApply: "Save and apply",
      close: "Close",
      apiKeyMissing: "The tile URL uses {apiKey}; enter an API key.",
      speciesLabels: "Species labels",
      speciesLabelsTitle: "Show species names after zooming in or narrowing the results",
      showAllPoints: "Show all points",
      showAllPointsTitle: "Fit all visible locality points",
      language: "Language",
      languageControl: "Change interface language",
      legendExact: "Exact",
      legendApproximate: "Approximate",
      legendVague: "Vague locality",
      resultCount: (shown, total) => `Showing ${shown} / ${total} species`,
      noResults: "No species match the current filters.",
      chineseNameUnavailable: "Chinese name unavailable",
      closeDetails: "Close species details",
      authorship: "Authorship",
      countryRegion: "Country / region",
      locationType: "Location type",
      typeLocality: "Type locality",
      coordinates: "Coordinates",
      locationNote: "Georeference note",
      locationSources: "Georeference sources",
      pendingCoordinate: "Further georeferencing from the original description or locality sources is needed",
      locationExact: "Original exact coordinates",
      locationNamed: "Named-locality georeference",
      locationInferred: "Inferred location",
      locationPending: "Pending georeference",
      mapEngineError: "The local map engine could not load. Keep the vendor folder beside index.html.",
      onlineMapError: "The selected basemap failed to load. Check the network connection or choose another basemap.",
    },
  };

  const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
  let currentLanguage = ["zh", "en"].includes(requestedLanguage)
    ? requestedLanguage
    : localStorage.getItem("rhinogobius-map-language") === "en" ? "en" : "zh";

  const MAP_CONFIG = window.RHINOGOBIUS_MAP_CONFIG || {};

  const BASEMAPS = {
    esriTopo: {
      labelKey: "esriTopo",
      maxZoom: 19,
      maxNativeZoom: 19,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Tiles &copy; Esri — Esri, TomTom, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors, and the GIS User Community",
    },
    esriImagery: {
      labelKey: "esriImagery",
      maxZoom: 19,
      maxNativeZoom: 19,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  };

  registerCustomBasemap();

  const mappedSpecies = species.filter(hasCoordinates);

  populateRegionFilter();

  let map = null;
  let markerLayer = null;
  let tileLayer = null;
  let basemapMode = "esriTopo";
  let tileErrorCount = 0;
  let selectedMarker = null;
  let selectedItem = null;
  let suppressPopupClose = false;
  let currentFilteredSpecies = species;
  const markerById = new Map();
  const markerItemById = new Map();

  populateBasemapOptions();

  if (typeof window.L === "undefined") {
    nodes.error.textContent = t("mapEngineError");
    nodes.error.hidden = false;
    nodes.fit.disabled = true;
    nodes.basemapSelect.disabled = true;
  } else {
    initialiseMap();
  }

  applyLanguage(false);
  render();

  nodes.search.addEventListener("input", render);
  nodes.status.addEventListener("change", render);
  nodes.region.addEventListener("change", render);
  nodes.clear.addEventListener("click", () => {
    nodes.search.value = "";
    nodes.status.value = "all";
    nodes.region.value = "all";
    render();
  });
  nodes.fit.addEventListener("click", fitVisibleMarkers);
  nodes.basemapSelect.addEventListener("change", () => {
    switchBasemap(nodes.basemapSelect.value, false);
  });
  nodes.basemapSettings.addEventListener("click", (event) => {
    event.preventDefault();
    openBasemapSettings();
  });
  nodes.basemapDialogClose.addEventListener("click", () => nodes.basemapDialog.close());
  nodes.basemapDialogCancel.addEventListener("click", () => nodes.basemapDialog.close());
  nodes.basemapDialogReset.addEventListener("click", resetCustomBasemap);
  nodes.basemapForm.addEventListener("submit", saveCustomBasemap);
  nodes.languageSelect.addEventListener("change", () => {
    currentLanguage = nodes.languageSelect.value === "en" ? "en" : "zh";
    localStorage.setItem("rhinogobius-map-language", currentLanguage);
    applyLanguage();
  });
  nodes.speciesLabels.addEventListener("change", updateSpeciesLabels);
  nodes.card.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest(".selection-card__close")) {
      closeSelectionCard();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !nodes.card.hidden) closeSelectionCard();
  });
  if (new URLSearchParams(window.location.search).get("settings") === "1") {
    requestAnimationFrame(openBasemapSettings);
  }

  function applyLanguage(rerenderPage = true) {
    document.documentElement.lang = currentLanguage === "en" ? "en" : "zh-CN";
    document.title = t("documentTitle");
    nodes.languageSelect.value = currentLanguage;

    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const value = t(node.dataset.i18n);
      if (typeof value === "string") node.textContent = value;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      node.title = t(node.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
      node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
    });
    populateBasemapOptions();
    if (!nodes.error.hidden) {
      nodes.error.textContent = nodes.error.classList.contains("is-info")
        ? t("onlineMapError")
        : t("mapEngineError");
    }

    for (const [id, marker] of markerById) {
      const item = markerItemById.get(id);
      if (item) marker.setPopupContent(popupMarkup(item));
    }
    if (rerenderPage) render();
    if (selectedItem) showSelectionCard(selectedItem);
  }

  function t(key) {
    return I18N[currentLanguage]?.[key] ?? I18N.zh[key] ?? key;
  }

  function getCustomBasemapConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem("rhinogobius-custom-basemap") || "null");
      if (saved && typeof saved === "object") return saved;
    } catch {
      localStorage.removeItem("rhinogobius-custom-basemap");
    }
    return MAP_CONFIG.customBasemap || {};
  }

  function openBasemapSettings() {
    fillBasemapSettings(getCustomBasemapConfig());
    nodes.basemapDialog.showModal();
  }

  function fillBasemapSettings(config) {
    const layers = Array.isArray(config.layers) ? config.layers : [];
    nodes.customNameZh.value = config.labels?.zh || config.label || "自定义底图";
    nodes.customNameEn.value = config.labels?.en || "Custom basemap";
    nodes.customUrl.value = config.url || layers[0]?.url || "";
    nodes.customLabelUrl.value = config.labelUrl || layers[1]?.url || "";
    nodes.customApiKey.value = config.apiKey || "";
    nodes.customAttribution.value = config.attribution || layers[0]?.attribution || "";
    nodes.customMaxZoom.value = Number(config.maxZoom) || 19;
    nodes.customSubdomains.value = config.subdomains || layers[0]?.subdomains || "abc";
    nodes.customUrl.setCustomValidity("");
  }

  function saveCustomBasemap(event) {
    event.preventDefault();
    const url = nodes.customUrl.value.trim();
    const labelUrl = nodes.customLabelUrl.value.trim();
    const apiKey = nodes.customApiKey.value.trim();
    const requiresApiKey = [url, labelUrl].some((value) => value.includes("{apiKey}"));
    if (requiresApiKey && !apiKey) {
      nodes.customUrl.setCustomValidity(t("apiKeyMissing"));
      nodes.customUrl.reportValidity();
      return;
    }
    nodes.customUrl.setCustomValidity("");

    const config = {
      labels: {
        zh: nodes.customNameZh.value.trim() || "自定义底图",
        en: nodes.customNameEn.value.trim() || "Custom basemap",
      },
      url,
      labelUrl,
      apiKey,
      attribution: nodes.customAttribution.value.trim(),
      maxZoom: Math.min(24, Math.max(1, Number(nodes.customMaxZoom.value) || 19)),
      subdomains: nodes.customSubdomains.value.trim() || "abc",
    };
    localStorage.setItem("rhinogobius-custom-basemap", JSON.stringify(config));
    registerCustomBasemap();
    populateBasemapOptions();
    if (BASEMAPS.custom.available) switchBasemap("custom", false);
    nodes.basemapDialog.close();
  }

  function resetCustomBasemap() {
    localStorage.removeItem("rhinogobius-custom-basemap");
    registerCustomBasemap();
    populateBasemapOptions();
    if (basemapMode === "custom" && !BASEMAPS.custom.available) switchBasemap("esriTopo", false);
    fillBasemapSettings(MAP_CONFIG.customBasemap || {});
  }

  function registerCustomBasemap() {
    const entry = getCustomBasemapConfig();
    const apiKey = String(entry.apiKey || "").trim();
    const rawLayers = Array.isArray(entry.layers) && entry.layers.length
      ? entry.layers
      : entry.url
        ? [entry, ...(entry.labelUrl ? [{ ...entry, url: entry.labelUrl, attribution: "" }] : [])]
        : [];
    const requiresApiKey = rawLayers.some((layer) => String(layer.url || "").includes("{apiKey}"));
    const layers = rawLayers
      .filter((layer) => typeof layer.url === "string" && layer.url.trim())
      .map((layer) => ({
        url: layer.url.replaceAll("{apiKey}", encodeURIComponent(apiKey)),
        attribution: layer.attribution || entry.attribution || "",
        subdomains: layer.subdomains || entry.subdomains,
        maxNativeZoom: layer.maxNativeZoom || entry.maxNativeZoom,
        tileSize: layer.tileSize || entry.tileSize,
        zoomOffset: layer.zoomOffset ?? entry.zoomOffset,
        tms: layer.tms ?? entry.tms,
        opacity: layer.opacity ?? entry.opacity,
        crossOrigin: layer.crossOrigin ?? entry.crossOrigin,
      }));

    BASEMAPS.custom = {
      label: entry.label || "自定义底图",
      labels: entry.labels || { zh: "自定义底图", en: "Custom basemap" },
      maxZoom: Number(entry.maxZoom) || 19,
      maxNativeZoom: Number(entry.maxNativeZoom) || Number(entry.maxZoom) || 19,
      available: entry.enabled !== false && layers.length > 0 && (!requiresApiKey || Boolean(apiKey)),
      layers,
    };
  }

  function basemapLabel(id, definition) {
    const configuredLabel = definition.labels?.[currentLanguage]
      || definition.labels?.zh
      || definition.labels?.en;
    const label = definition.labelKey
      ? t(definition.labelKey)
      : configuredLabel || definition.label || id;
    return definition.available === false ? `${label} (${t("apiKeyRequired")})` : label;
  }

  function populateBasemapOptions() {
    const previousValue = nodes.basemapSelect.value;
    nodes.basemapSelect.replaceChildren();

    for (const [id, definition] of Object.entries(BASEMAPS)) {
      if (id === "custom" && definition.available === false) continue;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = basemapLabel(id, definition);
      option.disabled = definition.available === false;
      nodes.basemapSelect.append(option);
    }

    const fallback = availableBasemapId(MAP_CONFIG.fallbackBasemap) || "esriTopo";
    nodes.basemapSelect.value = availableBasemapId(previousValue) || fallback;
  }

  function availableBasemapId(id) {
    return id && Object.hasOwn(BASEMAPS, id) && BASEMAPS[id].available !== false ? id : "";
  }

  function initialiseMap() {
    map = L.map("map", {
      center: [25, 115],
      zoom: 4,
      minZoom: 2,
      zoomControl: false,
      worldCopyJump: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

    const mapParams = new URLSearchParams(window.location.search);
    const requestedBasemap = mapParams.get("basemap")
      || localStorage.getItem("rhinogobius-basemap")
      || MAP_CONFIG.preferredBasemap
      || "esriTopo";
    const fallbackBasemap = availableBasemapId(MAP_CONFIG.fallbackBasemap) || "esriTopo";
    switchBasemap(availableBasemapId(requestedBasemap) || fallbackBasemap, false);

    markerLayer = L.featureGroup().addTo(map);
    addMarkers();
    map.on("zoomend", updateSpeciesLabels);
    map.on("popupclose", () => {
      if (!suppressPopupClose && !nodes.card.hidden) closeSelectionCard(false);
    });
    fitVisibleMarkers();
  }

  function switchBasemap(mode, automatic) {
    if (!map) return;
    const fallbackBasemap = availableBasemapId(MAP_CONFIG.fallbackBasemap) || "esriTopo";
    mode = availableBasemapId(mode) || fallbackBasemap;
    const definition = BASEMAPS[mode];
    if (tileLayer && map.hasLayer(tileLayer)) map.removeLayer(tileLayer);
    tileLayer = null;

    basemapMode = mode;
    tileErrorCount = 0;
    map.setMaxBounds(null);
    map.setMaxZoom(definition.maxZoom);
    const layerDefinitions = definition.layers || [definition];
    const activeLayers = layerDefinitions.map((layerDefinition) => {
      const layer = L.tileLayer(layerDefinition.url, {
        maxZoom: definition.maxZoom,
        maxNativeZoom: layerDefinition.maxNativeZoom || definition.maxNativeZoom,
        attribution: layerDefinition.attribution || definition.attribution || "",
        subdomains: layerDefinition.subdomains || definition.subdomains || "abc",
        tileSize: layerDefinition.tileSize || definition.tileSize || 256,
        zoomOffset: layerDefinition.zoomOffset ?? definition.zoomOffset ?? 0,
        tms: layerDefinition.tms ?? definition.tms ?? false,
        opacity: layerDefinition.opacity ?? definition.opacity ?? 1,
        crossOrigin: layerDefinition.crossOrigin ?? definition.crossOrigin ?? true,
      });
      layer.on("tileerror", () => {
        tileErrorCount += 1;
        if (tileErrorCount < 8 || basemapMode !== mode) return;
        if (mode !== fallbackBasemap) {
          switchBasemap(fallbackBasemap, true);
        } else {
          nodes.error.textContent = t("onlineMapError");
          nodes.error.classList.add("is-info");
          nodes.error.hidden = false;
        }
      });
      layer.on("load", () => {
        if (basemapMode === mode) {
          tileErrorCount = 0;
          nodes.error.hidden = true;
        }
      });
      return layer;
    });
    tileLayer = L.layerGroup(activeLayers);
    tileLayer.addTo(map);
    nodes.basemapSelect.value = mode;
    localStorage.setItem("rhinogobius-basemap", mode);
    if (automatic) {
      nodes.error.textContent = t("onlineMapError");
      nodes.error.classList.add("is-info");
      nodes.error.hidden = false;
    } else {
      nodes.error.hidden = true;
    }
  }

  function addMarkers() {
    for (const item of mappedSpecies) {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: markerIconFor(item),
      });
      marker.bindPopup(popupMarkup(item), {
        maxWidth: 330,
        closeButton: true,
        autoClose: true,
        closeOnClick: true,
      });
      marker.bindTooltip(speciesTooltipMarkup(item), {
        direction: item.id % 2 ? "right" : "left",
        offset: item.id % 2 ? [8, 0] : [-8, 0],
        opacity: 1,
        className: "species-map-label",
      });
      marker.on("click", () => selectSpecies(item, false));
      marker.addTo(markerLayer);
      markerById.set(item.id, marker);
      markerItemById.set(item.id, item);
    }
  }

  function populateRegionFilter() {
    const regions = [...new Set(species.map((item) => item.region).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "zh-CN"));
    for (const region of regions) {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      nodes.region.append(option);
    }
  }

  function correctedRegion(item) {
    if (["中国大陆", "中国台湾", "中国香港", "中国"].includes(item.region)) {
      return "中国";
    }

    const speciesOverrides = {
      "Rhinogobius lithopolychroma": "中国",
      "Rhinogobius sudoccidentalis": "中国",
      "Rhinogobius imfasciocaudatus": "中国"
    };

    return speciesOverrides[item.scientificName] || item.region || "未标注";
  }

  function getFilteredSpecies() {
    const term = nodes.search.value.trim().toLocaleLowerCase();
    const status = nodes.status.value;
    const region = nodes.region.value;

    return species.filter((item) => {
      const mapped = hasCoordinates(item);
      if (status === "exact" && item.coordinateType !== "source_coordinate") return false;
      if (status === "named" && item.coordinateType !== "named_locality") return false;
      if (status === "inferred" && item.coordinateType !== "inferred") return false;
      if (status === "pending" && mapped) return false;
      if (region !== "all" && item.region !== region) return false;
      if (!term) return true;
      return [
        item.scientificName,
        item.chineseName,
        item.authorship,
        item.typeLocality,
        item.region,
      ]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(term));
    });
  }

  function render() {
    const filtered = getFilteredSpecies();
    currentFilteredSpecies = filtered;
    nodes.resultCount.textContent = t("resultCount")(filtered.length, species.length);
    nodes.list.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = t("noResults");
      nodes.list.append(empty);
    } else {
      const fragment = document.createDocumentFragment();
      for (const item of filtered) fragment.append(buildListItem(item));
      nodes.list.append(fragment);
    }

    updateMarkerVisibility(filtered);
    updateSpeciesLabels();
  }

  function buildListItem(item) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    const mapped = hasCoordinates(item);
    button.type = "button";
    button.className = "species-item";
    if (selectedItem?.id === item.id) button.classList.add("is-selected");
    button.dataset.id = item.id;
    button.innerHTML = `
      <span class="status-dot${mapped ? " is-mapped" : ""}${item.coordinateType === "named_locality" ? " is-named" : ""}${item.coordinateType === "inferred" ? " is-inferred" : ""}" aria-hidden="true"></span>
      <span class="species-main">
        <span class="species-name">${escapeHtml(item.scientificName)}</span>
        <span class="species-subtitle">${escapeHtml(item.chineseName || item.region || t("chineseNameUnavailable"))}</span>
      </span>
      <span class="species-index">${String(item.id).padStart(3, "0")}</span>
    `;
    button.addEventListener("click", () => selectSpecies(item, true));
    li.append(button);
    return li;
  }

  function updateMarkerVisibility(filtered) {
    if (!map || !markerLayer) return;
    const visible = new Set(filtered.filter(hasCoordinates).map((item) => item.id));
    for (const [id, marker] of markerById) {
      if (visible.has(id) && !markerLayer.hasLayer(marker)) markerLayer.addLayer(marker);
      if (!visible.has(id) && markerLayer.hasLayer(marker)) markerLayer.removeLayer(marker);
    }
  }

  function selectSpecies(item, moveMap) {
    selectedItem = item;
    document
      .querySelectorAll(".species-item.is-selected")
      .forEach((node) => node.classList.remove("is-selected"));
    const listButton = document.querySelector(`.species-item[data-id="${item.id}"]`);
    if (listButton) listButton.classList.add("is-selected");

    resetSelectedMarker();
    const marker = markerById.get(item.id);
    if (marker && markerLayer && markerLayer.hasLayer(marker)) {
      selectedMarker = marker;
      marker.setZIndexOffset(1000);
      marker.getElement()?.querySelector(".map-marker")?.classList.add("is-selected");
      if (moveMap) map.flyTo([item.latitude, item.longitude], Math.max(map.getZoom(), 7), { duration: 0.75 });
      suppressPopupClose = true;
      try {
        marker.openPopup();
      } finally {
        suppressPopupClose = false;
      }
    }

    showSelectionCard(item);
    updateSpeciesLabels();
  }

  function resetSelectedMarker() {
    if (!selectedMarker) return;
    selectedMarker.setZIndexOffset(0);
    selectedMarker.getElement()?.querySelector(".map-marker")?.classList.remove("is-selected");
    selectedMarker = null;
  }

  function showSelectionCard(item) {
    const coordinateText = hasCoordinates(item)
      ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`
      : `<span class="pending">${escapeHtml(t("pendingCoordinate"))}</span>`;
    const sourceLinks = Array.isArray(item.sources) && item.sources.length
      ? item.sources
          .map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a>`)
          .join(" · ")
      : "—";
    nodes.card.innerHTML = `
      <button class="selection-card__close" type="button" aria-label="${escapeHtml(t("closeDetails"))}" title="${escapeHtml(t("closeDetails"))}">×</button>
      <h2>${escapeHtml(item.scientificName)}</h2>
      <p class="cn-name">${escapeHtml(item.chineseName || t("chineseNameUnavailable"))}</p>
      <dl>
        <dt>${escapeHtml(t("authorship"))}</dt><dd>${escapeHtml(item.authorship || "—")}</dd>
        <dt>${escapeHtml(t("countryRegion"))}</dt><dd>${escapeHtml(item.region || "—")}</dd>
        <dt>${escapeHtml(t("locationType"))}</dt><dd>${escapeHtml(locationTypeLabel(item))}</dd>
        <dt>${escapeHtml(t("typeLocality"))}</dt><dd>${escapeHtml(item.typeLocality || "—")}</dd>
        <dt>${escapeHtml(t("coordinates"))}</dt><dd>${coordinateText}</dd>
        ${item.georeferenceNote ? `<dt>${escapeHtml(t("locationNote"))}</dt><dd>${escapeHtml(item.georeferenceNote)}</dd>` : ""}
        ${Array.isArray(item.sources) ? `<dt>${escapeHtml(t("locationSources"))}</dt><dd>${sourceLinks}</dd>` : ""}
      </dl>
    `;
    nodes.card.hidden = false;
  }

  function closeSelectionCard(closeMapPopup = true) {
    selectedItem = null;
    nodes.card.hidden = true;
    nodes.card.replaceChildren();
    document
      .querySelectorAll(".species-item.is-selected")
      .forEach((node) => node.classList.remove("is-selected"));
    resetSelectedMarker();
    if (map && closeMapPopup) map.closePopup();
    updateSpeciesLabels();
  }

  function fitVisibleMarkers() {
    if (!map || !markerLayer) return;
    const bounds = markerLayer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.16), { maxZoom: 7 });
  }

  function updateSpeciesLabels() {
    if (!map || !markerLayer) return;
    map.getContainer().classList.toggle(
      "species-labels-disabled",
      !nodes.speciesLabels.checked,
    );
    const visibleMapped = currentFilteredSpecies.filter(hasCoordinates);
    const showPersistent =
      nodes.speciesLabels.checked && (map.getZoom() >= 6 || visibleMapped.length <= 10);
    for (const marker of markerById.values()) {
      if (!markerLayer.hasLayer(marker)) continue;
      if (showPersistent || marker === selectedMarker) marker.openTooltip();
      else marker.closeTooltip();
    }
  }

  function popupMarkup(item) {
    return `
      <div class="popup-name">${escapeHtml(item.scientificName)}</div>
      <div class="popup-cn">${escapeHtml(item.chineseName || "")}</div>
      <div class="popup-precision">${escapeHtml(locationTypeLabel(item))}</div>
      <div class="popup-place">${escapeHtml(item.typeLocality)}</div>
    `;
  }

  function speciesTooltipMarkup(item) {
    return `
      <span class="species-tooltip-name">${escapeHtml(item.scientificName)}</span>
      <span class="species-tooltip-cn">${escapeHtml(item.chineseName || "")}</span>
    `;
  }

  function markerIconFor(item) {
    const isInferred = item.coordinateType === "inferred";
    const markerClass = item.coordinateType === "source_coordinate"
      ? "map-marker--exact"
      : item.coordinateType === "named_locality"
        ? "map-marker--named"
        : "map-marker--inferred";
    const iconSize = isInferred ? [16, 16] : [14, 13];
    const iconAnchor = isInferred ? [8, 8] : [7, 13];

    return L.divIcon({
      className: "map-marker-wrap",
      html: `<span class="map-marker ${markerClass}" aria-hidden="true"></span>`,
      iconSize,
      iconAnchor,
    });
  }

  function locationTypeLabel(item) {
    if (item.coordinateType === "source_coordinate") return t("locationExact");
    if (item.coordinateType === "named_locality") {
      return currentLanguage === "zh" && item.locationAccuracy
        ? item.locationAccuracy
        : t("locationNamed");
    }
    if (item.coordinateType === "inferred") {
      return currentLanguage === "zh" && item.locationAccuracy
        ? item.locationAccuracy
        : t("locationInferred");
    }
    return t("locationPending");
  }

  function hasCoordinates(item) {
    return Number.isFinite(item.latitude) && Number.isFinite(item.longitude);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
