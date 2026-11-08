"""Deterministic, editable Khu A cooperative and modular humanoids. Blender 5.2.
blender --background --python tools/build_khu_a_coop.py
Metres, Blender Z-up/-Y front; glTF exporter converts to Y-up.
"""
import bpy, os, sys, math, json
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
from asset_modeling import *
_rounded_box=box
def box(name,size,position,mat,bevel=.015):
    # Single-segment edge chamfers for repeated environment meshes. Characters keep rounded joints.
    o=_rounded_box(name,size,position,mat,0)
    if bevel:
        mod=o.modifiers.new('Low-poly edge chamfer','BEVEL');mod.width=min(bevel,min(size)*.45);mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
OUT=os.path.join(ROOT,'client/assets/3d/khu-a-coop-v1')
CHAR=os.path.join(ROOT,'client/assets/3d/characters/coop-v1')
SOURCE=os.path.join(ROOT,'source-assets/khu-a-coop-v1')
bpy.ops.wm.read_factory_settings(use_empty=True)
os.makedirs(OUT,exist_ok=True);os.makedirs(CHAR,exist_ok=True)
M={k:material('coop.'+k,c,.72 if k not in ('metal','gold') else .4,.7 if k in ('metal','gold') else 0) for k,c in {
 'wood':(.50,.26,.095),'oak':(.66,.38,.16),'blue':(.065,.15,.29),'cream':(.84,.74,.57),
 'brick':(.48,.16,.09),'stone':(.57,.50,.42),'tile':(.70,.62,.51),'ivory':(.94,.87,.71),
 'metal':(.065,.08,.10),'gold':(.70,.43,.12),'leaf':(.18,.33,.055),'leaf2':(.29,.44,.09),
 'soil':(.08,.045,.022),'red':(.62,.055,.025),'orange':(.84,.28,.025),'pink':(.76,.22,.36),
 'greenboard':(.045,.11,.065)}.items()}
M['lamp']=material('coop.lamp',(1,.64,.23),.35,emission=1.2)
FONT=bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')
ONLY=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
records=[]
if ONLY:
    records=json.load(open(os.path.join(OUT,'manifest.json'),encoding='utf8'))['assets']
    records=[r for r in records if r['id']!=ONLY]

