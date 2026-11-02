#!/usr/bin/env python3
"""Rebuild Porygon2-upright.obj from Porygon2.obj (stdlib only).
Run from this directory: python3 edit_model.py
"""
from pathlib import Path
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "Porygon2.obj"
OUTPUT = ROOT / "Porygon2-upright.obj"
MATERIAL = {"bill_1":"blue","body_2":"pink","eye_1_3":"white","eye_1_4":"white","foot_far_5":"blue","foot_near_6":"blue","eye_1_7":"white","eye_1_8":"white","head_9":"pink","neck_10":"pink","eye_1_11":"black","eye_1_12":"black","tail_13":"blue"}
BILL_SCALE = (.65,1.6,.55)
def rebuild():
    lines=SOURCE.read_text().splitlines()
    obj=""
    vertices=[]
    bill=[]
    for line in lines:
        if line.startswith("o "): obj=line[2:].strip()
        if line.startswith("v "):
            point=tuple(map(float,line.split()[1:4]))
            vertices.append((obj,point))
            if obj=="bill_1": bill.append(point)
    center=tuple(sum(p[i] for p in bill)/len(bill) for i in range(3))
    current=""
    it=iter(vertices)
    result=[]
    for line in lines:
        if line.startswith("o "): current=line[2:].strip()
        elif line.startswith("usemtl "): line="usemtl "+MATERIAL[current]
        elif line.startswith("mtllib "): line="mtllib Porygon2.mtl"
        elif line.startswith("v "):
            _,(x,y,z)=next(it)
            if current=="bill_1":
                x,y,z=(center[0]+(x-center[0])*BILL_SCALE[0],center[1]+(y-center[1])*BILL_SCALE[1],center[2]+(z-center[2])*BILL_SCALE[2])
            line="v %.7f %.7f %.7f"%(y,-x,z)
        result.append(line)
    OUTPUT.write_text("\n".join(result)+"\n")
    print("Wrote",OUTPUT)
if __name__=="__main__": rebuild()
