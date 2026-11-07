"""Author the reusable student GLB from the approved six-view reference.
blender --background --python tools/build_student_character.py
Named transform joints match student-animation.js; editable outfit/hair parts stay separate.
"""
import bpy,os,sys,math,json
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from asset_modeling import *
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'client','assets','3d','characters')
bpy.ops.wm.read_factory_settings(use_empty=True)
skin=material('char.skin',(.72,.43,.27),.72)
skinshade=material('char.skin-shade',(.55,.27,.17),.75)
shirt=textured('char.shirt',(.035,.115,.065),'cloth')
trim=material('char.trim',(.89,.83,.66),.8)
pants=textured('char.trousers',(.035,.042,.075),'cloth')
seam=material('char.seam',(.07,.08,.12),.9)
hair=material('char.hair',(.105,.045,.023),.48)
hairlight=material('char.hair-highlight',(.16,.075,.034),.55)
ivory=material('char.shoes-ivory',(.88,.84,.72),.72)
shoe=material('char.shoes',(.075,.17,.125),.72)
dark=material('char.dark',(.018,.024,.027),.5)
eye=material('char.eye-white',(.97,.96,.88),.35)
iris=material('char.iris',(.12,.052,.025),.28)
belt=material('char.belt',(.21,.095,.04),.68)
metal=material('char.buckle',(.45,.39,.25),.35,.6)

def loft(name,rings,mat,segments=32):
    verts=[]
    for z,rx,ry,offset in rings:
        for i in range(segments):
            t=i*math.tau/segments;c,s=math.cos(t),math.sin(t)
            verts.append((math.copysign(abs(c)**.72,c)*rx,offset+math.copysign(abs(s)**.72,s)*ry,z))
    faces=[]
    for r in range(len(rings)-1):
        for i in range(segments):faces.append((r*segments+i,r*segments+(i+1)%segments,(r+1)*segments+(i+1)%segments,(r+1)*segments+i))
    faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(rings)-1)*segments+i for i in range(segments))])
    return mesh(name,verts,faces,mat)

def capture(parent,fn):
    before=set(bpy.context.scene.objects);fn()
    for obj in set(bpy.context.scene.objects)-before:parent_keep(obj,parent)

body=empty('student_body')
torso=loft('student_polo',[(.79,.15,.085,0),(.87,.157,.094,0),(1.02,.17,.105,0),(1.19,.193,.109,0),(1.29,.21,.105,0),(1.335,.165,.083,0),(1.36,.072,.067,0)],shirt)
parent_keep(torso,body)
parent_keep(cylinder('student_neck',.055,.12,(0,0,1.365),skin),body)
# Folded collar leaves, cream edging and a proper polo placket.
for s in [-1,1]:
    collar=mesh('student_collar',[(s*.045,-.073,1.40),(s*.114,-.086,1.347),(s*.062,-.126,1.274),(s*.012,-.092,1.36)],[(0,1,2,3)],trim)
    mod=collar.modifiers.new('Collar thickness','SOLIDIFY');mod.thickness=.006
    parent_keep(collar,body)
parent_keep(box('student_placket',(.028,.012,.103),(0,-.109,1.29),trim,.004),body)
for z in [1.325,1.294,1.263]:parent_keep(sphere('student_button',(0,-.118,z),(.0035,.003,.0035),ivory,12,8),body)
parent_keep(loft('student_waist',[(.73,.158,.095,0),(.83,.155,.093,0)],pants),body)
parent_keep(loft('student_belt',[(.788,.159,.098,0),(.819,.160,.099,0)],belt),body)
parent_keep(box('student_buckle',(.048,.012,.036),(0,-.105,.804),metal,.006),body)
for x in [-.10,.10]:parent_keep(box('student_belt_loop',(.016,.014,.043),(x,-.104,.805),pants,.003),body)