def txt(name,value,x,y,z,width,size=.21,mat=None):
    bpy.ops.object.text_add(location=(x,y,z),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name=name;o.data.body=value;o.data.font=FONT;o.data.align_x='CENTER';o.data.align_y='CENTER'
    o.data.size=size;o.data.extrude=.001;o.data.resolution_u=3;o.data.materials.append(mat or M['ivory'])
    bpy.context.view_layer.update()
    if o.dimensions.x>width:o.scale*=width/o.dimensions.x
    bpy.ops.object.convert(target='MESH');return o

def sign(value,pos,width=2.3,height=.42):
    x,y,z=pos
    box('sign_gold_frame',(width+.08,.10,height+.08),(x,y,z),M['gold'],.035)
    box('sign_blue_face',(width,.035,height),(x,y-.063,z),M['blue'],.025)
    txt('sign_text_'+value,value,x,y-.087,z,width-.12,height*.65)

def lantern(pos=(0,0,0)):
    x,y,z=pos
    box('lantern_back',(.13,.04,.35),(x,y+.1,z+.23),M['metal'])
    beam('lantern_bracket',(x,y+.1,z+.38),(x,y-.12,z+.38),.045,.045,M['metal'])
    box('lantern_glass',(.16,.16,.24),(x,y-.12,z+.20),M['lamp'])
    for dx in [-.09,.09]:
        for dy in [-.21,-.03]:beam('lantern_corner',(x+dx,y+dy,z+.07),(x+dx,y+dy,z+.33),.02,.02,M['metal'])
    box('lantern_roof',(.24,.23,.06),(x,y-.12,z+.35),M['metal'])
    box('lantern_foot',(.21,.21,.04),(x,y-.12,z+.06),M['metal'])

def sprout(pos=(0,0,0),scale=1):
    x,y,z=pos
    beam('sprout_stem',(x,y,z),(x,y,z+.19*scale),.018*scale,.018*scale,M['leaf'])
    for s in [-1,1]:leaf('sprout_leaf',(x,y,z+.1*scale),(x+s*.15*scale,y+.025*scale,z+.25*scale),.065*scale,M['leaf2'],rows=4)

def sack(pos=(0,0,0),scale=1):
    x,y,z=pos
    sphere('seed_sack',(x,y,z+.25*scale),(.22*scale,.18*scale,.25*scale),M['cream'],16,10)
    torus('sack_fold',.12*scale,.035*scale,(x,y,z+.47*scale),M['ivory'])
    leaf('sack_leaf',(x,y-.18*scale,z+.22*scale),(x+.075*scale,y-.19*scale,z+.34*scale),.045*scale,M['leaf'],rows=4)

def seedling(pos=(0,0,0)):
    x,y,z=pos;box('seedling_tray',(.68,.42,.08),(x,y,z+.04),M['wood'])
    for i in range(3):
        for j in range(2):
            xx=x+(i-1)*.20;yy=y+(j-.5)*.19
            box('seedling_cell',(.175,.16,.11),(xx,yy,z+.12),M['soil'],.012);sprout((xx,yy,z+.17),.55)

def crate(pos=(0,0,0),produce=True):
    x,y,z=pos
    box('crate_base',(.70,.48,.05),(x,y,z+.025),M['wood'])
    for dx in [-.32,.32]:
        for dy in [-.21,.21]:box('crate_corner',(.045,.045,.36),(x+dx,y+dy,z+.18),M['oak'])
    for h in [.10,.25]:
        for dy in [-.235,.235]:box('crate_slat',(.70,.035,.11),(x,y+dy,z+h),M['oak'])
        for dx in [-.335,.335]:box('crate_end',(.035,.48,.11),(x+dx,y,z+h),M['oak'])
    if produce:
        for i in range(4):
            xx=x+(i-1.5)*.14
            sphere('carrot',(xx,y,z+.24),(.06,.17,.06),M['orange'],12,8)
            sprout((xx,y+.13,z+.25),.6)

def pot(pos=(0,0,0),scale=1,flowers=False):
    x,y,z=pos
    o=lathe('plant_pot',[(0,.16),(.03,.18),(.38,.24),(.42,.25),(.44,.22)],M['brick'],16);o.scale=(scale,)*3;o.location=(x,y,z)
    for i in range(7):
        a=i*math.tau/7;end=(x+math.cos(a)*.40*scale,y+math.sin(a)*.40*scale,z+(.6+.1*(i%3))*scale)
        leaf('plant_leaf',(x,y,z+.4*scale),end,.115*scale,M['leaf2'] if i%2 else M['leaf'],bend=.05,rows=5)
        if flowers:
            for j in range(5):
                t=j*math.tau/5;sphere('flower_petal',(end[0]+math.cos(t)*.065*scale,end[1]+math.sin(t)*.065*scale,end[2]),(.07*scale,.045*scale,.025*scale),M['pink'],8,6)
            sphere('flower_center',end,(.03*scale,)*3,M['gold'],8,6)

def scale_prop(pos=(0,0,0)):
    x,y,z=pos;box('scale_body',(.30,.27,.26),(x,y,z+.13),M['blue'],.04)
    d=cylinder('scale_dial',.115,.025,(x,y-.15,z+.15),M['ivory'],24);d.rotation_euler.x=math.pi/2
    beam('scale_needle',(x,y-.168,z+.15),(x+.025,y-.168,z+.23),.012,.012,M['red'])
    cylinder('scale_support',.035,.14,(x,y,z+.32),M['metal'])
    lat=lathe('scale_bowl',[(0,.06),(.035,.19),(.10,.23),(.11,.215)],M['metal'],24);lat.location=(x,y,z+.37)

def shelf():
    box('shelf_back',(3.45,.13,2.65),(0,.67,1.325),M['wood'])
    for x in [-1.68,1.68]:box('shelf_post',(.13,.52,2.85),(x,.48,1.425),M['oak'])
    for z in [1.12,1.72,2.32]:box('shelf_board',(3.4,.52,.075),(0,.45,z),M['oak'])
    box('counter_base',(3.4,.68,1.03),(0,-.38,.515),M['wood'])
    for x in [-1.58,-.8,0,.8,1.58]:box('counter_front_rail',(.06,.04,.88),(x,-.74,.50),M['oak'])
    box('counter_top',(3.58,.90,.11),(0,-.38,1.085),M['oak'],.03)

def stall(kind):
    shelf();sign('HẠT GIỐNG' if kind=='seed' else 'THU MUA',(0,.51,2.90),3.1,.43)
    for z in [1.16,1.76]:
        for x in [-1.24,-.62,0,.62,1.24]:
            if kind=='seed':sack((x,.43,z),.80)
            else:crate((x,.43,z),False)
    if kind=='seed':
        for x in [-.95,.15,.95]:seedling((x,-.40,1.15))
        for i in range(5):
            box('seed_packet',(.17,.035,.25),(-1.25+i*.25,-.76,1.32),M['cream'])
            sprout((-1.25+i*.25,-.79,1.24),.35)
    else:
        for x in [.15,1.04]:crate((x,-.4,1.15))
        scale_prop((-1.10,-.41,1.15))

def desk():
    box('desk_front',(2.6,.16,.98),(0,-.44,.49),M['wood'])
    for x in [-1.22,1.22]:box('desk_leg',(.14,.90,1.05),(x,0,.525),M['oak'])
    box('desk_top',(2.8,1.05,.12),(0,0,1.08),M['oak'],.035)
    box('desk_banner',(.65,.035,.62),(0,-.535,.65),M['blue'])
    for s in [-1,1]:leaf('wheat_emblem',(0,-.56,.45),(s*.18,-.56,.78),.055,M['ivory'],rows=4)
    for i in range(3):box('book',(.35,.24,.07),(-.88,.05,1.18+i*.075),M['blue'] if i%2 else M['cream'])
    box('ledger',(.43,.30,.035),(.25,-.08,1.17),M['ivory'])

def board(kind):
    box('board_frame',(2.25,.13,1.40),(0,0,.70),M['oak'])
    box('board_face',(2.1,.035,1.25),(0,-.083,.70),M['greenboard'] if kind=='prices' else M['wood'])
    txt('board_heading','BẢNG GIÁ DỊCH VỤ' if kind=='prices' else 'ĐƠN HÀNG',0,-.108,1.16,1.95,.18)
    if kind=='orders':
        for x in [-.66,0,.66]:
            box('order_slip',(.49,.025,.62),(x,-.12,.65),M['cream']);sprout((x,-.15,.43),.9)
        txt('orders_state','NHIỆM VỤ CHƯA MỞ',0,-.15,.14,1.9,.13)
    else:
        txt('prices_hint','XEM GIÁ TẠI QUẦY',0,-.12,.71,1.9,.15)
        txt('recovery_price','Hồi phục · 500 tiền đồng',0,-.12,.38,1.9,.13)

def gate(locked=False):
    w=2.45 if locked else 3.3
    for x in [-w/2,w/2]:
        box('gate_post',(.20,.26,2.9),(x,0,1.45),M['wood'])
        box('gate_foot',(.34,.42,.40),(x,0,.20),M['cream'])
        lantern((x,-.14,1.98))
    box('gate_lintel',(w+.35,.28,.20),(0,0,2.94),M['oak'])
    if locked:
        for s in [-1,1]:
            roof=box('farm_roof',((w+.75)/2+.13,.95,.12),(s*(w+.75)/4,0,3.34),M['blue']);roof.rotation_euler.y=s*.45
            beam('farm_gable',(s*(w+.75)/2,0,2.98),(0,0,3.70),.10,.12,M['oak'])
        mesh('farm_front_gable',[(-(w+.75)/2,-.48,2.98),((w+.75)/2,-.48,2.98),(0,-.48,3.70)],[(0,1,2)],M['oak'],False)
        box('closed_door',(w-.25,.15,2.45),(0,-.02,1.35),M['blue'])
        for x in [-.75,-.45,-.15,.15,.45,.75]:box('door_plank',(.022,.022,2.35),(x,-.106,1.35),M['wood'],0)
        sign('NÔNG TRẠI',(0,-.56,3.10),2.05,.34);sign('TẠM KHÓA',(0,-.24,2.49),1.48,.27)
        for i in range(11):
            x=-.86+i*.172;z=1.20-.20*math.sin(i/10*math.pi)
            o=torus('lock_chain',.085,.018,(x,-.20,z),M['metal'],True);o.scale.x=1.5
            if i%2:o.rotation_euler.z=math.pi/2
        box('padlock',(.30,.12,.32),(0,-.28,.98),M['gold'],.045)
        sh=torus('padlock_shackle',.105,.028,(0,-.28,1.17),M['metal'],True)
        box('keyhole',(.035,.01,.10),(0,-.346,.98),M['metal'],.009)
    else:
        sign('KHU A',(0,-.16,2.91),2.45,.52)
        sign('VỀ BẢN ĐỒ CHÍNH',(0,-.18,2.35),2.45,.34)
    for i in range(2):box('gate_step',(w+.20-i*.16,.50+i*.30,.12),(0,-.34-i*.23,.06-i*.10),M['cream'])

def recovery():
    for x in [-1.35,1.35]:box('recovery_post',(.12,.15,2.55),(x,.35,1.275),M['oak'])
    box('recovery_beam',(2.94,.18,.15),(0,.35,2.55),M['oak'])
    sign('HỒI PHỤC',(0,.24,2.22),2.20,.39)
    for z in [.48,.77,1.00]:box('bench_slats',(1.85,.12,.16),(-.35,.12,z),M['blue'])
    box('bench_seat',(1.92,.55,.11),(-.35,-.08,.49),M['blue'])
    for x in [-1.08,.38]:
        for y in [-.27,.13]:box('bench_legs',(.08,.08,.48),(x,y,.24),M['metal'])
    box('first_aid',(.52,.49,.84),(1.0,-.05,.42),M['oak'])
    box('cross_vertical',(.07,.025,.26),(1,-.31,.44),M['ivory']);box('cross_horizontal',(.25,.025,.07),(1,-.31,.44),M['ivory'])
    for i in range(2):box('folded_towel',(.40,.32,.05),(1,-.05,.89+i*.06),M['ivory'])

def floor():
    box('foundation',(4,4,.18),(0,0,-.11),M['stone'])
    for i in range(8):
        for j in range(8):
            x=-1.75+i*.5;y=-1.75+j*.5
            mesh('floor_tile',[(x-.246,y-.246,.014),(x+.246,y-.246,.014),(x+.246,y+.246,.014),(x-.246,y+.246,.014)],[(0,1,2,3)],M['tile'] if (i+j)%3 else M['cream'],False)

def window():
    box('window_frame',(1.4,.16,1.3),(0,0,.65),M['oak'])
    box('window_glass',(.85,.035,1.1),(0,-.10,.65),M['cream'])
    for x in [-.24,.24]:box('window_mullion',(.045,.06,1.1),(x,-.13,.65),M['oak'])
    box('window_cross',(.86,.06,.045),(0,-.13,.65),M['oak'])
    for x in [-.59,.59]:
        box('window_shutter',(.30,.10,1.28),(x,-.14,.65),M['blue'])
        for k in range(8):box('shutter_louver',(.26,.035,.065),(x,-.21,.15+k*.14),M['blue'])

def wall():
    box('wall_plaster',(4,.18,3.4),(0,0,1.7),M['cream'])
    for row in range(4):
        for i in range(8):box('brick',(.48,.22,.16),(-1.75+i*.5+(row%2)*.06,-.015,.09+row*.18),M['brick'],.01)
    for x in [-1.9,1.9]:box('timber_post',(.18,.26,3.5),(x,0,1.75),M['wood'])
    box('top_beam',(4.05,.28,.18),(0,0,3.45),M['wood'])
    before=set(bpy.context.scene.objects);window()
    for o in set(bpy.context.scene.objects)-before:o.location.z+=1.30;o.location.y-=.16

def lowwall():
    box('low_wall',(4,.18,.60),(0,0,.3),M['cream']);box('wall_cap',(4.04,.25,.07),(0,0,.635),M['oak'])
    for i in range(8):box('brick',(.48,.205,.16),(-1.75+i*.5,0,.12),M['brick'],.008)

def cart():
    box('cart_platform',(.75,.84,.07),(0,0,.24),M['oak'])
    for x in [-.37,.37]:
        beam('cart_handle',(x,.35,.20),(x,.35,1.20),.045,.045,M['blue'])
        o=cylinder('cart_wheel',.18,.10,(x,-.16,.18),M['metal'],20);o.rotation_euler.y=math.pi/2
    beam('cart_crossbar',(-.37,.35,1.2),(.37,.35,1.2),.045,.045,M['blue'])

def planter():
    box('flower_box',(1.35,.48,.33),(0,0,.165),M['brick'])
    for x in [-.4,0,.4]:pot((x,0,.30),.50,True)

def hanging():
    pot((0,0,0),.65)
    for i in range(3):
        x=(i-1)*.10
        tube('hanging_vine',[(x,0,.22),(x,-.19,.05),(x+.06,-.24,-.22),(x,-.18,-.46)],.018,M['leaf'],6)
        for k in range(4):leaf('vine_leaf',(x,-.20,.12-k*.15),(x+(.15 if k%2 else -.15),-.25,.02-k*.15),.07,M['leaf2'],rows=4)

def save(name,fn,batch_geometry=True,folder=OUT):
    fn();bpy.context.view_layer.update()
    triangles=sum(len(o.data.polygons)*2 for o in bpy.context.scene.objects if o.type=='MESH')
    rec=export_asset(os.path.join(folder,name+'.glb'),batch_geometry,os.path.join(SOURCE,name+'.blend'))
    rec.update({'id':name,'estimatedTriangles':triangles,'front':'Blender -Y; glTF -Z','pivot':'ground center or wall mount','units':'metres'})
    records.append(rec);print('COOP ASSET',name,rec['bytes'],flush=True)

for name,fn in [('floor-module',floor),('wall-window',wall),('wall-low',lowwall),('window-shutters',window),
 ('seed-stall',lambda:stall('seed')),('produce-stall',lambda:stall('produce')),('professor-desk',desk),
 ('price-board',lambda:board('prices')),('order-board',lambda:board('orders')),('exit-gate',gate),
 ('locked-farm-gate',lambda:gate(True)),('recovery-station',recovery),('handcart',cart),('wall-lantern',lantern),
 ('seed-sack',sack),('seedling-tray',seedling),('produce-crate',crate),('countertop-scale',scale_prop),
 ('potted-plant',pot),('flower-planter',planter),('hanging-plant',hanging)]:
    if not ONLY or name==ONLY:save(name,fn)
with open(os.path.join(OUT,'manifest.json'),'w',encoding='utf8') as f:json.dump({'version':1,'units':'metres','reference':'design/khu-a-coop-reference/00-approved-concept.png','assets':records},f,ensure_ascii=False,indent=2)
if ONLY:sys.exit(0)
box=_rounded_box

# Shared transform-joint humanoid. Module branches stay separate, never baked into scenery.
skin=material('char.skin',(.80,.55,.36));hair=material('char.hair',(.12,.055,.025));gray=material('char.gray',(.43,.43,.41))
shirt=material('char.shirt',(.035,.21,.11));trim=material('char.trim',(.89,.83,.67));pants=material('char.trousers',(.45,.29,.14))
shoes=material('char.shoes',(.055,.065,.07));ivory=material('char.shoe-trim',(.86,.83,.75))
white=material('char.white',(.92,.90,.82));apron=material('char.apron',(.095,.18,.30));vest=material('char.vest',(.23,.13,.07))
eye=material('char.eyes',(.025,.02,.02));lip=material('char.smile',(.30,.12,.065))

def capture(parent,fn):
    before=set(bpy.context.scene.objects);fn()
    created=[o for o in bpy.context.scene.objects if o not in before and o.type=='MESH']
    if len(created)>1:created=[batch(parent.name+'_mesh',created)]
    for o in created:parent_keep(o,parent)

def module(slot,option,part,parent,fn):
    n=empty('module__'+slot+'__'+option+'__'+part,parent=parent);capture(n,fn);return n

def human(preset=None):
    body=empty('student_body')
    parent_keep(sphere('student_neck',(0,0,1.19),(.065,.063,.11),skin,16,10),body)
    h=empty('student_head_mount',(0,0,1.46),body)
    parent_keep(sphere('student_head',(0,0,1.46),(.245,.205,.28),skin,24,16),h)
    parent_keep(sphere('student_nose',(0,-.213,1.45),(.038,.045,.033),skin,12,8),h)
    for s in [-1,1]:
        parent_keep(sphere('ear',(s*.242,0,1.46),(.045,.04,.075),skin,12,8),h)
        parent_keep(sphere('eye',(s*.085,-.191,1.50),(.027,.014,.038),eye,12,10),h)
        parent_keep(sphere('eye_glint',(s*.085-.007,-.205,1.515),(.008,.003,.010),white,8,6),h)
        parent_keep(tube('eyebrow',[(s*.05,-.19,1.57),(s*.09,-.20,1.58),(s*.12,-.18,1.57)],.009,hair,6),h)
    parent_keep(tube('smile',[(-.065,-.18,1.38),(0,-.204,1.36),(.065,-.18,1.38)],.008,lip,6),h)
    def hairstyle(option):
        mat=gray if option=='gray' else hair
        sphere('hair_cap',(0,.025,1.65),(.25,.205,.135),mat,20,12)
        for i in range(6):
            x=-.20+i*.08;sphere('hair_lock',(x,-.14+abs(x)*.2,1.66+(.05 if i%2 else 0)),(.09,.10,.07),mat,12,8)
        if option=='braid':
            for i in range(5):sphere('braid',(0,.22+.01*i,1.48-i*.075),(.065-i*.007,.065-i*.006,.055),mat,12,8)
    for opt in ['wavy','braid','gray']:module('hair',opt,'head',h,lambda opt=opt:hairstyle(opt))
    def glasses():
        for x in [-.09,.09]:torus('glasses_rim',.075,.012,(x,-.219,1.50),M['metal'],True)
        beam('glasses_bridge',(-.018,-.222,1.5),(.018,-.222,1.5),.012,.012,M['metal'])
    module('accessory','glasses','head',h,glasses)
    def outfit(opt):
        mat=shirt if opt=='polo' else white
        box('shirt_body',(.43,.27,.46),(0,0,.99),mat,.065)
        if opt=='apron':box('apron_front',(.39,.025,.48),(0,-.151,.93),apron,.025)
        if opt=='vest':
            for s in [-1,1]:box('vest_panel',(.17,.035,.36),(s*.115,-.15,.99),vest,.02)
            beam('tie',(0,-.18,1.17),(0,-.18,.98),.04,.02,M['blue'])
        for s in [-1,1]:
            collar=box('collar',(.10,.035,.12),(s*.06,-.16,1.17),trim,.012);collar.rotation_euler.y=s*.35
        if opt=='polo':
            txt('student_emblem','STU',-.105,-.164,1.07,.10,.045,trim)
    for opt in ['polo','apron','vest']:module('outfit',opt,'torso',body,lambda opt=opt:outfit(opt))
    def backpack():
        box('backpack',(.31,.15,.35),(0,.22,.99),M['wood'],.055)
        box('backpack_pocket',(.22,.04,.14),(0,.31,.91),M['oak'],.02)
        for s in [-1,1]:beam('backpack_strap',(s*.15,.16,1.19),(s*.15,.18,.85),.04,.025,M['wood'])
    module('accessory','backpack','body',body,backpack)
    for s in [-1,1]:
        side='left' if s<0 else 'right';x=s*.12
        hip=empty('student_hip_'+side,(x,0,.78),body);knee=empty('student_knee_'+side,(x,0,.43),hip)
        capture(hip,lambda x=x:box('trouser_thigh',(.205,.22,.37),(x,0,.61),pants,.045))
        def shin(x=x):
            box('trouser_shin',(.18,.20,.32),(x,0,.28),pants,.035)
            box('shoe_sole',(.205,.31,.04),(x,-.045,.035),ivory,.025)
            box('shoe',(.195,.30,.12),(x,-.045,.10),shoes,.045)
        capture(knee,shin)
        shoulder=empty('student_shoulder_'+side,(s*.245,0,1.13),body)
        elbow=empty('student_elbow_'+side,(s*.31,0,.94),shoulder)
        capture(shoulder,lambda s=s:beam('upper_arm',(s*.245,0,1.13),(s*.31,0,.94),.095,.105,skin,.035))
        for opt in ['polo','apron','vest']:
            module('outfit',opt,'sleeve_'+side,shoulder,lambda opt=opt,s=s:beam('sleeve',(s*.245,0,1.13),(s*.28,0,1.03),.14,.15,shirt if opt=='polo' else white,.035))
        def forearm(s=s):
            beam('forearm',(s*.31,0,.94),(s*.35,-.01,.79),.09,.09,skin,.03)
            sphere('hand',(s*.35,-.01,.77),(.055,.05,.07),skin,12,8)
        capture(elbow,forearm)
    if preset:
        for o in [o for o in bpy.context.scene.objects if o.type=='EMPTY' and o.name.startswith('module__')]:
            parts=o.name.split('__');slot,opt=parts[1:3]
            if o.type=='EMPTY' and (preset.get(slot)!=opt if slot!='accessory' else opt not in preset.get('accessories',[])):
                for child in list(o.children_recursive):bpy.data.objects.remove(child,do_unlink=True)
                bpy.data.objects.remove(o,do_unlink=True)

chars=[]
for name,preset in [('modular-human',None),('student',{'hair':'wavy','outfit':'polo','accessories':['backpack']}),('professor',{'hair':'gray','outfit':'vest','accessories':['glasses']}),('merchant',{'hair':'braid','outfit':'apron','accessories':[]})]:
    human(preset)
    rec=export_asset(os.path.join(CHAR,name+'.glb'),False,os.path.join(SOURCE,'characters',name+'.blend'))
    rec.update({'id':name,'preset':preset,'jointContract':'student-animation-v1','heightMetres':1.81,'moduleNaming':'module__slot__option__part','front':'Blender -Y'})
    chars.append(rec);print('COOP HUMAN',name,rec['bytes'],flush=True)
with open(os.path.join(CHAR,'manifest.json'),'w',encoding='utf8') as f:json.dump({'version':1,'units':'metres','assets':chars,'slots':{'hair':['wavy','braid','gray'],'outfit':['polo','apron','vest'],'accessories':['backpack','glasses']},'rig':'student-animation-v1'},f,ensure_ascii=False,indent=2)
print('COOP BUILD COMPLETE',len(records),'props and',len(chars),'humanoids',flush=True)
