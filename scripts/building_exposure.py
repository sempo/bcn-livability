#!/usr/bin/env python3
"""
Per-building noise by facade, river and street flooding, and wildfire exposure (TODO-046, stage 2).

Inputs:
  data/buildings/buildings.gpkg     residential buildings + entrances        scripts/prepare_buildings.py
  data/buildings/raw/BU.*.zip       all Catastro buildings (walls shared with neighbours)
  data/buildings/blocks.gpkg        city blocks (MANZANA): street vs courtyard side
  data/noise/…                      Barcelona rasters 2022 (2 m), SICA agglomeration maps 2022 (5 dB bands),
                                    Barcelona per-facade map 2017            scripts/fetch_exposure_sources.py
  data/climate-risk/                ACA flood zones, RESCCUE depths, WUI, forest hazard  scripts/fetch_climate_risk.py

Output: data/buildings/exposure.gpkg, EPSG:25831
  facades   one point per building × side (street | inner) × 8-way direction the facade faces: the measurement
            point next to the facade, mean Lden / Ld / Le / Ln, facade length
  exposure  one row per building, no geometry: noise summary, 2017 facade map, river zone, water depth at the
            door, wildfire

Noise: samples every NOISE_SAMPLE_SPACING_M on a ring NOISE_RING_M outside each footprint. Samples inside any
building (a wall shared with a neighbour) are dropped; inside a city block → courtyard side, else street side.

Run (the venv has x86_64 wheels):
  arch -x86_64 .venv-livability/bin/python scripts/building_exposure.py
"""

import io
import os
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import pyogrio
import shapely
from shapely import STRtree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from climate_risk import (  # noqa: E402
    FIRE_DECAY_M, FIRE_GPKG, FIRE_SEARCH_RADIUS_M, FLOOD_GPKG, FLOOD_LAYERS, STREET_LAYERS, WUI_LAYER,
    _read_union, load_forest, load_street_elements, pixel_hazard,
)
from fetch_exposure_sources import (  # noqa: E402
    BCN, BCN_FACADES, BCN_RASTERS, BLOCKS_GPKG, NOISE_DIR, NOISE_MUNIS, SICA_AGGLOMERATIONS, SICA_DIR,
)
from prepare_buildings import OUT_GPKG as BUILDINGS_GPKG  # noqa: E402
from prepare_buildings import RAW_DIR, read  # noqa: E402

OUT_GPKG = BUILDINGS_GPKG.parent / "exposure.gpkg"
CRS = "EPSG:25831"

NOISE_RING_M = float(os.environ.get("NOISE_RING_M", "3"))  # how far outside the wall noise is read
NOISE_SAMPLE_SPACING_M = float(os.environ.get("NOISE_SAMPLE_SPACING_M", "2"))
NOISE_MIN_FACADE_M = float(os.environ.get("NOISE_MIN_FACADE_M", "4"))  # shorter facade groups = ring corners
STREET_FLOOD_DOOR_RADIUS_M = float(os.environ.get("STREET_FLOOD_DOOR_RADIUS_M", "5"))
# A SICA sample with Lden up to this but no band for another period is below that period's lowest band
SICA_QUIET_LDEN_MAX = float(os.environ.get("SICA_QUIET_LDEN_MAX", "47.5"))

LEVELS = ["lden", "ld", "le", "ln"]
# field → (Barcelona raster period, SICA layer period)
PERIODS = {"lden": ("Lden", "Lden"), "ld": ("Dia", "Lday"), "le": ("Vespre", "Levening"), "ln": ("Nit", "Lnight")}
COMPASS = np.array(["N", "NE", "E", "SE", "S", "SW", "W", "NW"])


