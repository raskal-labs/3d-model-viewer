#!/usr/bin/env python3
"""Deterministic geometry assertions for the non-destructive Porygon variants."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"tools"))
from refine_models import parse_obj

ROOT=Path(__file__).resolve().parents[1]
p_source=ROOT/"Porygon2-upright.obj"
p_refined=ROOT/"Porygon2-refined.obj"
c_source=ROOT/"chief/chief-snap-lettered.obj"
c_refined=ROOT/"chief/chief-refined.obj"

a,av,ao,af=parse_obj(p_source)
b,bv,bo,bf=parse_obj(p_refined)
assert len(av)==704 and len(bv)>len(av)
assert all(av[i]==bv[i] for name in ("head_9","neck_10","body_2","foot_far_5","foot_near_6","tail_13") for i in ao[name])
assert len(bo["belly_blue"])>50 and len(bf["belly_blue"])>30
assert all(bv[i][2]<-.85 for name in ("eye_1_3","eye_1_4") for i in bo[name])
for w,p,g in (("eye_1_3","eye_1_11","eye_1_7"),("eye_1_4","eye_1_12","eye_1_8")):
    def avg(name,axis):return sum(bv[i][axis] for i in bo[name])/len(bo[name])
    assert avg(p,2)<avg(w,2)<-.85
    assert avg(g,2)<avg(p,2)
assert min(bv[i][2] for i in bo["bill_1"])<-1.3

a,av,ao,af=parse_obj(c_source)
b,bv,bo,bf=parse_obj(c_refined)
assert len(av)==len(bv)==575
assert all(av[i]==bv[i] for i in ao[None]),"Chief's original Pokemon Snap mesh was modified"
assert all(abs(bv[i][1]-av[i][1]-5)<1e-5 for i in ao["Chief_HardHat"])
letters=[bv[i] for i in bo["Chief_Lettering"]]
assert min(p[0] for p in letters)>-44 and max(p[0] for p in letters)<12
assert min(p[1] for p in letters)>=289 and max(p[1] for p in letters)<=307
for x,y,z in letters:
    helmet_front=(194.6-3) -(y-283)*((194.6-179.4)/40)
    assert 1.9 < z-helmet_front < 2.1, "Lettering no longer follows helmet front facet"
print("Refined Porygon2 / Chief geometry checks passed (source parts unchanged).")
