#!/usr/bin/env python3
"""Generate non-destructive, low-detail Porygon2 and Chief anatomy A/B revisions.

Sources are unchanged. This script uses only the Python standard library.
    python3 tools/refine_models.py
"""
from collections import defaultdict
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent.parent


def parse_obj(path):
    lines = path.read_text().splitlines()
    vertices = []
    owners = defaultdict(list)
    faces = defaultdict(list)
    obj = None
    for line in lines:
        if line.startswith("o "):
            obj = line[2:].strip()
        elif line.startswith("v "):
            coords = [float(n) for n in line.split()[1:4]]
            owners[obj].append(len(vertices))
            vertices.append(coords)
        elif line.startswith("f "):
            ids = [int(i.split("/")[0]) - 1 for i in line.split()[1:]]
            faces[obj].append(ids)
    return lines, vertices, owners, faces


def write_replaced_vertices(lines, transformed):
    result = []
    vi = 0
    for line in lines:
        if line.startswith("v "):
            result.append("v " + " ".join(f"{n:.7f}" for n in transformed[vi]))
            vi += 1
        else:
            result.append(line)
    assert vi == len(transformed)
    return result


def group_transform(vertices, owners, name, center, size):
    ids = owners[name]
    assert ids, name
    original = [vertices[i] for i in ids]
    origin = [sum(v[axis] for v in original) / len(original) for axis in range(3)]
    # Use AABB midpoint and span rather than vertex density to preserve shape symmetry.
    bounds = [(min(v[axis] for v in original), max(v[axis] for v in original))
              for axis in range(3)]
    old_center = [(lo + hi) / 2 for lo, hi in bounds]
    span = [hi - lo for lo, hi in bounds]
    assert all(s > 0 for s in span), (name, span)
    for i in ids:
        vertices[i] = [center[a] + (vertices[i][a] - old_center[a]) * size[a] / span[a]
                       for a in range(3)]


def mix(a, b, t):
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def subdivide(a, b, c):
    ab, bc, ca = mix(a,b,.5), mix(b,c,.5), mix(c,a,.5)
    return [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]


def clip_polygon(poly, signed_distance):
    if not poly: return []
    out=[]
    prev=poly[-1]
    dprev=signed_distance(prev)
    for point in poly:
        dnow=signed_distance(point)
        was_in=dprev >= 0
        is_in=dnow >= 0
        if is_in != was_in:
            t=dprev/(dprev-dnow)
            out.append(mix(prev,point,t))
        if is_in: out.append(point)
        prev,dprev=point,dnow
    return out


def belly_mesh(vertices, faces):
    """Blue front/underside skin, curved border following original body triangles.

    We only add a thin offset overlay; the source body and topology are intact.
    Subdividing overlay triangles (not the original body) avoids a jagged border.
    """
    out=[]
    tris=[]
    body_c=[.345,.56,-.26]
    def upper_edge(p):
        x,y,z=p
        return (.635 - .135*((x-.345)/.56)**2) - y
    def front_wrap(p):
        return -.075-p[2]
    for face in faces["body_2"]:
        for i in range(1,len(face)-1):
            tri = [vertices[idx] for idx in (face[0],face[i],face[i+1])]
            for sub in subdivide(*tri):
                poly=clip_polygon(list(sub),upper_edge)
                poly=clip_polygon(poly,front_wrap)
                if len(poly)<3: continue
                # Radial offset avoids coplanar z-fighting, <1% of body extent.
                shift=[]
                for p in poly:
                    delta=[p[k]-body_c[k] for k in range(3)]
                    norm=math.sqrt(sum(t*t for t in delta)) or 1
                    shift.append([p[k]+.004*delta[k]/norm for k in range(3)])
                anchor=len(out)
                out.extend(shift)
                for j in range(1,len(shift)-1):
                    tris.append((anchor,anchor+j,anchor+j+1))
    return out,tris


def porygon2():
    source=ROOT/"Porygon2-upright.obj"
    destination=ROOT/"Porygon2-refined.obj"
    lines,v,owners,faces=parse_obj(source)
    assert len(v)==704 and len(owners)==13, "Porygon2 source changed: review before regenerating"
    # Keep the existing simplified head, neck, body, feet, and tail exactly as-is.
    # Relocate only separated eye assemblies so both face forward on the head.
    for key,center,size in (
        ("eye_1_3",(.293,1.49,-.949),(.180,.230,.153)),
        ("eye_1_4",(.713,1.49,-.949),(.180,.230,.153)),
        ("eye_1_11",(.310,1.484,-1.011),(.065,.110,.044)),
        ("eye_1_12",(.730,1.484,-1.011),(.065,.110,.044)),
        ("eye_1_7",(.299,1.527,-1.038),(.025,.038,.021)),
        ("eye_1_8",(.719,1.527,-1.038),(.025,.038,.021)),
    ):
        group_transform(v,owners,key,center,size)
    # Keep the same blue bill and economical source polygon count, but make
    # its horizontal oval shape protrude naturally instead of crossing the face.
    group_transform(v,owners,"bill_1",(.502,1.262,-1.009),(.576,.149,.675))
    out=write_replaced_vertices(lines,v)
    bverts,btris=belly_mesh(v,faces)
    assert bverts and btris
    out.extend(["", "# Additive blue belly overlay; generated by tools/refine_models.py",
                "o belly_blue", "usemtl blue"])
    start=len(v)+1
    out.extend("v "+" ".join(f"{x:.7f}" for x in vert) for vert in bverts)
    out.extend(f"f {start+a} {start+b} {start+c}" for a,b,c in btris)
    destination.write_text("\n".join(out)+"\n")
    return len(bverts),len(btris)


def chief():
    source=ROOT/"chief/chief-snap-lettered.obj"
    destination=ROOT/"chief/chief-refined.obj"
    lines,v,owners,faces=parse_obj(source)
    assert len(v)==575 and len(owners["Chief_HardHat"])==70 and len(owners["Chief_Lettering"])==188, "Chief source changed"
    # Snap Porygon base geometry/UVs remain untouched: Chief is *Porygon*, not Porygon2.
    # Raise helmet a few units to clear brow, tuck it slightly back.
    for i in owners["Chief_HardHat"]:
        v[i][1]+=5.0
        v[i][2]-=3.0
    letters=[v[i] for i in owners["Chief_Lettering"]]
    xmin,xmax=min(t[0] for t in letters),max(t[0] for t in letters)
    ymin=min(t[1] for t in letters)
    xc=(xmin+xmax)/2
    for i in owners["Chief_Lettering"]:
        x,y,_=v[i]
        x2=-16.4+(x-xc)*.55
        y2=289.0+(y-ymin)*.72
        # Front-facing flat facet of 10-sided helmet; ring Z values interpolate
        # 194.6 at Y 283 and 179.4 at Y 323, post helmet translation.
        z2=(194.6-3.0) -(y2-(278.0+5.0))*(194.6-179.4)/40.0 + 2.0
        v[i]=[x2,y2,z2]
    out=write_replaced_vertices(lines,v)
    out.insert(0,"# Non-destructive Chief helmet/lettering alignment revision.")
    destination.write_text("\n".join(out)+"\n")
    return len(owners["Chief_HardHat"]),len(owners["Chief_Lettering"])


def main():
    body= porygon2()
    hat = chief()
    print("Generated Porygon2-refined.obj: belly overlay",body)
    print("Generated chief/chief-refined.obj: hat and lettering vertices",hat)
    print("Original source meshes preserved")


if __name__=="__main__":
    main()
