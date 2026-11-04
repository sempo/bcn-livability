#!/usr/bin/env python3
"""
Climate-risk inputs and view-layer tiles (features 036, 037).

Hazard helpers for scripts/building_exposure.py (TODO-046: river zone, wildfire and water at the door per
building): forest pixels of the Generalitat wildfire hazard 2024 (classes 1–10) and pixel_hazard =
max_px(class/10 · exp(−d/FIRE_DECAY_M)) within FIRE_SEARCH_RADIUS_M, flood / WUI zones, RESCCUE street water.
Risk scores and penalties are computed in the frontend (src/services/climateRisk/climateRisk.ts).

Builds the view layers over the buildings' extent (data/buildings/buildings.gpkg):
  frontend/public/data/flood-zones.pmtiles — source-layer `flood` (prop `zone`: t10 | t100 | t500)
  frontend/public/data/wildfire.pmtiles    — source-layers `hazard` (prop `class` 1–10) and `wui`
  frontend/public/data/street-flooding.pmtiles — source-layer `street` (props `rp`: t10 | t100, `class` 1–3)

Inputs come from scripts/fetch_climate_risk.py (data/climate-risk/, gitignored).
All geometry work is done in EPSG:25831 (metres).

Requirements: gdal (gdal_translate), tippecanoe; pip install shapely geopandas numpy pyogrio
  arch -x86_64 .venv-livability/bin/python scripts/climate_risk.py   # rebuild the view-layer tiles
  arch -x86_64 .venv-livability/bin/python -m unittest scripts/test_climate_risk.py
"""

import os
import subprocess
import sys
import tempfile
from dataclasses import dataclass

import numpy as np
from shapely.geometry import Point, box
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FLOOD_TILES_OUT = os.path.join(ROOT, "frontend/public/data/flood-zones.pmtiles")
WILDFIRE_TILES_OUT = os.path.join(ROOT, "frontend/public/data/wildfire.pmtiles")
STREET_TILES_OUT = os.path.join(ROOT, "frontend/public/data/street-flooding.pmtiles")

CLIMATE_RISK_DIR = os.path.join(ROOT, os.environ.get("CLIMATE_RISK_DIR", "data/climate-risk"))
FLOOD_GPKG = os.path.join(CLIMATE_RISK_DIR, "flood_catalonia.gpkg")
FIRE_GPKG = os.path.join(CLIMATE_RISK_DIR, "fire_catalonia.gpkg")
FIRE_TIF = os.path.join(CLIMATE_RISK_DIR, "fire_hazard_2024.tif")
BCN_GPKG = os.path.join(CLIMATE_RISK_DIR, "flood_bcn.gpkg")  # RESCCUE depths

FLOOD_LAYERS = {"t10": "aca_flood_zone_t10", "t100": "aca_flood_zone_t100", "t500": "aca_flood_zone_t500"}
WUI_LAYER = "pcivil_fire_wui_zone"
STREET_LAYERS = {"t10": "bcn_resccue_depth_t10_current", "t100": "bcn_resccue_depth_t100_current"}

FIRE_SEARCH_RADIUS_M = float(os.environ.get("FIRE_SEARCH_RADIUS_M", "500"))
FIRE_DECAY_M = float(os.environ.get("FIRE_DECAY_M", "150"))
# Street-flooding view classes (037): MIN–0.30 m, 0.30–MAX, ≥ MAX (kerb ~15 cm; cars float ~50 cm).
STREET_FLOOD_MIN_DEPTH_M = float(os.environ.get("STREET_FLOOD_MIN_DEPTH_M", "0.10"))
STREET_FLOOD_MAX_DEPTH_M = float(os.environ.get("STREET_FLOOD_MAX_DEPTH_M", "0.50"))
STREET_CLASS_MID_M = 0.30
# Margin around the buildings for the view layers: every forest pixel that can reach a building is drawn.
CLIP_MARGIN_M = FIRE_SEARCH_RADIUS_M + 500


