#!/usr/bin/env python3
"""
Download the sources for per-building noise exposure (TODO-046, stage 2).

  data/noise/                  Barcelona strategic noise map 2022 — Total Lden / Dia / Vespre / Nit rasters
                               (2 m, float32, EPSG:25831) and the 2017 per-facade map (validation).
                               Open Data BCN, CC-BY-4.0.
  data/noise/sica/             SICA (MITECO) 4th-round (2022) END deliveries: agglomeration maps around
                               Barcelona + corridor maps (roads, railways, airports). Original GeoPackages.
  data/buildings/raw/CP.*.zip  Catastro INSPIRE cadastral parcels for the municipalities with a noise map
  data/buildings/blocks.gpkg   city blocks (CadastralZoning 'MANZANA') of those municipalities, EPSG:25831

Run (the venv has x86_64 wheels; downloads are cached, --force downloads again):
  arch -x86_64 .venv-livability/bin/python scripts/fetch_exposure_sources.py [--force]
"""

import argparse
import base64
import binascii
import html
import os
import re
import ssl
import sys
from pathlib import Path

import certifi
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_climate_risk import CKAN_API, TIMEOUT, download, session  # noqa: E402
from prepare_buildings import RAW_DIR, feed_urls, read  # noqa: E402

ROOT = Path(__file__).parent.parent
NOISE_DIR = ROOT / "data" / "noise"
SICA_DIR = NOISE_DIR / "sica"
BLOCKS_GPKG = ROOT / "data" / "buildings" / "blocks.gpkg"

BCN = "08900"
BCN_RASTERS = {p: f"2022_Raster_Total_{p}_Mapa_Estrategic_Soroll_BCN.gpkg" for p in ("Lden", "Dia", "Vespre", "Nit")}
BCN_FACADES = "2017_Facanes_Mapa_Estrategic_Soroll_BCN.gpkg"

SICA_PAGE = "https://sicaweb.miteco.gob.es/datos-geoespaciales/4a-fase/"
# The SICA servers don't send their intermediate certificate; this is the URL from the certificate's AIA field.
# The intermediate is still verified against the FNMT root in certifi.
FNMT_INTERMEDIATE = "http://www.cert.fnmt.es/certs/ACCOMP.crt"
CA_BUNDLE = SICA_DIR / "ca-bundle.pem"

# Agglomeration maps (all sources, full coverage) → Catastro codes of the municipalities they cover.
SICA_AGGLOMERATIONS = {
    "Aglomeració de l'Hospitalet": ["08100"],
    "Aglomeració del Baix Llobregat I": ["08072", "08076", "08210", "08216", "08219"],
    "Aglomeració del Baix Llobregat II": ["08088", "08199", "08302"],
    "Barcelonès": ["08015", "08193", "08245"],
    "Aglomeració del Vallès Occidental I": ["08252", "08312"],
}
# Corridor maps (major roads, railways, airports): shown for reference, not used for scores.
SICA_CORRIDORS = [
    "Carreteras del Estado de Barcelona",
    "Diputación de Barcelona",
    "Generalitat de Catalunya",
    "del Estado (MITMA DGPF ADIF)",
    "Ferrocarrils de la Generalitat de Catalunya (FGC)",
    "Ferrocarrils Metropolitans de Barcelona",
    "Dirección General de Aviación Civil",
]
NOISE_MUNIS = [BCN] + [c for codes in SICA_AGGLOMERATIONS.values() for c in codes]

CP_FEED = "http://www.catastro.hacienda.gob.es/INSPIRE/CadastralParcels/08/ES.SDGC.CP.atom_08.xml"


def ckan_file(dataset, name):
    pkg = session.get(CKAN_API, params={"id": dataset}, timeout=TIMEOUT).json()["result"]
    return next(r["url"] for r in pkg["resources"] if r["name"] == name)


def sica_bundle():
    """certifi roots + the FNMT intermediate the SICA servers leave out of their chain."""
    der = session.get(FNMT_INTERMEDIATE, timeout=TIMEOUT).content
    CA_BUNDLE.parent.mkdir(parents=True, exist_ok=True)
    CA_BUNDLE.write_text(Path(certifi.where()).read_text() + ssl.DER_cert_to_PEM_cert(der))
    return str(CA_BUNDLE)


def b64(s):
    return base64.b64decode(s + "=" * (-len(s) % 4)).decode("utf-8", "ignore")


def sica_links(page):
    """{download name without .zip: url} from the SICA 4th-round page (each link carries ?f=<path>&n=<name>)."""
    links = {}
    for f, n in re.findall(r'dl\.php\?f=([^&"\s]+)&n=([^&"\s]+)', html.unescape(page)):
        try:
            name, path = b64(n).removesuffix(".zip"), b64(f)
        except binascii.Error:  # a few links on the page are malformed; none of them is one we need
            continue
        if path.lower().endswith(".zip"):
            links.setdefault(name, f"https://sicaweb.cedex.es/wp-content/themes/sica-cedex/dl.php?f={f}&n={n}")
    return links


def fetch_bcn(force):
    for period, name in BCN_RASTERS.items():
        print(f"BCN raster {period}…")
        download(ckan_file("rasters-mapa-estrategic-soroll", name), NOISE_DIR / name, force)
    print("BCN facade map 2017…")
    download(ckan_file("facanes-mapa-estrategic-soroll", BCN_FACADES), NOISE_DIR / BCN_FACADES, force)


def fetch_sica(force):
    verify = sica_bundle()
    links = sica_links(session.get(SICA_PAGE, timeout=TIMEOUT, verify=verify).text)
    for name in [*SICA_AGGLOMERATIONS, *SICA_CORRIDORS]:
        print(f"SICA {name}…")
        download(links[name], SICA_DIR / f"{name}.zip", force, verify=verify)


def fetch_blocks(force):
    urls = feed_urls(CP_FEED)
    blocks = []
    for code in NOISE_MUNIS:
        print(f"Catastro CP {code}…")
        cp = download(urls[code], RAW_DIR / f"CP.{code}.zip", force)
        z = read(cp, "cadastralzoning.gml", columns=["LocalisedCharacterString", "nationalCadastalZoningReference"])
        z = z[z["LocalisedCharacterString"].str.strip() == "MANZANA"]
        blocks.append(z.rename(columns={"nationalCadastalZoningReference": "block"})[["block", "geometry"]])
    out = pd.concat(blocks, ignore_index=True).to_crs(25831)
    BLOCKS_GPKG.unlink(missing_ok=True)
    out.to_file(BLOCKS_GPKG, layer="blocks", driver="GPKG")
    print(f"→ {BLOCKS_GPKG.relative_to(ROOT)}: {len(out):,} blocks")


def main():
    ap = argparse.ArgumentParser(description="Sources for per-building noise exposure (TODO-046).")
    ap.add_argument("--force", action="store_true", help="download again")
    args = ap.parse_args()
    fetch_bcn(args.force)
    fetch_sica(args.force)
    fetch_blocks(args.force)


if __name__ == "__main__":
    main()