headroot=empty('student_head_mount',(0,0,1.51),body)
capture(headroot,lambda: sphere('student_head',(0,-.006,1.52),(.143,.128,.184),skin,40,24))
for s in [-1,1]:
    capture(headroot,lambda s=s:sphere('student_ear',(s*.144,0,1.515),(.025,.023,.043),skin))
    capture(headroot,lambda s=s:sphere('student_ear_inner',(s*.161,-.010,1.515),(.008,.015,.025),skinshade,16,10))
    capture(headroot,lambda s=s:sphere('student_eye_white',(s*.055,-.127,1.556),(.028,.008,.016),eye))
    capture(headroot,lambda s=s:sphere('student_iris',(s*.055,-.135,1.555),(.011,.004,.013),iris))
    capture(headroot,lambda s=s:sphere('student_pupil',(s*.055,-.139,1.556),(.0055,.002,.008),dark,16,10))
    capture(headroot,lambda s=s:sphere('student_eye_glint',(s*.055-.003,-.141,1.562),(.002,.001,.003),eye,10,8))
    capture(headroot,lambda s=s:tube('student_eyebrow',[(s*.027,-.123,1.597),(s*.053,-.129,1.605),(s*.084,-.112,1.598)],.007,hair))
capture(headroot,lambda:sphere('student_nose',(0,-.146,1.515),(.021,.030,.027),skin))
capture(headroot,lambda:sphere('student_nose_bridge',(0,-.119,1.543),(.015,.019,.034),skin))
capture(headroot,lambda:tube('student_smile',[(-.043,-.119,1.470),(-.025,-.133,1.463),(0,-.140,1.460),(.025,-.133,1.463),(.043,-.119,1.470)],.0047,skinshade))
capture(headroot,lambda:tube('student_lower_lip',[(-.022,-.131,1.454),(0,-.138,1.451),(.022,-.131,1.454)],.003,skin))
hairroot=empty('student_hair',(0,0,1.66),headroot)
capture(hairroot,lambda:sphere('student_hair_cap',(0,.027,1.638),(.151,.129,.115),hair,32,18))
# Curved tapered locks, not faceted spheres: keep the reference's swept fringe.
locks=[(-.115,-.080,1.65,-.16,-.14,1.69),(-.076,-.12,1.69,-.135,-.17,1.65),(-.026,-.13,1.72,-.08,-.17,1.64),(.025,-.11,1.735,-.02,-.18,1.66),(.078,-.075,1.727,.035,-.17,1.68),(.12,-.025,1.70,.13,-.11,1.64)]
for i,(x,y,z,ex,ey,ez) in enumerate(locks):
    points=[(x,y+.04,z-.018),(x+.015,y,z+.025),((x+ex)/2,(y+ey)/2,z+.022),(ex,ey,ez)]
    capture(hairroot,lambda points=points,i=i:tube('student_hair_lock',points,[.035,.036,.027,.003],hair if i%2 else hairlight,10,True))
for s in [-1,1]:
    for j in range(3):
        capture(hairroot,lambda s=s,j=j:tube('student_hair_side',[(s*.115,.05+j*.02,1.68),(s*.156,.04+j*.02,1.64),(s*(.17+j*.009),.02+j*.025,1.60+j*.017)],[.03,.025,.002],hair,10,True))

