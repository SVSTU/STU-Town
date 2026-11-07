"""Editable, standalone GLB props for the approved canteen concept.
Run: blender --background --python tools/build_canteen_concept_assets.py
The runtime assembles canteen-v2; the original canteen pack is retained.
"""
import os, sys, math, json, random
import bpy
from mathutils import Vector
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import build_3d_assets as a

OUT=os.path.join(a.OUT,'canteen-v2');PREV=os.path.join(OUT,'previews')
os.makedirs(PREV,exist_ok=True)
wood=a.mat('Honey walnut',(.39,.18,.065),roughness=.5)
lightwood=a.mat('Amber oak',(.62,.34,.14),roughness=.55)
teal=a.mat('Deep teal enamel',(.025,.19,.17),roughness=.42)
cream=a.mat('Warm limestone',(.83,.75,.59),roughness=.75)
ivory=a.mat('Ivory porcelain',(.94,.89,.77),roughness=.3)
gold=a.mat('Brushed gold',(.76,.46,.10),metallic=.65,roughness=.32)
silver=a.mat('Cool silver',(.60,.74,.76),metallic=.7,roughness=.3)
dark=a.mat('Dark iron',(.035,.06,.055),metallic=.55)
purple=a.mat('Machine purple',(.24,.075,.36),metallic=.18)
green=a.mat('Leaf emerald',(.15,.35,.055),roughness=.8)
lime=a.mat('Leaf lime',(.32,.48,.09),roughness=.8)
skin=a.mat('Portrait skin',(.87,.54,.30))
hair=a.mat('Portrait hair',(.075,.035,.02))
red=a.mat('Drink red',(.67,.045,.025))
blue=a.mat('Bottle blue',(.08,.42,.64),roughness=.25)
breadmat=a.mat('Bread crust',(.76,.42,.12))
glass=a.mat('Display glass',(.64,.87,.89),roughness=.12)
glass.diffuse_color=(.64,.87,.89,.18)
glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.18
glass.surface_render_method='DITHERED'
def luminous(name,color,strength):
    m=a.mat(name,color,roughness=.3);shader=m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Emission Color'].default_value=(*color,1);shader.inputs['Emission Strength'].default_value=strength
    return m
amber=luminous('Warm lamp glass',(1,.64,.22),2)
cyan=luminous('Cyan portal',(.025,.65,.84),1.7)

def box(name,size,pos,mat,bevel=.03): return a.cube(name,size,pos,mat,bevel)
def ball(name,pos,scale,mat,sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=pos)
    obj=bpy.context.object;obj.name=name;obj.scale=scale;a.apply_mat(obj,mat);return obj
def cyl(name,r,depth,pos,mat,vertices=32):
    obj=a.cylinder(name,r,depth,pos[2],mat,vertices=vertices);obj.location.x=pos[0];obj.location.y=pos[1];return obj
def ring(name,r,thick,pos,mat,vertical=False):
    obj=a.torus(name,r,thick,pos[2],mat);obj.location.x=pos[0];obj.location.y=pos[1]
    if vertical:obj.rotation_euler[0]=math.pi/2
    return obj
def text(name,body,pos,size,mat):
    bpy.ops.object.text_add(location=pos,rotation=(math.pi/2,0,0))
    obj=bpy.context.object;obj.name=name;obj.data.body=body;obj.data.align_x='CENTER';obj.data.size=size;obj.data.extrude=.001
    obj.data.materials.append(mat);bpy.ops.object.convert(target='MESH');return obj
def leaf(pos,size,mat,angle=0):
    obj=ball('leaf',pos,(size,size*.40,size*.15),mat,1);obj.rotation_euler=(.2,angle,.4);return obj
def bun(pos,scale=1):
    ball('steamed_bun',pos,(.12*scale,.11*scale,.09*scale),ivory)
    for i in range(6):
        t=i*math.tau/6;x,y,z=pos
        a.tube('bun_pleat',[(x+math.cos(t)*.09*scale,y+math.sin(t)*.09*scale,z+.04*scale),(x,y,z+.10*scale)],.006*scale,cream)
