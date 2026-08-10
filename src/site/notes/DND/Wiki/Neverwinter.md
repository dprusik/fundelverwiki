---
{"dg-publish":true,"permalink":"/dnd/wiki/neverwinter/"}
---

## Leaflet interactive campaign map

This is a starter page for an interactive fantasy map using Leaflet. Replace the image path later with your uploaded map graphic.

<div id="campaign-map" style="height: 650px; width: 100%; border: 1px solid #555; border-radius: 8px;"></div>

<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<script>
  // Change this after uploading your map image to the Digital Garden / Vercel assets folder.
  // Example: /img/sword-coast-map.jpg or /assets/maps/world-map.png
  const mapImageUrl = "/DND/Lokacje/NeverwinterMapClean.jpg";

  // Set this to the pixel size of your map image.
  // Example: if your image is 3000x2000, use width = 3000 and height = 2000.
  const mapWidth = 3000;
  const mapHeight = 2000;

  const bounds = [[0, 0], [mapHeight, mapWidth\|0, 0], [mapHeight, mapWidth]];

  const map = L.map("campaign-map", {
    crs: L.CRS.Simple,
    minZoom: -2,
    maxZoom: 2,
    zoomControl: true
  });

  L.imageOverlay(mapImageUrl, bounds).addTo(map);
  map.fitBounds(bounds);

  // Helper for placing markers using image pixel coordinates.
  // x = distance from left edge of image
  // y = distance from top edge of image
  function addMapMarker(name, x, y, noteUrl, description) {
    L.marker([y, x])
      .addTo(map)
      .bindPopup(`
        <strong>${name}</strong><br>
        ${description ? description + "<br>" : ""}
        <a href="${noteUrl}">Open note</a>
      `);
  }

  // Sample markers. Replace these with your real campaign locations.
  addMapMarker(
    "Phandalin",
    1200,
    900,
    "/dnd/wiki/lokacje/phandalin/",
    "Frontier town near the Triboar Trail."
  );

  addMapMarker(
    "Neverwinter",
    1450,
    500,
    "/dnd/wiki/lokacje/neverwinter/",
    "The Jewel of the North."
  );

  addMapMarker(
    "Forge of Spells",
    1000,
    1100,
    "/dnd/wiki/lokacje/forge-of-spells/",
    "Recovered by the party after Lost Mine of Phandelver."
  );

  // Optional: click map to log coordinates.
  // Use this to find x/y positions for new markers.
  map.on("click", function (event) {
    const x = Math.round(event.latlng.lng);
    const y = Math.round(event.latlng.lat);
    console.log(`Map coordinates: x=${x}, y=${y}`);

    L.popup()
      .setLatLng(event.latlng)
      .setContent(`x: ${x}<br>y: ${y}`)
      .openOn(map);
  });
</script>

## How to use

1. Upload your map image to the website assets folder.
2. Replace `/img/your-map-image-here.jpg` with the real image path.
3. Set `mapWidth` and `mapHeight` to the actual pixel dimensions of the image.
4. Click on the map in the browser to get coordinates for new markers.
5. Add more `addMapMarker(...)` entries for locations.

## Marker format

```js
addMapMarker(
  "Location name",
  1200,
  900,
  "/url/to/location-note/",
  "Short description shown in popup."
);
```
