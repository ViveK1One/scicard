"""
SciCard chemistry microservice — SMILES / reaction SMARTS → 2D SVG or PNG.
"""

from __future__ import annotations

import os
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from rdkit import Chem
from rdkit.Chem import rdChemReactions
from rdkit.Chem.Draw import rdMolDraw2D

app = FastAPI(title="SciCard Chem Service", version="0.1.0")

# When chem is public, set CHEM_SERVICE_SECRET and only allow Next.js proxy.
_CHEM_SECRET = (os.environ.get("CHEM_SERVICE_SECRET") or "").strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_chem_secret(
    x_scicard_chem_secret: str | None = Header(default=None),
) -> None:
    if not _CHEM_SECRET:
        return
    if not x_scicard_chem_secret or x_scicard_chem_secret != _CHEM_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class RenderRequest(BaseModel):
    smiles: str = Field(..., min_length=1, description="SMILES or reaction SMILES/SMARTS")
    format: Literal["svg", "png"] = "svg"
    width: int = Field(default=720, ge=120, le=2000)
    height: int = Field(default=240, ge=80, le=1200)


def _try_reaction(raw: str):
    for use_smiles in (True, False):
        try:
            rxn = rdChemReactions.ReactionFromSmarts(raw, useSmiles=use_smiles)
        except Exception:
            continue
        if rxn is None:
            continue
        if rxn.GetNumReactantTemplates() == 0 or rxn.GetNumProductTemplates() == 0:
            continue
        try:
            rxn.Initialize()
        except Exception:
            pass
        return rxn
    return None


def _draw_molecule(mol: Chem.Mol, fmt: str, width: int, height: int) -> tuple[bytes | str, str]:
    if fmt == "png":
        drawer = rdMolDraw2D.MolDraw2DCairo(width, height)
        drawer.drawOptions().clearBackground = True
        drawer.drawOptions().bondLineWidth = 1.6
        drawer.DrawMolecule(mol)
        drawer.FinishDrawing()
        return drawer.GetDrawingText(), "image/png"

    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    drawer.drawOptions().clearBackground = True
    drawer.drawOptions().bondLineWidth = 1.6
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText(), "image/svg+xml"


def _draw_reaction(rxn, fmt: str, width: int, height: int) -> tuple[bytes | str, str]:
    if fmt == "png":
        drawer = rdMolDraw2D.MolDraw2DCairo(width, height)
        drawer.drawOptions().clearBackground = True
        drawer.drawOptions().bondLineWidth = 1.4
        drawer.DrawReaction(rxn)
        drawer.FinishDrawing()
        return drawer.GetDrawingText(), "image/png"

    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    drawer.drawOptions().clearBackground = True
    drawer.drawOptions().bondLineWidth = 1.4
    drawer.DrawReaction(rxn)
    drawer.FinishDrawing()
    return drawer.GetDrawingText(), "image/svg+xml"


def _parse_and_render(smiles: str, fmt: str, width: int, height: int) -> tuple[bytes | str, str]:
    raw = smiles.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="smiles is empty")

    # Reaction SMILES / SMARTS
    if ">>" in raw or raw.count(">") >= 2:
        rxn = _try_reaction(raw)
        if rxn is not None:
            return _draw_reaction(rxn, fmt, width, height)

    mol = Chem.MolFromSmiles(raw)
    if mol is not None:
        return _draw_molecule(mol, fmt, width, height)

    # Last chance: treat as reaction SMARTS
    rxn = _try_reaction(raw)
    if rxn is not None:
        return _draw_reaction(rxn, fmt, width, height)

    raise HTTPException(
        status_code=422,
        detail=f"Could not parse SMILES/SMARTS: {raw[:120]}",
    )


@app.get("/health")
def health():
    return {"ok": True, "service": "scicard-chem", "authRequired": bool(_CHEM_SECRET)}


@app.post("/render")
def render_post(
    body: RenderRequest,
    _: None = Depends(require_chem_secret),
):
    data, media = _parse_and_render(body.smiles, body.format, body.width, body.height)
    if isinstance(data, str):
        return Response(content=data, media_type=media)
    return Response(content=data, media_type=media)


@app.get("/render")
def render_get(
    smiles: str = Query(..., min_length=1),
    format: Literal["svg", "png"] = "svg",
    width: int = Query(720, ge=120, le=2000),
    height: int = Query(240, ge=80, le=1200),
    _: None = Depends(require_chem_secret),
):
    data, media = _parse_and_render(smiles, format, width, height)
    if isinstance(data, str):
        return Response(content=data, media_type=media)
    return Response(content=data, media_type=media)