def loaf(pos,scale=1):
    ball('bread_roll',pos,(.19*scale,.075*scale,.07*scale),breadmat)
    for x in (-.09,0,.09):a.tube('bread_cut',[(pos[0]+x,pos[1]-.04*scale,pos[2]+.06*scale),(pos[0]+x+.025*scale,pos[1]+.04*scale,pos[2]+.06*scale)],.008*scale,ivory)
def drink(pos,soda=False,scale=1):
    x,y,z=pos;r=.045*scale
    cyl('drink_bottle' if not soda else 'soda_can',r,.20*scale,(x,y,z+.1*scale),red if soda else blue,16)
    cyl('drink_label',r*1.02,.07*scale,(x,y,z+.10*scale),ivory,16)
    cyl('drink_cap',r*(1 if soda else .6),.025*scale,(x,y,z+.215*scale),silver,16)

def counter():
    box('counter_body',(4.70,1.12,.90),(0,0,.45),teal,.16)
    box('counter_foot_trim',(4.76,1.16,.10),(0,0,.09),gold,.04)
    for i in range(27):box('counter_vertical_seam',(.012,.015,.67),(-2.20+i*.17,-.566,.49),dark,.002)
    box('stone_worktop',(4.86,1.24,.11),(0,-.02,.97),ivory,.05)
    box('display_plinth',(3.6,.78,.08),(-.35,-.06,1.07),dark)
    for x in (-1.96,1.25):
        box('display_glass_side',(.018,.75,.55),(x,-.06,1.39),glass,.003)
        box('display_side_frame',(.025,.035,.55),(x,-.45,1.39),silver,.004)
    box('display_front_glass',(3.22,.018,.54),(-.35,-.45,1.39),glass,.003)
    box('display_glass_top',(3.25,.78,.018),(-.35,-.06,1.68),glass,.003)
    box('display_top_rail',(3.28,.025,.025),(-.35,-.45,1.69),silver,.004)
    for x in (-1.38,-.36,.66):box('display_food_tray',(.90,.58,.035),(x,-.06,1.13),silver,.025)
    for x in (-1.65,-1.16):
        for y in (-.22,.07):loaf((x,y,1.22))
    for x in (-.57,-.20):
        for y in (-.23,.07):bun((x,y,1.23))
    for i in range(4):drink((.36+i*.16,-.24,1.15),soda=i>1)
    for i in range(4):drink((.36+i*.16,.06,1.15),soda=i>1)
    box('cash_register_base',(.43,.32,.09),(1.88,-.1,1.09),dark)
    monitor=box('cash_register_screen',(.36,.055,.25),(1.88,-.08,1.35),dark);monitor.rotation_euler[0]=-.2
    box('cash_register_display',(.29,.018,.17),(1.88,-.12,1.36),cyan,.01)
    for i in range(5):cyl('plate_stack',.11,.018,(-2.16,.26,1.04+i*.018),ivory)

def canopy():
    for y in (-.55,.55):box('canopy_crossbeam',(5.1,.12,.12),(0,y,.43),wood)
    for i in range(31):
        x=-2.48+i*.165
        a.tube('curved_oak_slat',[(x,-.66,.02),(x,-.69,.24),(x,-.62,.39),(x,-.48,.49),(x,.60,.49)],.047,lightwood)
    for i,label in enumerate(('BANH MI','BANH BAO','NUOC NGOT','NUOC SUOI')):
        x=-1.67+i*1.10
        box('menu_frame',(.97,.11,.55),(x,-.68,-.38),gold,.07)
        box('menu_face',(.88,.04,.46),(x,-.75,-.38),ivory,.05)
        text('menu_label',label,(x,-.779,-.44),.115,teal)
        for dx in (-.2,.2):a.tube('menu_hanger',[(x+dx,-.6,.12),(x+dx,-.6,-.13)],.014,gold)

def arch(name,width,bottom,shoulder,height,depth,mat):
    profile=[(-width,bottom),(width,bottom),(width,shoulder)]
    profile += [(math.cos(t)*width,shoulder+math.sin(t)*height) for t in [j*math.pi/32 for j in range(1,33)]]
    vertices=[(x,y,z) for y in (-depth/2,depth/2) for x,z in profile];n=len(profile)
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);a.apply_mat(obj,mat)
    return obj