# ── Wildfire ─────────────────────────────────────────────────────────────────
@dataclass
class Forest:
    tree: STRtree
    xs: np.ndarray
    ys: np.ndarray
    classes: np.ndarray


def make_forest(points_xy, classes):
    """Forest pixel centres (metric x, y) with hazard class 1–10, indexed for radius queries."""
    xs = np.array([p[0] for p in points_xy], dtype=float)
    ys = np.array([p[1] for p in points_xy], dtype=float)
    return Forest(STRtree([Point(x, y) for x, y in points_xy]), xs, ys, np.array(classes, dtype=int))


def pixel_hazard(x, y, forest, radius_m, decay_m):
    """Strongest distance-decayed hazard class/10 · exp(−d/decay) within radius → (value, class, dist)."""
    if len(forest.classes) == 0:
        return 0.0, None, None
    idx = forest.tree.query(Point(x, y).buffer(radius_m, quad_segs=4))
    if len(idx) == 0:
        return 0.0, None, None
    d = np.hypot(forest.xs[idx] - x, forest.ys[idx] - y)
    ok = d <= radius_m
    if not ok.any():
        return 0.0, None, None
    idx, d = idx[ok], d[ok]
    contrib = forest.classes[idx] / 10.0 * np.exp(-d / decay_m)
    best = int(np.argmax(contrib))
    return float(contrib[best]), int(forest.classes[idx[best]]), float(d[best])


def forest_polygons(forest, pixel_m=100):
    """Forest pixels → one dissolved (Multi)Polygon per hazard class: [(class, geometry)].

    Pure-shapely replacement for gdal_polygonize (GDAL Python bindings are not installed here).
    """
    half = pixel_m / 2
    out = []
    for cls in sorted(set(int(c) for c in forest.classes)):
        m = forest.classes == cls
        squares = [box(x - half, y - half, x + half, y + half) for x, y in zip(forest.xs[m], forest.ys[m])]
        out.append((cls, unary_union(squares)))
    return out


# ── Street flooding (RESCCUE, feature 037) ──────────────────────────────────
def depth_class(depths):
    """View-layer depth class: 0 below MIN (dropped), 1 MIN–0.30 m, 2 0.30–MAX, 3 ≥ MAX."""
    return np.digitize(np.asarray(depths, dtype=float),
                       [STREET_FLOOD_MIN_DEPTH_M, STREET_CLASS_MID_M, STREET_FLOOD_MAX_DEPTH_M])


def load_street_elements(rp):
    """RESCCUE wet mesh elements for a return period, EPSG:25831 (depth2d, area2d, geometry)."""
    import geopandas as gpd

    return gpd.read_file(BCN_GPKG, layer=STREET_LAYERS[rp], columns=["area2d", "depth2d"]).to_crs(25831)


# ── Inputs ───────────────────────────────────────────────────────────────────
def _read_union(gpkg, layer, bounds):
    import geopandas as gpd

    gdf = gpd.read_file(gpkg, layer=layer, bbox=bounds).to_crs(25831)
    return gdf.geometry.union_all() if len(gdf) else None


def _clip_raster(bounds, dst):
    minx, miny, maxx, maxy = bounds
    subprocess.run(["gdal_translate", "-q", "-projwin", str(minx), str(maxy), str(maxx), str(miny),
                    FIRE_TIF, dst], check=True)


def load_forest(bounds):
    """Forest pixel centres (class 1–10) of the hazard raster within bounds."""
    with tempfile.TemporaryDirectory() as tmp:
        clip = os.path.join(tmp, "clip.tif")
        _clip_raster(bounds, clip)
        out = subprocess.run(["gdal_translate", "-q", "-of", "XYZ", clip, "/vsistdout/"],
                             check=True, capture_output=True, text=True).stdout
    pts, classes = [], []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) != 3:
            continue
        v = int(float(parts[2]))
        if 1 <= v <= 10:
            pts.append((float(parts[0]), float(parts[1])))
            classes.append(v)
    return make_forest(pts, classes)


