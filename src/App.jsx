import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import axios from "axios";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet-routing-machine";
import PropTypes from "prop-types";
import L from "leaflet";
import * as turf from "@turf/turf";

const Gallery = ({ images }) => {
  return (
    <Carousel>
      {images.map((image, index) => (
        <div key={index}>
          <img src={image} alt={`Gallery image ${index + 1}`} />
        </div>
      ))}
    </Carousel>
  );
};

Gallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function App() {
  const [despacho, setDespacho] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [center, setCenter] = useState([14.41048, -91.34619]);
  const [selectedFinca, setSelectedFinca] = useState(null);
  const mapRef = useRef();

  useEffect(() => {
    const fetchGeoJson = async () => {
      try {
        const response = await axios.get("https://wilssondubon.github.io/EUDRDemo/B-25433.json");
        setDespacho(response.data);
        setGeoJsonData(response.data.GeoJson);
        const centroid = turf.centroid(response.data.GeoJson);
        setCenter(centroid.geometry.coordinates);
      } catch (error) {
        console.error("Error cargando el GeoJSON:", error);
      }
    };

    fetchGeoJson();
  }, []);

  useEffect(() => {
    if (geoJsonData && mapRef.current) {
      // Obtén los límites del GeoJSON
      const bounds = turf.bbox(geoJsonData);
      const map = mapRef.current;
      // Ajusta el mapa a los límites del GeoJSON
      map.fitBounds([
        [bounds[1], bounds[0]], // Suroeste
        [bounds[3], bounds[2]], // Noreste
      ]);
    }
  }, [geoJsonData]);

  const handleFincaClick = (finca) => {
    const map = mapRef.current;
    if (map && finca) {
      const centroid = turf.centroid(finca.GeoJson);
      const bounds = turf.bbox(finca.GeoJson);
      map.setView([centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]], 15); // Ajusta la vista al punto con un zoom de 15
      map.fitBounds([
        [bounds[1], bounds[0]], // Suroeste
        [bounds[3], bounds[2]], // Noreste
      ]);
    }

    setSelectedFinca(finca);
  };

  const pad = (num, length) => num.padStart(length, "0");

  const returnFincaByFeature = (feature) => {
    const codigoFincaGrupo = feature.properties.CodigoFincaGrupo.toString();
    const codigoFincaEmpresa = feature.properties.CodigoFincaEmpresa.toString();
    const codigoFincaFinca = feature.properties.CodigoFincaFinca.toString();

    console.log(codigoFincaGrupo, "-", codigoFincaEmpresa, "-", codigoFincaFinca);

    const formattedGrupo = codigoFincaGrupo.length > 3 ? codigoFincaGrupo : pad(codigoFincaGrupo, 3);
    const formattedEmpresa = pad(codigoFincaEmpresa, 3);
    const formattedFinca = pad(codigoFincaFinca, 3);

    const codigoFinca = `${formattedGrupo}-${formattedEmpresa}-${formattedFinca}`;

    const finca = despacho.Fincas.filter((t) => t.CodigoFinca == codigoFinca)[0];

    return finca;
  };

  const PopupContent = ({finca}) => {
    console.log(finca);
    return (
      <div >
        <p className="m-2">{finca.NombreFinca}</p>

        <p className="m-2">Cantidad: {finca.Cantidad} Kg.</p>

        <button className="m-0 btn btn-link" onClick={() => descargarGeoJsonFinca(finca)}>
          Descargar GeoJson
        </button>
        <br />
        <button className="m-0 btn btn-link" onClick={descargarGeoJson}>
          Descargar Papeleria
        </button>
      </div>
    );
  };

  const onEachFeature = (feature, layer) => {
    const finca = returnFincaByFeature(feature);

    layer.on({
      click: () => {
        handleFincaClick(finca);
        const container = document.createElement('div');
        
        // Renderizar el componente React en el contenedor
        const root = ReactDOM.createRoot(container);
        root.render(<PopupContent finca={finca} />);

        // Asignar el popup con el contenido React
        layer.bindPopup(container,  { className: 'custom-popup' }).openPopup();

      },
    });
  };

  const style = (feature) => {
    return {
      fillColor: selectedFinca && selectedFinca.GeoJson.features.some((f) => f.properties.id === feature.properties.id) ? "yellow" : "blue",
      weight: 2,
      opacity: 3,
      color: "red",
      fillOpacity: 0.3,
    };
  };

  const descargarGeoJson = () => {
    console.log("descarga");
    const geoJsonString = JSON.stringify(despacho.GeoJson, null, 2);
    // Crear un Blob con el contenido JSON
    const blob = new Blob([geoJsonString], { type: "application/json" });
    // Crear un enlace de descarga
    const url = URL.createObjectURL(blob);
    // Crear un elemento <a> para la descarga
    const a = document.createElement("a");
    a.href = url;
    a.download = `${despacho.SerieOrden}-${despacho.NumeroOrden}.geojson`; // Nombre del archivo a descargar
    // Añadir el elemento al DOM y hacer clic en él
    document.body.appendChild(a);
    a.click();
    // Limpiar el DOM
    document.body.removeChild(a);
    // Liberar el objeto URL
    URL.revokeObjectURL(url);
  };

  const descargarGeoJsonFinca = (finca) => {
    console.log("descarga");
    const geoJsonString = JSON.stringify(finca.GeoJson, null, 2);
    // Crear un Blob con el contenido JSON
    const blob = new Blob([geoJsonString], { type: "application/json" });
    // Crear un enlace de descarga
    const url = URL.createObjectURL(blob);
    // Crear un elemento <a> para la descarga
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finca.NombreFinca}-${finca.CodigoFinca}.geojson`; // Nombre del archivo a descargar
    // Añadir el elemento al DOM y hacer clic en él
    document.body.appendChild(a);
    a.click();
    // Limpiar el DOM
    document.body.removeChild(a);
    // Liberar el objeto URL
    URL.revokeObjectURL(url);
  };

  const DropdownMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleMenu = () => {
      setIsOpen(!isOpen);
    };

    return (
      <div className="map-dropdown">
        <button onClick={toggleMenu} className="map-dropdown-button">
          Options
        </button>
        {isOpen && (
          <div className="map-dropdown-menu">
            <ul className="list-group">
              <li className="list-group-item">
                <h5>Farmers List</h5>
              </li>
              {despacho.Fincas.map((finca, index) => (
                <li className={`list-group-item ${selectedFinca && finca.CodigoFinca === selectedFinca.CodigoFinca ? "bg-success text-white" : ""}`} key={index} onClick={() => handleFincaClick(finca)}>
                  {finca.NombreFinca}
                </li>
              ))}
              <li className="list-group-item">
                <button className="btn btn-link" onClick={descargarGeoJson}>
                  Download Shipping Order GeoJson
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  const DropdownMenuControl = () => {
    const map = useMap();
    const containerRef = useRef(null);

    useEffect(() => {
      // Crear el control personalizado
      const dropdownControl = L.Control.extend({
        options: {
          position: "topright",
        },
        onAdd: function () {
          const container = L.DomUtil.create("div", "leaflet-control");
          containerRef.current = container;
          return container;
        },
      });

      // Añadir el control al mapa
      const control = new dropdownControl();
      map.addControl(control);

      if (containerRef.current) {
        const root = ReactDOM.createRoot(containerRef.current);
        root.render(<DropdownMenu />);
      }

      // Cleanup on unmount
      return () => {
        if (containerRef.current) {
          const root = ReactDOM.createRoot(containerRef.current);
          root.unmount();
        }
        map.removeControl(control);
      };
    }, [map]);

    return null;
  };

  return (
    <div className="w-100">
      {despacho && (
        <div className="card p-0 mb-2">
          <div className="card-header bg-white border-0 m-0 p-0">
            <h3>EUDR Report</h3>
            <p className="m-0">
              Shipping Order: {despacho.SerieOrden}-{despacho.NumeroOrden}
            </p>
            <p className="m-0">Date: {despacho.Fecha}</p>
            <p className="m-0">
              Invoice Number: {despacho.SerieFactura}-{despacho.NumeroFactura}
            </p>
            <p className="m-0">{despacho.Cantidad} Kg.</p>
            <p className="mt-0 mb-2">{despacho.Cliente}</p>
          </div>
        </div>
      )}
      <div className="row">
        <div className="col">
          <MapContainer center={center} style={{ height: "100vh", width: "100%" }} ref={mapRef}>
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
              opacity={0.5} // Cambia el valor de opacidad para ajustar la transparencia
            />

            {geoJsonData && despacho && despacho.Fincas && <GeoJSON data={geoJsonData} style={style} onEachFeature={onEachFeature} />}
            <DropdownMenuControl />
          </MapContainer>
        </div>
        <div className="col-md-6 hide-on-small">
          {despacho && despacho.Fincas && (
            <div className="card">
              <div className="card-header bg-white border-0">
                <h3>Farmers List</h3>
              </div>
              <div className="card-body">
                <ul className="list-group">
                  {despacho.Fincas.map((finca, index) => (
                    <li className={`list-group-item ${selectedFinca && finca.CodigoFinca === selectedFinca.CodigoFinca ? "bg-success text-white" : ""}`} key={index} onClick={() => handleFincaClick(finca)}>
                      {finca.NombreFinca}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-footer bg-white border-0">
                <button className="mb-2 btn btn-primary" onClick={descargarGeoJson}>
                  Download Shipping Order GeoJson
                </button>
              </div>
            </div>
          )}

          {selectedFinca && (
            <div className="card mt-2">
              <div className="card-header">
                <h4 className="mb-2">{selectedFinca.NombreFinca}</h4>
              </div>
              <div className="card-body">
                <p className="m-0">{selectedFinca.Cantidad} Kg.</p>
              </div>
              <div className="card-footer">
                <button className="m-2 btn btn-primary" onClick={descargarGeoJsonFinca}>
                  Download Farmer GeoJson
                </button>
                <button className="m-2 btn btn-primary" onClick={descargarGeoJson}>
                  View InCompliance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