def laurel(cx,cy,cz,r,metal):
    for side in (-1,1):
        for i in range(9):
            angle=-1.40+i*.24
            x=cx+side*math.cos(angle)*r;z=cz+math.sin(angle)*r
            obj=ball('laurel_leaf',(x,cy,z),(.08,.024,.035),metal,1);obj.rotation_euler[1]=side*(angle+.7)

def honor(cool=False):
    trim=silver if cool else gold
    arch('honor_outer_arch',1.17,.47,1.95,.60,.18,wood)
    inner=arch('honor_inset',1.07,.57,1.94,.49,.025,teal);inner.location.y=-.108
    border=[(-1.11,-.135,.54),(1.11,-.135,.54),(1.11,-.135,1.95)]
    border += [(math.cos(t)*1.11,-.135,1.95+math.sin(t)*.54) for t in [j*math.pi/32 for j in range(1,33)]]
    border.append(border[0]);a.tube('honor_metal_outline',border,.018,trim)
    for x in (-1.02,1.02):
        box('honor_support',(.14,.20,.57),(x,.05,.285),wood)
        box('honor_foot',(.35,.60,.12),(x,0,.06),wood)
        for z in (.61,1.93):ball('honor_frame_stud',(x,-.125,z),(.045,.025,.045),trim)
    text('honor_title','TIEN DONG' if cool else 'DANH TIENG',(0,-.16,2.04),.19,trim)
    laurel(0,-.15,2.39,.10,trim)
    for rank,(x,z) in enumerate(((0,1.62),(-.65,1.18),(.65,1.18)),1):
        ring('portrait_frame',.24,.025,(x,-.15,z),trim,True)
        ball('portrait_back',(x,-.14,z),(.22,.025,.22),wood)
        ball('portrait_head',(x,-.205,z+.035),(.10,.055,.12),skin)
        ball('portrait_hair',(x,-.205,z+.12),(.105,.059,.055),hair)
        ball('portrait_shirt',(x,-.19,z-.11),(.135,.035,.065),cream)
        for dx in (-.035,.035):ball('portrait_eye',(x+dx,-.260,z+.055),(.009,.009,.014),dark,1)
        box('nameplate',(.56,.045,.14),(x,-.15,z-.34),trim,.025)
        text('rank_text',f'TOP {rank}',(x,-.177,z-.37),.085,teal)
        anchor=bpy.data.objects.new('portrait_slot_'+str(rank),None);bpy.context.collection.objects.link(anchor);anchor.location=(x,-.18,z)

def table():
    for y in (-.35,.35):
        for x in (-.60,.60):box('table_leg',(.09,.10,.73),(x,y,.365),teal)
    for y in (-.18,0,.18):box('table_top_plank',(1.65,.17,.07),(0,y,.80),lightwood,.02)
    for y in (-.69,.69):
        box('bench_seat',(1.70,.28,.075),(0,y,.46),lightwood)
        for x in (-.60,.60):box('bench_leg',(.08,.09,.42),(x,y,.21),teal)
    cloth=a.mat('Sage table runner',(.35,.46,.27),roughness=.9)
    box('cloth_runner',(.27,.57,.012),(.26,0,.842),cloth,.005)
    for y in (-.29,.29):box('runner_drop',(.27,.012,.20),(.26,y,.744),cloth,.005)
    plant((-.37,0,.85),.22,flowers=True)

def machine():
    box('ticket_machine',(.79,.61,1.56),(0,0,.82),purple,.10)
    box('ticket_base',(.84,.68,.10),(0,0,.05),dark)
    box('ticket_trim',(.69,.025,1.37),(0,-.314,.86),gold,.08)
    box('ticket_front',(.64,.035,1.30),(0,-.338,.86),purple,.07)
    box('ticket_screen_frame',(.49,.06,.59),(0,-.37,1.10),dark,.04)
    box('ticket_screen',(.39,.015,.48),(0,-.408,1.10),cyan,.025)
    text('ticket_glyph','TICKET',(0,-.423,1.08),.075,ivory)
    box('ticket_output',(.37,.03,.075),(0,-.37,.60),dark)
    ring('gold_coin_slot',.085,.017,(0,-.38,.37),gold,True)
    text('machine_title','STU PASS',(0,-.37,1.48),.09,ivory)