# ── View layers (PMTiles) ────────────────────────────────────────────────────
def _write_geojson(gdf, path):
    gdf.to_crs(4326).to_file(path, driver="GeoJSON")


def build_view_tiles(bounds):
    """Flood zones, wildfire hazard/WUI and street flooding within bounds (EPSG:25831) → PMTiles for the map."""
    import geopandas as gpd
    import pandas as pd

    with tempfile.TemporaryDirectory() as tmp:
        print("Building flood-zones.pmtiles…")
        parts = []
        for key, layer in FLOOD_LAYERS.items():
            gdf = gpd.read_file(FLOOD_GPKG, layer=layer, bbox=bounds).to_crs(25831)
            if len(gdf):
                g = gdf.geometry.union_all().simplify(5)
                parts.append(gpd.GeoDataFrame({"zone": [key]}, geometry=[g], crs=25831))
        flood = gpd.GeoDataFrame(pd.concat(parts, ignore_index=True), crs=25831).explode(index_parts=False)
        flood_json = os.path.join(tmp, "flood.geojson")
        _write_geojson(flood, flood_json)
        _tippecanoe(FLOOD_TILES_OUT, [("flood", flood_json)])

        print("Building wildfire.pmtiles…")
        polys = forest_polygons(load_forest(bounds))
        hz = gpd.GeoDataFrame({"class": [c for c, _ in polys]}, geometry=[g for _, g in polys], crs=25831)
        hz = hz.explode(index_parts=False)
        hazard_json = os.path.join(tmp, "hazard.geojson")
        _write_geojson(hz[["class", "geometry"]], hazard_json)
        wui = gpd.read_file(FIRE_GPKG, layer=WUI_LAYER, bbox=bounds).to_crs(25831)
        wui = gpd.GeoDataFrame(geometry=[wui.geometry.union_all().simplify(5)], crs=25831).explode(index_parts=False)
        wui_json = os.path.join(tmp, "wui.geojson")
        _write_geojson(wui, wui_json)
        _tippecanoe(WILDFIRE_TILES_OUT, [("hazard", hazard_json), ("wui", wui_json)])

        print("Building street-flooding.pmtiles…")
        parts = []
        for rp in STREET_LAYERS:
            el = load_street_elements(rp)
            el["class"] = depth_class(el["depth2d"].values)
            el = el[el["class"] > 0].dissolve(by="class", as_index=False)
            el["rp"] = rp
            el["geometry"] = el.geometry.simplify(1)
            parts.append(el[["rp", "class", "geometry"]])
        street = gpd.GeoDataFrame(pd.concat(parts, ignore_index=True), crs=25831).explode(index_parts=False)
        street_json = os.path.join(tmp, "street.geojson")
        _write_geojson(street, street_json)
        _tippecanoe(STREET_TILES_OUT, [("street", street_json)])


def _tippecanoe(out, layers):
    cmd = ["tippecanoe", "--output", out, "--minimum-zoom", "9", "--maximum-zoom", "15", "--force",
           "--no-tile-size-limit", "--detect-shared-borders"]
    for name, path in layers:
        cmd += ["-L", f"{name}:{path}"]
    subprocess.run(cmd, check=True, capture_output=True)
    print(f"   -> {os.path.basename(out)} ({os.path.getsize(out) // 1024} KB)")


def main():
    import pyogrio
    from prepare_buildings import OUT_GPKG as BUILDINGS_GPKG

    if not BUILDINGS_GPKG.exists():
        sys.exit(f"Buildings not found: {BUILDINGS_GPKG} — run scripts/prepare_buildings.py first")
    minx, miny, maxx, maxy = pyogrio.read_info(BUILDINGS_GPKG, layer="buildings", force_total_bounds=True)["total_bounds"]
    m = CLIP_MARGIN_M
    build_view_tiles((minx - m, miny - m, maxx + m, maxy + m))


if __name__ == "__main__":
    main()
