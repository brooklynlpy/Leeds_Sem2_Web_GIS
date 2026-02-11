// 全局变量
let map = null;
let markersCreated = false;

// 页面加载完成后，直接初始化地图（不再需要按钮切换页面）
window.addEventListener("load", () => {
  setTimeout(() => {
    initializeMap();
  }, 100);
});

// 初始化地图
function initializeMap() {
  if (map !== null) {
    map.invalidateSize();
    return;
  }

  console.log("Initializing map...");

  try {
    // 创建地图
    map = L.map("map", {
      center: [53.8008, -1.5491],
      zoom: 13,
      zoomControl: true
    });
    console.log("Map object created");

    // 添加地图瓦片层
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
      minZoom: 10
    }).addTo(map);
    console.log("Tile layer added");

    // 添加比例尺
    L.control.scale({
      imperial: true,
      metric: true
    }).addTo(map);

    console.log("Map initialized successfully");

    // 创建标记
    if (!markersCreated) {
      createMarkers();
      markersCreated = true;
    }
  } catch (error) {
    console.error("Map initialization error:", error);
    document.getElementById("plaque-count").innerHTML =
      "<strong style='color:red'>Error initializing map: " + error.message + "</strong>";
  }
}

// 自定义蓝色图标
const bluePlaqueIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// 坐标转换函数
function convertCoordinates(easting, northing) {
  try {
    if (typeof OSRef === "undefined") {
      console.warn("JSCoord library not loaded, using fallback conversion");
      // 简化转换作为备用
      const lat = 53.8 + (northing - 433000) / 111000;
      const lng =
        -1.55 + (easting - 430000) / (111000 * Math.cos((53.8 * Math.PI) / 180));
      return { lat: lat, lng: lng };
    }

    const osGridRef = new OSRef(easting, northing);
    const latLng = osGridRef.toLatLng();
    return {
      lat: latLng.lat,
      lng: latLng.lng
    };
  } catch (error) {
    console.error("Coordinate conversion error:", error);
    return null;
  }
}

// 创建弹窗内容
function createPopupContent(plaque) {
  let popupHTML = `<div class="popup-title">${plaque.title || ""}</div>`;

  if (plaque.location) {
    popupHTML += `<div class="popup-location">${plaque.location}</div>`;
  }

  popupHTML += `<table class="popup-info-table">`;

  if (plaque.unveiler && plaque.unveiler !== "Private unveiling") {
    popupHTML += `
      <tr>
        <td class="popup-info-label">Unveiled by</td>
        <td class="popup-info-value">${plaque.unveiler}</td>
      </tr>`;
  }

  if (plaque.date) {
    popupHTML += `
      <tr>
        <td class="popup-info-label">Date</td>
        <td class="popup-info-value">${plaque.date}</td>
      </tr>`;
  }

  if (plaque.sponser) {
    popupHTML += `
      <tr>
        <td class="popup-info-label">Sponsor</td>
        <td class="popup-info-value">${plaque.sponser}</td>
      </tr>`;
  }

  popupHTML += `</table>`;

  if (plaque.caption && plaque.caption !== "Not found") {
    popupHTML += `
      <div class="popup-caption">
        <div class="popup-caption-title">What it Says</div>
        ${plaque.caption}
      </div>`;
  }

  const searchQuery = encodeURIComponent((plaque.title || "") + " Leeds");
  popupHTML += `<a href="https://www.google.com/search?q=${searchQuery}" target="_blank" class="popup-link">Learn More Online</a>`;

  return popupHTML;
}

// 创建标记
function createMarkers() {
  console.log("Creating markers...");

  if (typeof osmarkers === "undefined") {
    console.error("ERROR: osmarkers data not loaded!");
    document.getElementById("plaque-count").innerHTML =
      "<strong style='color:red'>Error: Data file blueplaquesdataprocessed.js not loaded!</strong>";
    return;
  }

  let validCount = 0;
  let invalidCount = 0;

  console.log(`Processing ${osmarkers.length} plaques...`);

  for (let i = 0; i < osmarkers.length; i++) {
    const plaque = osmarkers[i];

    if (!plaque.easting || !plaque.northing || plaque.easting === 0 || plaque.northing === 0) {
      invalidCount++;
      continue;
    }

    const coords = convertCoordinates(plaque.easting, plaque.northing);
    if (coords && coords.lat && coords.lng) {
      try {
        const marker = L.marker([coords.lat, coords.lng], {
          icon: bluePlaqueIcon,
          title: plaque.title || ""
        }).addTo(map);

        const popupContent = createPopupContent(plaque);
        marker.bindPopup(popupContent, { maxWidth: 450 });

        validCount++;
      } catch (e) {
        console.error("Error adding marker for", plaque.title, e);
        invalidCount++;
      }
    } else {
      invalidCount++;
    }
  }

  document.getElementById("plaque-count").innerHTML =
    `Displaying <strong>${validCount}</strong> blue plaques on the map.<br>` +
    `<small>${invalidCount} plaques could not be displayed due to missing coordinate data.</small>`;

  console.log(`Loaded ${validCount} plaques, Skipped ${invalidCount}`);
}