for s in [-1,1]:
    side='left' if s<0 else 'right';x=s*.092
    hip=empty('student_hip_'+side,(x,0,.77),body)
    knee=empty('student_knee_'+side,(x,0,.43),hip)
    def thigh(x=x,s=s):
        o=loft('student_thigh',[(.41,.072,.078,0),(.50,.082,.085,0),(.65,.085,.093,0),(.78,.084,.092,0)],pants);o.location.x=x
        pocket=box('student_cargo_pocket',(.025,.102,.128),(x+s*.083,-.005,.585),pants,.009)
        flap=box('student_pocket_flap',(.030,.108,.031),(x+s*.085,-.006,.65),seam,.006)
        tube('student_pants_seam',[(x+s*.069,-.064,z) for z in [.44,.54,.64,.75]],.0018,seam,5)
    capture(hip,thigh)
    def shin(x=x):
        o=loft('student_shin',[(.115,.070,.067,.005),(.20,.067,.072,0),(.33,.072,.074,0),(.445,.073,.077,0)],pants);o.location.x=x
        o=loft('student_cuff',[(.12,.073,.072,0),(.153,.073,.072,0)],seam);o.location.x=x
        box('student_shoe_sole',(.142,.285,.035),(x,-.069,.029),ivory,.016)
        box('student_shoe',(.130,.263,.087),(x,-.064,.084),shoe,.04)
        box('student_toe_cap',(.128,.102,.061),(x,-.158,.075),ivory,.028)
        box('student_tongue',(.065,.105,.018),(x,-.070,.131),shoe,.008)
        for j in range(4):
            y=-.11+j*.025;tube('student_lace',[(x-.036,y,.126),(x,y-.005,.139),(x+.036,y,.126)],.0027,ivory,6)
        for sign in [-1,1]:tube('student_shoe_seam',[(x+sign*.065,y,.08) for y in [-.16,-.11,-.03,.04]],.0018,ivory,5)
    capture(knee,shin)

for s in [-1,1]:
    side='left' if s<0 else 'right';sx=s*.209
    shoulder=empty('student_shoulder_'+side,(sx,0,1.29),body)
    elbow=empty('student_elbow_'+side,(s*.285,0,1.045),shoulder)
    def upper(s=s):
        tube('student_upper_arm',[(s*.225,0,1.28),(s*.263,0,1.17),(s*.285,0,1.045)],[.066,.057,.044],skin,16)
        tube('student_sleeve',[(s*.215,0,1.29),(s*.250,0,1.21),(s*.263,0,1.16)],[.083,.079,.068],shirt,20)
        tube('student_sleeve_trim',[(s*.260,0,1.168),(s*.265,0,1.151)],[.069,.068],trim,20)
    capture(shoulder,upper)
    def lower(s=s):
        tube('student_forearm',[(s*.285,0,1.045),(s*.311,-.005,.96),(s*.322,-.007,.875)],[.045,.043,.028],skin,16)
        sphere('student_palm',(s*.326,-.005,.837),(.035,.025,.051),skin)
        for i in range(4):
            x=s*(.302+i*.016);z=.792+(abs(i-1.5)*.005)
            tube('student_finger',[(x,-.011,.833),(x+s*.004,-.014,z+.016),(x+s*.002,-.007,z)],[.010,.009,.006],skin,8)
        tube('student_thumb',[(s*.300,-.008,.859),(s*.286,-.035,.830),(s*.290,-.040,.812)],[.012,.010,.006],skin,8)
        if s<0:
            watch=torus('student_watch_strap',.031,.007,(s*.319,-.005,.898),dark)
            box('student_watch_face',(.044,.018,.041),(s*.319,-.036,.899),dark,.009)
            box('student_watch_glass',(.032,.005,.028),(s*.319,-.047,.899),metal,.005)
    capture(elbow,lower)

# Batch each attachment branch, preserving the eight transform joints and head markers.
for node in [o for o in bpy.context.scene.objects if o.type=='EMPTY']:
    children=[child for child in node.children if child.type=='MESH' and child.name not in ('student_head','student_nose')]
    if len(children)>1:batch(node.name+'_geometry',children)
result=export_asset(os.path.join(OUT,'student-male-01.glb'),False,os.path.join(ROOT,'source-assets','characters','student-male-01.blend'))
result.update({'id':'student-male-01','name':'Sinh viên áo polo','heightMetres':1.78,'front':'Blender -Y','jointContract':'student-animation-v1','joints':['student_'+joint+'_'+side for joint in ['hip','knee','shoulder','elbow'] for side in ['left','right']],'materialSlots':['char.skin','char.hair','char.shirt','char.trim','char.trousers','char.shoes'],'reference':'design/farm-v2-reference/14-student-character.png'})
with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf8') as f:json.dump({'units':'metres','assets':[result]},f,indent=2,ensure_ascii=False)
print('STUDENT ASSET COMPLETE',result['bytes'],flush=True)