def portal():
    cyl('portal_plinth',.82,.16,(0,0,.08),teal)
    ring('portal_base_trim',.73,.03,(0,0,.17),gold)
    ring('portal_main_frame',.62,.095,(0,0,.88),teal,True)
    ring('portal_inner_trim',.54,.025,(0,-.07,.88),gold,True)
    ring('portal_energy',.49,.026,(0,-.09,.88),cyan,True)
    for side in (-1,1):box('portal_support',(.18,.26,.62),(side*.52,.02,.40),gold)
    for i in range(3):
        a.tube('vortex_spiral',[(math.cos(t*math.tau*1.25+i*math.tau/3)*.45*t,-.08,.88+math.sin(t*math.tau*1.25+i*math.tau/3)*.45*t) for t in [j/50 for j in range(51)]],.014,cyan)
    jewel=ball('portal_crown',(0,0,1.59),(.085,.06,.12),cyan,1)

def plant(pos=(0,0,0),scale=1,flowers=False,hanging=False):
    before=set(bpy.context.scene.objects);rng=random.Random(23)
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.19,radius2=.25,depth=.36,location=(0,0,.18))
    bpy.context.object.name='ceramic_pot';a.apply_mat(bpy.context.object,cream)
    ring('pot_lip',.245,.025,(0,0,.36),ivory)
    cyl('pot_soil',.22,.015,(0,0,.35),wood)
    for i in range(18 if not hanging else 30):
        t=i*2.39996;r=.12+rng.random()*.25;z=.38+rng.random()*(.50 if not hanging else .18)
        if hanging and i>9:z=-.05-(i-10)*.035
        x,y=math.cos(t)*r,math.sin(t)*r
        a.tube('plant_stem',[(0,0,.35),(x*.6,y*.6,z+.05),(x,y,z)],.009,green)
        leaf((x,y,z),.18 if not hanging else .09,green if i%2 else lime,t)
    if flowers:
        for i in range(8):
            t=i*2.4;x,y=math.cos(t)*.18,math.sin(t)*.18
            ball('flower_center',(x,y,.65),(.025,.025,.02),gold,1)
            for j in range(5):
                u=j*math.tau/5;ball('flower_petal',(x+math.cos(u)*.038,y+math.sin(u)*.038,.65),(.03,.02,.015),ivory,1)
    if hanging:
        for t in (0,math.tau/3,math.tau*2/3):a.tube('basket_cord',[(math.cos(t)*.23,math.sin(t)*.23,.30),(0,0,.96)],.008,gold)
        ring('basket_hook',.04,.009,(0,0,1),gold,True)
    for obj in set(bpy.context.scene.objects)-before:obj.location=Vector(pos)+obj.location*scale;obj.scale*=scale

def pendant():
    cyl('lamp_ceiling_mount',.09,.06,(0,0,1.0),gold)
    cyl('lamp_cable',.012,.65,(0,0,.65),dark)
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.31,radius2=.08,depth=.20,location=(0,0,.27))
    bpy.context.object.name='pendant_shade';a.apply_mat(bpy.context.object,teal)
    cyl('pendant_warm_diffuser',.26,.02,(0,0,.165),amber)
    ring('shade_rim',.30,.018,(0,0,.17),gold)

def recycling():
    box('bin_cabinet',(1.10,.51,.85),(0,0,.425),wood)
    for i,x in enumerate((-.27,.27)):
        box('bin_door',(.46,.035,.69),(x,-.276,.40),teal if i==0 else dark)
        box('bin_opening',(.37,.20,.04),(x,-.05,.87),dark)
        text('bin_label','RECYCLE' if i==0 else 'WASTE',(x,-.30,.45),.075,ivory)
    box('bin_top',(1.18,.56,.08),(0,0,.89),lightwood)

def wall():
    box('wall_lower',(4,.24,1.45),(0,0,.725),cream)
    box('wall_upper',(4,.24,.28),(0,0,2.86),cream)
    for x in (-1.9,1.9):box('wall_pillar',(.20,.31,3),(x,0,1.5),ivory)
    for z in (1.48,2.70):box('window_horizontal',(3.65,.25,.09),(0,0,z),wood)
    for x in (-1.77,-.60,.60,1.77):box('window_vertical',(.055,.24,1.22),(x,0,2.09),wood)
    box('window_glass',(3.52,.018,1.12),(0,.05,2.09),glass,.001)
    box('teal_roof_beam',(4.1,.36,.16),(0,0,3.07),teal)

