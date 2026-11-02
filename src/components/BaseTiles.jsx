import { TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const ESRI_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

// Esri Light Gray Canvas: a muted basemap that needs no API key, drawn as a base layer plus a labels layer
export function BaseTiles() {
  return (
    <>
      <TileLayer
        url={`${ESRI_TILES}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxNativeZoom={16}
        maxZoom={19}
      />
      <TileLayer url={`${ESRI_TILES}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={16} maxZoom={19} />
    </>
  );
}