# ── Noise ────────────────────────────────────────────────────────────────────
def ring_points(geoms, distance_m, spacing_m):
    """Points every spacing_m on a ring distance_m outside each footprint (courtyards included).

    Returns (idx, xs, ys); idx is the footprint's position in geoms.
    """
    rings = shapely.boundary(shapely.buffer(geoms, distance_m, join_style="mitre"))
    parts, owner = shapely.get_parts(rings, return_index=True)
    n = (shapely.length(parts) // spacing_m).astype(int)
    line = np.repeat(np.arange(len(parts)), n)
    dist = (np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)) * spacing_m
    xy = shapely.get_coordinates(shapely.line_interpolate_point(parts[line], dist))
    return owner[line], xy[:, 0], xy[:, 1]


def compass8(dx, dy):
    """Direction a facade faces (outward vector) → N, NE, …: 45° sectors centred on each."""
    azimuth = np.degrees(np.arctan2(dx, dy)) % 360
    return COMPASS[((azimuth + 22.5) // 45).astype(int) % 8]


def sample_grid(xs, ys, grid, x0, y0, pixel):
    """Value of the pixel under each point; NaN outside the grid and on building / nodata pixels."""
    col = np.floor((np.asarray(xs) - x0) / pixel).astype(int)
    row = np.floor((y0 - np.asarray(ys)) / pixel).astype(int)
    ok = (col >= 0) & (row >= 0) & (col < grid.shape[1]) & (row < grid.shape[0])
    v = np.full(len(col), np.nan)
    v[ok] = grid[row[ok], col[ok]]
    v[(v <= 0) | (v > 200)] = np.nan
    return v


def band_mid(category):
    """END band name → midpoint in dB: Lden5559 → 57.5, LdenGreaterThan75 / LdenThan75 → 77.5, …LowerThan40 → 37.5."""
    digits = re.findall(r"\d+", category)[-1]
    if "LowerThan" in category:
        return int(digits) - 2.5
    if len(digits) == 4:
        return (int(digits[:2]) + int(digits[2:]) + 1) / 2
    return int(digits) + 2.5


def classify_points(xs, ys, walls, blocks):
    """keep: not inside any building (a wall shared with a neighbour); inner: inside a city block (courtyard)."""
    pts = shapely.points(xs, ys)
    keep = np.ones(len(pts), bool)
    keep[STRtree(walls).query(pts, predicate="within")[0]] = False
    inner = np.zeros(len(pts), bool)
    inner[STRtree(blocks).query(pts, predicate="within")[0]] = True
    return keep, inner


def facade_groups(points, spacing_m=NOISE_SAMPLE_SPACING_M, min_length_m=NOISE_MIN_FACADE_M):
    """One row per building × side × direction: mean levels, facade length and the measurement point.

    The measurement point is the sample closest to the group's centre, so it sits next to the facade.
    Groups shorter than min_length_m (ring corners) are dropped; their samples still count in building_noise.
    """
    keys = ["id", "side", "dir"]
    g = points.groupby(keys, sort=False)
    d2 = (points["x"] - g["x"].transform("mean")) ** 2 + (points["y"] - g["y"].transform("mean")) ** 2
    rep = points.loc[d2.groupby([points[k] for k in keys], sort=False).idxmin(), keys + ["x", "y"]]
    stats = g.agg(**{k: (k, "mean") for k in LEVELS}, n=("x", "size")).reset_index()
    stats["length_m"] = stats.pop("n") * spacing_m
    out = stats.merge(rep, on=keys)
    return out[out["length_m"] >= min_length_m].reset_index(drop=True)


def building_noise(points, groups):
    """Per building: mean over every sample (= weighted by facade length), overall and per side;
    loudest and quietest facade group."""
    out = points.groupby("id")[["lden", "ln"]].mean().add_suffix("_avg")
    for side in ("street", "inner"):
        out = out.join(points[points["side"] == side].groupby("id")[["lden", "ln"]].mean().add_suffix(f"_{side}"))
    g = groups.groupby("id")[["lden", "ln"]]
    return out.join(g.max().add_suffix("_max")).join(g.min().add_suffix("_min"))


def load_bcn_grid(name, tmp):
    """Barcelona noise raster → (memmap grid, x0, y0, pixel) through an EHdr copy in tmp."""
    bil = os.path.join(tmp, f"{name}.bil")
    subprocess.run(["gdal_translate", "-q", "-of", "EHdr", str(NOISE_DIR / name), bil], check=True)
    with open(bil[:-4] + ".hdr") as f:
        hdr = dict(line.split()[:2] for line in f if line.strip())
    px = float(hdr["XDIM"])
    grid = np.memmap(bil, dtype="<f4" if hdr.get("BYTEORDER", "I") == "I" else ">f4", mode="r",
                     shape=(int(hdr["NROWS"]), int(hdr["NCOLS"])))
    return grid, float(hdr["ULXMAP"]) - px / 2, float(hdr["ULYMAP"]) + px / 2, px


def valid_polygons(geoms):
    """Possibly invalid areas → (polygons, index of the source geometry). Collapsed slivers are dropped.

    Some SICA deliveries are invalid; a plain make_valid returns collections that hide multipolygons.
    """
    fixed = shapely.make_valid(np.asarray(geoms), method="structure", keep_collapsed=False)
    return shapely.get_parts(fixed, return_index=True)


def sica_bands(gpkg_bytes, period):
    """Agglomeration contours (all sources) for one period: polygons with the band midpoint, EPSG:25831."""
    c = pyogrio.read_dataframe(io.BytesIO(gpkg_bytes), layer=f"NoiseContours_allSourcesInAgglomeration_{period}",
                               columns=["category"]).to_crs(CRS)
    polygons, idx = valid_polygons(c.geometry.values)
    return polygons, c["category"].map(band_mid).values[idx]


def fill_below_lowest_band(points, sica, quiet_lden_max=SICA_QUIET_LDEN_MAX):
    """SICA maps leave out levels below their lowest band, and that band differs by period: a quiet courtyard
    can sit in the Lden 40–44 band with no night band at all. Such samples get the '< 40 dB' midpoint.

    Only quiet samples (Lden ≤ quiet_lden_max) are filled; a gap next to a loud street stays missing.
    """
    quiet = sica & (points["lden"] <= quiet_lden_max)
    for col in ("ld", "le", "ln"):
        points.loc[quiet & points[col].isna(), col] = band_mid("LnightLowerThan40")
    return points


def sample_bands(xs, ys, polygons, db):
    v = np.full(len(xs), np.nan)
    pt, poly = STRtree(polygons).query(shapely.points(xs, ys), predicate="within")
    v[pt] = db[poly]
    return v


def all_footprints(codes):
    return np.concatenate([read(RAW_DIR / f"BU.{c}.zip", "building.gml", columns=[]).to_crs(CRS).geometry.values
                           for c in codes])


def noise(buildings):
    """(facade groups, per-building summary) for the buildings of municipalities with a noise map."""
    nb = buildings[buildings["muni"].isin(NOISE_MUNIS)].reset_index(drop=True)
    print(f"Noise: {len(nb):,} buildings in {len(NOISE_MUNIS)} municipalities with a map…")
    idx, xs, ys = ring_points(nb.geometry.values, NOISE_RING_M, NOISE_SAMPLE_SPACING_M)
    keep, inner = classify_points(xs, ys, all_footprints(NOISE_MUNIS),
                                  gpd.read_file(BLOCKS_GPKG, layer="blocks").geometry.values)
    idx, xs, ys, inner = idx[keep], xs[keep], ys[keep], inner[keep]
    print(f"   {len(xs):,} samples outside walls ({(~keep).mean():.0%} dropped), {inner.mean():.0%} courtyard side")

    ends = shapely.get_coordinates(shapely.shortest_line(nb.geometry.values[idx], shapely.points(xs, ys)))
    ends = ends.reshape(-1, 2, 2)  # footprint → sample
    pts = pd.DataFrame({
        "id": nb["id"].values[idx], "muni": nb["muni"].values[idx], "side": np.where(inner, "inner", "street"),
        "dir": compass8(ends[:, 1, 0] - ends[:, 0, 0], ends[:, 1, 1] - ends[:, 0, 1]), "x": xs, "y": ys,
    })
    for col in LEVELS:
        pts[col] = np.nan

    bcn = (pts["muni"] == BCN).values
    with tempfile.TemporaryDirectory() as tmp:
        for col, (period, _) in PERIODS.items():
            print(f"   Barcelona raster {period}…")
            grid, x0, y0, px = load_bcn_grid(BCN_RASTERS[period], tmp)
            pts.loc[bcn, col] = sample_grid(xs[bcn], ys[bcn], grid, x0, y0, px)
            del grid
    for name, codes in SICA_AGGLOMERATIONS.items():
        print(f"   SICA {name}…")
        m = pts["muni"].isin(codes).values
        with zipfile.ZipFile(SICA_DIR / f"{name}.zip") as z:
            gpkg = z.read(next(n for n in z.namelist() if n.lower().endswith(".gpkg")))
        for col, (_, period) in PERIODS.items():
            pts.loc[m, col] = sample_bands(xs[m], ys[m], *sica_bands(gpkg, period))

    pts = fill_below_lowest_band(pts, ~bcn).dropna(subset=["lden"])
    groups = facade_groups(pts)
    summary = building_noise(pts, groups)
    summary["noise_src"] = np.where(summary.index.isin(pts.loc[pts["muni"] == BCN, "id"]), "bcn_raster_2022",
                                    "sica_2022")
    return groups, summary


def facades_2017():
    """Barcelona per-facade map 2017 by building: loudest facade (Lden, night) and loudest night leisure noise."""
    f = pyogrio.read_dataframe(NOISE_DIR / BCN_FACADES, read_geometry=False,
                               columns=["ref_cadastral", "Total_Lden", "Total_Ln", "Oci_Ln"])
    return f.groupby("ref_cadastral").agg(f17_lden_max=("Total_Lden", "max"), f17_ln_max=("Total_Ln", "max"),
                                          f17_leisure_ln_max=("Oci_Ln", "max"))


# ── Flooding and wildfire ────────────────────────────────────────────────────
def river_zone(footprints, zones):
    """Most frequent ACA flood zone each footprint touches: 10, 100, 500, or None."""
    out = np.full(len(footprints), None, dtype=object)
    for key, years in (("t500", 500), ("t100", 100), ("t10", 10)):  # more frequent zones overwrite rarer ones
        if zones.get(key) is not None:
            out[shapely.intersects(zones[key], footprints)] = years
    return out


def door_probes(buildings, entrances, radius_m):
    """Where to look for water: a circle around each entrance; the footprint plus a ring when there is none."""
    doors = entrances[entrances["id"].isin(buildings["id"])]
    rest = buildings[~buildings["id"].isin(doors["id"])]
    return pd.concat([
        gpd.GeoDataFrame({"id": doors["id"].values}, geometry=doors.buffer(radius_m).values, crs=entrances.crs),
        gpd.GeoDataFrame({"id": rest["id"].values}, geometry=rest.buffer(radius_m).values, crs=buildings.crs),
    ], ignore_index=True)


def street_elements(elements, blocks):
    """RESCCUE mesh elements in public space. Elements inside city blocks (courtyards, sunken patios, often closed
    hollows several metres deep in the model) are not street water at the door."""
    inside = np.zeros(len(elements), bool)
    inside[STRtree(blocks).query(elements.centroid.values, predicate="within")[0]] = True
    return elements[~inside]


def max_depth_cm(probes, elements, ids):
    """Deepest modelled water (cm) touching each building's probes; 0 when dry."""
    hits = gpd.sjoin(probes, elements[["depth2d", "geometry"]], predicate="intersects")
    deepest = hits.groupby("id")["depth2d"].max()
    return (deepest.reindex(pd.Index(ids, name="id")).fillna(0) * 100).round().astype(int)


def hazards(buildings, entrances):
    margin = FIRE_SEARCH_RADIUS_M + 500
    minx, miny, maxx, maxy = buildings.total_bounds
    bounds = (minx - margin, miny - margin, maxx + margin, maxy + margin)
    fp = buildings.geometry.values
    out = pd.DataFrame(index=pd.Index(buildings["id"].values, name="id"))

    print("River flood zones…")
    zones = {k: _read_union(FLOOD_GPKG, layer, bounds) for k, layer in FLOOD_LAYERS.items()}
    for z in zones.values():
        if z is not None:
            shapely.prepare(z)
    out["river_zone"] = pd.array(river_zone(fp, zones), dtype="Int64")

    print("Wildfire…")
    wui = _read_union(FIRE_GPKG, WUI_LAYER, bounds)
    shapely.prepare(wui)
    out["fire_wui"] = shapely.intersects(wui, fp).astype(int)
    forest = load_forest(bounds)
    c = buildings.centroid
    fire = [pixel_hazard(x, y, forest, FIRE_SEARCH_RADIUS_M, FIRE_DECAY_M) for x, y in zip(c.x, c.y)]
    out["fire_hazard"] = [round(v, 3) for v, _, _ in fire]
    out["fire_class"] = pd.array([k for _, k, _ in fire], dtype="Int64")
    out["fire_dist_m"] = pd.array([None if d is None else round(d) for _, _, d in fire], dtype="Int64")

    print("Street flooding (Barcelona)…")
    bcn = buildings[buildings["muni"] == BCN]
    probes = door_probes(bcn, entrances, STREET_FLOOD_DOOR_RADIUS_M)
    blocks = gpd.read_file(BLOCKS_GPKG, layer="blocks").geometry.values
    for rp in STREET_LAYERS:
        water = street_elements(load_street_elements(rp), blocks)
        out[f"street_{rp}_cm"] = pd.array(out.index.map(max_depth_cm(probes, water, bcn["id"])), dtype="Int64")
    return out


def main():
    buildings = gpd.read_file(BUILDINGS_GPKG, layer="buildings", columns=["id", "muni"])
    entrances = gpd.read_file(BUILDINGS_GPKG, layer="entrances", columns=["id"])

    groups, summary = noise(buildings)
    exposure = hazards(buildings, entrances).join(summary.round(1)).join(facades_2017())

    OUT_GPKG.unlink(missing_ok=True)
    groups[LEVELS] = groups[LEVELS].round(1)
    gpd.GeoDataFrame(groups.drop(columns=["x", "y"]), geometry=shapely.points(groups["x"], groups["y"]),
                     crs=CRS).to_file(OUT_GPKG, layer="facades", driver="GPKG")
    pyogrio.write_dataframe(exposure.reset_index(), OUT_GPKG, layer="exposure", driver="GPKG")

    e = exposure
    print(f"→ {OUT_GPKG.relative_to(Path(__file__).parent.parent)}: {len(groups):,} facades, {len(e):,} buildings")
    print(f"   noise: {e['lden_avg'].notna().sum():,} buildings, sources {e['noise_src'].value_counts().to_dict()}")
    print("   lden avg / street / inner (median):",
          [round(e[c].median(), 1) for c in ("lden_avg", "lden_street", "lden_inner")])
    print("   river zone:", e["river_zone"].value_counts().sort_index().to_dict())
    print(f"   WUI: {e['fire_wui'].sum():,}")
    for rp in STREET_LAYERS:
        d = e[f"street_{rp}_cm"].dropna()
        print(f"   street {rp}: ≥10 cm {(d >= 10).mean():.1%}, ≥30 cm {(d >= 30).mean():.1%}, "
              f"≥50 cm {(d >= 50).mean():.1%} of {len(d):,}")


if __name__ == "__main__":
    main()