def floor():
    tilemats=[a.mat('Tile '+str(i),c,roughness=.75) for i,c in enumerate(((.70,.49,.33),(.80,.62,.43),(.89,.75,.56),(.76,.56,.39)))]
    box('floor_base',(4,4,.10),(0,0,-.06),cream)
    for x in range(8):
        for y in range(8):box('floor_tile',(.492,.492,.045),(-1.75+x*.5,-1.75+y*.5,.005),tilemats[(x*3+y*5)%4],.008)
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=bpy.context.scene.objects[0]
    bpy.ops.object.join();bpy.context.object.name='floor_module_batched'

def steps():
    for i in range(3):box('entry_step',(2,1.05-i*.32,.12*(i+1)),(0,i*.16,.06*(i+1)),cream,.025)

BUILDERS=[('food-counter',counter),('canopy-menu',canopy),('honor-gold',honor),('honor-silver',lambda:honor(True)),('picnic-table',table),('ticket-machine',machine),('exit-portal',portal),('potted-plant',lambda:plant()),('hanging-plant',lambda:plant(hanging=True)),('pendant-light',pendant),('recycling-station',recycling),('wall-window',wall),('floor-module',floor),('entry-steps',steps)]
manifest=[]
selected=set(next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--only=')), '').split(','))-{''}
for name,build in BUILDERS:
    if selected and name not in selected:continue
    build();bpy.context.view_layer.update()
    # Static pieces share one mesh with material primitives. Keep named parts
    # on the animated portal, live honor boards and machine for runtime hooks.
    if name not in ('honor-gold','honor-silver','exit-portal','ticket-machine','floor-module'):
        bpy.ops.object.select_all(action='SELECT')
        bpy.context.view_layer.objects.active=bpy.context.scene.objects[0]
        bpy.ops.object.join();bpy.context.object.name=name.replace('-','_')+'_batched'
    meshes=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
    points=[obj.matrix_world@Vector(corner) for obj in meshes for corner in obj.bound_box]
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    # Apply scales before GLB export; origins and named attachment slots are retained.
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    path=os.path.join(OUT,name+'.glb');a.export_selected(path)
    manifest.append({'name':name,'file':name+'.glb','bytes':os.path.getsize(path),'boundsBlender':{'min':lo,'max':hi}})
generated=manifest
manifest_path=os.path.join(OUT,'manifest.json')
if selected and os.path.exists(manifest_path):
    with open(manifest_path,encoding='utf8') as handle:old=json.load(handle)['assets']
    updates={asset['name']:asset for asset in generated}
    manifest=[updates.get(asset['name'],asset) for asset in old]
with open(manifest_path,'w',encoding='utf8') as handle:json.dump({'status':'asset-pack','units':'metres','front':'Blender -Y / glTF +Z','assets':manifest},handle,indent=2)
if '--no-preview' in sys.argv:sys.exit(0)

def studio(scene,size,center):
    scene.world=bpy.data.worlds.new('Warm studio');scene.world.color=(.45,.45,.45)
    bpy.ops.object.light_add(type='AREA',location=center+Vector((2,-3,5))*size)
    light=bpy.context.object;light.data.energy=500*size*size;light.data.size=size*3
    bpy.ops.object.camera_add(location=center+Vector((1.25,-2,1.15))*size)
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=size*1.65;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=20
    scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    return camera

for asset in generated:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,asset['file']))
    bpy.context.view_layer.update()
    points=[obj.matrix_world@Vector(c) for obj in bpy.context.scene.objects if obj.type=='MESH' for c in obj.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    scene=bpy.context.scene;studio(scene,max(hi-lo),(lo+hi)/2)
    scene.render.filepath=os.path.join(PREV,asset['name']+'.png');bpy.ops.render.render(write_still=True)
    print('PREVIEW COMPLETE:',asset['name'],flush=True)
print('CANTEEN V2 COMPLETE:',len(manifest),'GLBs',flush=True)
