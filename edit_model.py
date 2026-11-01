#!/usr/bin/env python3
"""Editable OBJ transform helper. Uses only Python's standard library.
Usage: python edit_model.py Porygon2.obj Porygon2-edited.obj
Edit OFFSETS below to reposition individual named components.
"""
import sys
from pathlib import Path
OFFSETS = {
    # "pupil_1": (0.0, 0.0, 0.0),
    # "glint_1": (0.0, 0.0, 0.0),
}
def edit(src, dst):
    current = ""
    lines = []
    for line in Path(src).read_text().splitlines(keepends=True):
        if line.startswith("o "):
            current = line[2:].strip()
        if line.startswith("v "):
            values = line.split()
            dx,dy,dz = OFFSETS.get(current,(0,0,0))
            x,y,z = map(float,values[1:4])
            line = f"v {x+dx:.7f} {y+dy:.7f} {z+dz:.7f}\n"
        lines.append(line)
    Path(dst).write_text("".join(lines))
if __name__ == "__main__":
    if len(sys.argv)!=3: raise SystemExit("Usage: python edit_model.py INPUT.obj OUTPUT.obj")
    edit(sys.argv[1],sys.argv[2])
